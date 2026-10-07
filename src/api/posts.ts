import { nextId } from '@/mock/id'
import { getDb, saveDb } from '@/mock/db'
import { ApiError, simulate } from '@/mock/delay'
import { deleteImages } from '@/mock/imageStore'
import { toPostDTO } from '@/mock/mappers'
import { currentViewerId, requireViewer } from './context'
import type { Post } from '@/types/models'
import type { ListPostsParams, Page, PageParams, PostDTO, PostInput, ReactionResult } from './types'

/** 分页参数规整 + 切片，三个列表接口共用。 */
function paginate<T>(rows: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize
  return {
    items: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
  }
}

function normalizePage(params: PageParams): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.floor(params.page ?? 1)),
    pageSize: Math.max(1, Math.floor(params.pageSize ?? 10)),
  }
}

/**
 * 关键词解析。
 *
 * 编号和正文是**并列**的匹配条件，不是二选一：输入「7」既会命中 7 号帖子，
 * 也会命中正文里写着「7」的帖子。这样最不容易让人意外 —— 想搜哪种，结果都在；
 * 而且每条结果都带着编号，一眼就能认出哪条才是编号命中的那条。
 */
function parseKeyword(raw: string | undefined): { keyword: string; asNumber: number | null } {
  const keyword = (raw ?? '').trim().toLowerCase()
  // 允许「#7」这种写法。只剥开头的那个 #，正文里的 # 不碰。
  const digits = keyword.startsWith('#') ? keyword.slice(1) : keyword
  // 用 /^\d+$/ 而不是 Number()：Number('') 是 0、Number(' ') 也是 0，
  // 会把「空搜索」误判成「搜 0 号帖」。
  return { keyword, asNumber: /^\d+$/.test(digits) ? Number(digits) : null }
}

/** 「热门」排序的分数。抽出来是为了让「踩会减分」这件事在代码里看得见。 */
function hotScore(post: PostDTO): number {
  // 点赞权重 2、评论权重 1、点踩权重 -1。够简单、够可解释，且 tab 切换有可见效果。
  // 踩是真的会减分 —— 否则它就是个纯装饰的按钮。
  return post.likeCount * 2 + post.commentCount - post.dislikeCount
}

export async function listPosts(params: ListPostsParams = {}): Promise<Page<PostDTO>> {
  return simulate(() => {
    const db = getDb()
    const viewerId = currentViewerId()
    const { page, pageSize } = normalizePage(params)
    const { keyword, asNumber } = parseKeyword(params.keyword)

    const matched =
      keyword === ''
        ? db.posts
        : db.posts.filter(
            (p) =>
              p.title.toLowerCase().includes(keyword) ||
              p.content.toLowerCase().includes(keyword) ||
              (asNumber !== null && p.no === asNumber),
          )

    const dtos = matched.map((p) => toPostDTO(p, db, viewerId))

    if (params.sort === 'hot') {
      dtos.sort((a, b) => hotScore(b) - hotScore(a))
    } else {
      dtos.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }

    return paginate(dtos, page, pageSize)
  })
}

export async function getPost(id: string): Promise<PostDTO> {
  return simulate(() => {
    const db = getDb()
    const post = db.posts.find((p) => p.id === id)
    if (!post) throw new ApiError('这条帖子不存在或已被删除', 'POST_NOT_FOUND')
    return toPostDTO(post, db, currentViewerId())
  })
}

export async function createPost(input: PostInput): Promise<PostDTO> {
  return simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()

    const title = input.title.trim()
    const content = input.content.trim()
    const imageIds = [...(input.imageIds ?? [])]

    if (title === '') throw new ApiError('标题不能为空', 'EMPTY_TITLE')
    // 允许「只发图不写字」—— 树洞本来就有很多话说不出口的时候
    if (content === '' && imageIds.length === 0) {
      throw new ApiError('正文和配图不能都是空的', 'EMPTY_CONTENT')
    }

    // 编号只由序列发号，保证「永不复用」—— 删掉 #13 之后新帖拿的是 #14，
    // 不是把 #13 捡回来。
    //
    // 再和「现有最大编号 + 1」取一次 max，是道保险：万一序列落后于数据
    // （旧版本残留、手改过 localStorage），它会自愈，绝不会发出重复编号。
    // 两个值正常情况下相等，取 max 不会让编号无故跳号。
    const maxUsed = db.posts.reduce((max, p) => Math.max(max, p.no), 0)
    const nextNo = Math.max(db.nextPostNo, maxUsed + 1)
    db.nextPostNo = nextNo + 1

    const post = {
      id: nextId('p'),
      no: nextNo,
      authorId: viewerId,
      title,
      content,
      createdAt: new Date().toISOString(),
      likedBy: [],
      dislikedBy: [],
      imageIds,
    }
    db.posts.push(post)
    saveDb()

    return toPostDTO(post, db, viewerId)
  })
}

export async function deletePost(id: string): Promise<void> {
  // 顺带把要回收的图片 id 带出来：主库删完了，IndexedDB 里那几块二进制
  // 还得有人收尸 —— 否则它们会一直占着配额，用户却看不见也删不掉。
  const orphanedImages = await simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()

    const index = db.posts.findIndex((p) => p.id === id)
    const post = db.posts[index]
    if (!post) throw new ApiError('这条帖子不存在或已被删除', 'POST_NOT_FOUND')
    if (post.authorId !== viewerId) throw new ApiError('只能删除自己发布的帖子', 'FORBIDDEN')

    const doomedComments = db.comments.filter((c) => c.postId === id)

    db.posts.splice(index, 1)
    // 级联删除评论。漏掉这步会留下孤儿评论，还会让别处的评论计数偏大。
    db.comments = db.comments.filter((c) => c.postId !== id)
    saveDb()

    return [...post.imageIds, ...doomedComments.flatMap((c) => c.imageIds)]
  })

  // 清图片是「尽力而为」：它失败不该让删帖本身失败。
  // 最坏的结果只是库里多几块没人引用的二进制，不影响任何功能的正确性。
  await deleteImages(orphanedImages).catch(() => {})
}

export async function listMyPosts(params: PageParams = {}): Promise<Page<PostDTO>> {
  return simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()
    const { page, pageSize } = normalizePage(params)

    const dtos = db.posts
      .filter((p) => p.authorId === viewerId)
      .map((p) => toPostDTO(p, db, viewerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return paginate(dtos, page, pageSize)
  })
}

export async function listMyLikedPosts(params: PageParams = {}): Promise<Page<PostDTO>> {
  return simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()
    const { page, pageSize } = normalizePage(params)

    const dtos = db.posts
      .filter((p) => p.likedBy.includes(viewerId))
      .map((p) => toPostDTO(p, db, viewerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return paginate(dtos, page, pageSize)
  })
}

function reactionOf(post: Post, viewerId: string): ReactionResult {
  // 读的是**改完之后**的状态，所以调用方拿到的是这条帖子现在真实的样子，
  // 而不是「我刚才点了什么」。
  return {
    liked: post.likedBy.includes(viewerId),
    likeCount: post.likedBy.length,
    disliked: post.dislikedBy.includes(viewerId),
    dislikeCount: post.dislikedBy.length,
  }
}

/**
 * 赞和踩的公共实现。两者是**镜像**的，差别只有「哪一边是自己、哪一边是对方」，
 * 所以在这里写成一份 —— 两份几乎一样的代码最容易只修好其中一份。
 *
 * **赞和踩互斥**：点其中一个会自动取消另一个。这和大多数平台（包括 B 站）一致，
 * 也避免出现「同一个人既赞又踩」这种数据上说得通、界面上看着像 bug 的状态。
 */
function applyReaction(postId: string, kind: 'like' | 'dislike'): ReactionResult {
  const viewerId = requireViewer()
  const db = getDb()

  const post = db.posts.find((p) => p.id === postId)
  if (!post) throw new ApiError('这条帖子不存在或已被删除', 'POST_NOT_FOUND')

  const own = kind === 'like' ? post.likedBy : post.dislikedBy
  const other = kind === 'like' ? post.dislikedBy : post.likedBy

  const index = own.indexOf(viewerId)
  if (index >= 0) {
    own.splice(index, 1) // 再点一次 = 取消
  } else {
    own.push(viewerId)
    const otherIndex = other.indexOf(viewerId)
    if (otherIndex >= 0) other.splice(otherIndex, 1) // 互斥：顺手撤掉另一边
  }

  saveDb()
  return reactionOf(post, viewerId)
}

/**
 * 点赞 / 取消点赞。
 *
 * 去重由数据模型天然保证：likedBy 是用户 id 列表，成员资格即点赞记录，
 * 所以 likeCount 永远等于 likedBy.length，不可能和点赞记录对不上。
 * 真正的风险在客户端连点 —— 由 ReactionBar 的 pending 状态挡住。
 */
export async function toggleLike(postId: string): Promise<ReactionResult> {
  return simulate(() => applyReaction(postId, 'like'))
}

/** 点踩 / 取消点踩。同上，且会撤掉自己的赞。 */
export async function toggleDislike(postId: string): Promise<ReactionResult> {
  return simulate(() => applyReaction(postId, 'dislike'))
}
