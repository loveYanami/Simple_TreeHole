import { compressImage } from '@/utils/image'
import { nextId } from './id'

/**
 * 图片仓库 —— 二进制存在 IndexedDB 里，和 localStorage 里的主数据库分开。
 *
 * **为什么不跟帖子一起塞进 localStorage**，三条理由，第一条是硬伤：
 *
 * 1. **绝不能共用一条写入路径。** localStorage 整站只有约 5MB，而我们的整个
 *    数据库是存在单个 key 下的原子写入。图片体积不可控，一旦把它撑爆，
 *    `saveDb()` 会抛 `QuotaExceededError` —— 用户的帖子、评论、点赞会**一起**
 *    存不进去。让图片有机会连累主库，是这个设计里最不能接受的事。
 * 2. **localStorage 只能存字符串。** 图片转 base64 会平白多出 33% 的体积。
 *    IndexedDB 能直接存 Blob，二进制原样落库。
 * 3. **配额差两个数量级。** localStorage 约 5MB；IndexedDB 通常能拿到磁盘剩余
 *    空间的很大一部分，几百 MB 起步。
 *
 * 代价是 IndexedDB 全是异步 API —— 这就是本文件所有函数都返回 Promise 的原因。
 * 好在影响是局部的：登录态那条同步水合的路径完全不受牵连。
 */

const DB_NAME = 'treehole:images'
const STORE = 'blobs'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        // 用外部键（put 的第二个参数），所以不需要 keyPath
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开图片库'))
  }).catch((error: unknown) => {
    // 失败的 promise 不能留着 —— 否则这一次打不开，整个会话都再也恢复不了
    dbPromise = null
    throw error
  })

  return dbPromise
}

/**
 * 跑一个事务。
 *
 * IndexedDB 的事务是**原子**的：要么整批写入生效，要么整批不生效，
 * 不存在「写进去一半」。这正是我们要的语义 —— 所以 saveImages 里
 * 四张图是一次 putImages 写完的，不会出现「存了两张就断了」。
 */
function withStore(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => void,
): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('图片库操作失败'))
        tx.onabort = () => reject(tx.error ?? new Error('图片库操作被中止'))
        action(tx.objectStore(STORE))
      }),
  )
}

export function putImages(entries: ReadonlyArray<readonly [string, Blob]>): Promise<void> {
  return withStore('readwrite', (store) => {
    for (const [id, blob] of entries) store.put(blob, id)
  })
}

export function deleteImages(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve()
  return withStore('readwrite', (store) => {
    for (const id of ids) store.delete(id)
  })
}

export function clearImages(): Promise<void> {
  return withStore('readwrite', (store) => store.clear())
}

/**
 * 读取单张图片。
 *
 * 找不到时返回 `undefined` 而不是抛错 —— 图片丢失（比如用户清过浏览器数据）
 * 不该让整个页面炸掉，展示层会退化成一句提示。
 */
export function getImage(id: string): Promise<Blob | undefined> {
  return openDb().then(
    (db) =>
      new Promise<Blob | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const request = tx.objectStore(STORE).get(id)
        request.onsuccess = () => resolve(request.result as Blob | undefined)
        request.onerror = () => reject(request.error ?? new Error('读取图片失败'))
      }),
  )
}

function prepare(files: readonly File[]): Promise<Array<readonly [string, Blob]>> {
  return Promise.all(
    files.map(async (file) => [nextId('img'), (await compressImage(file)).blob] as const),
  )
}

/**
 * 压缩 + 落库，返回可以写进 Post / Comment 的 id 列表。
 *
 * ⚠️ 调用方必须处理「图存了、但帖子没建成」的情况 —— 那时要调用
 * `discardImages(ids)` 把图删掉，否则它们会变成永远没人引用的垃圾，
 * 而且用户看不见、也清不掉。
 */
export async function saveImages(files: readonly File[]): Promise<string[]> {
  if (files.length === 0) return []

  const prepared = await prepare(files)
  await putImages(prepared)
  return prepared.map(([id]) => id)
}

/** 建帖 / 发评论失败后的回滚：把已经写进去的图删掉。 */
export function discardImages(ids: readonly string[]): Promise<void> {
  return deleteImages(ids)
}
