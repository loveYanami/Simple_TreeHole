import type { Db } from '@/types/models'
import { DB_KEY, SCHEMA_VERSION } from './constants'
import { buildSeed } from './seed'

/**
 * mock 数据库。整个库存在单个 localStorage key 下，而不是按实体分成多个 key。
 *
 * 单 key 的收益是实打实的：启动一次读、每次改动一次写、重置只要清一个 key。
 * 而按实体分 key 意味着四次需要协调的写入，以及一整类「几个 key 之间不同步」的 bug。
 * 代价是每次改动都重新序列化整库 —— 在这个量级（几百条记录、几十 KB）完全无所谓。
 *
 * 这是全项目唯一碰 DB_KEY 的模块。api 层只通过 getDb / saveDb 与它交互。
 */

let cache: Db | null = null

/** 结构校验。版本不匹配一律视为不可用，走重新播种。 */
function isUsableDb(value: unknown): value is Db {
  if (typeof value !== 'object' || value === null) return false
  const db = value as Partial<Db>
  return (
    db.version === SCHEMA_VERSION &&
    Array.isArray(db.users) &&
    Array.isArray(db.posts) &&
    Array.isArray(db.comments)
  )
}

/** 读取整库。首次访问、数据损坏或结构过期时自动播种。 */
export function getDb(): Db {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw)
      if (isUsableDb(parsed)) {
        cache = parsed
        return cache
      }
      console.warn('[treehole] 本地数据结构已过期或不完整，已重新生成种子数据')
    }
  } catch (error) {
    console.warn('[treehole] 读取本地数据失败，已重新生成种子数据', error)
  }

  cache = buildSeed()
  saveDb()
  return cache
}

/** 写回整库。所有改动都要经过这里，否则刷新即丢失。 */
export function saveDb(): void {
  if (!cache) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch (error) {
    // 最常见的原因是 localStorage 写满（无痕模式配额更小）
    console.warn('[treehole] 写入本地数据失败', error)
  }
}

/** 清空并重新播种，回到初始状态。既是「重置数据」按钮的实现，也是结构漂移的逃生舱。 */
export function resetDb(): Db {
  cache = buildSeed()
  saveDb()
  return cache
}

/** 仅供调试：丢弃内存缓存，强制下次 getDb() 重新读盘。 */
export function dropDbCache(): void {
  cache = null
}
