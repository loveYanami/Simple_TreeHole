import { nextId } from '@/mock/id'
import { getDb, saveDb } from '@/mock/db'
import { ApiError, simulate } from '@/mock/delay'
import { deleteImages } from '@/mock/imageStore'
import { toPostDTO } from '@/mock/mappers'
import { currentViewerId, requireViewer } from './context'
import type { LikeResult, ListPostsParams, Page, PageParams, PostDTO, PostInput } from './types'

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

export async function listPosts(params: ListPostsParams = {}): Promise<Page<PostDTO>> {
  return simulate(() => {
    const db = getDb()
    const viewerId = currentViewerId()
    const { page, pageSize } = normalizePage(params)
    const keyword = (params.keyword ?? '').trim().toLowerCase()

    const matched =
      keyword === ''
        ? db.posts
        : db.posts.filter(
            (p) =>
              p.title.toLowerCase().includes(keyword) || p.content.toLowerCase().includes(keyword),
          )

    const dtos = matched.map((p) => toPostDTO(p, db, viewerId))

    if (params.sort === 'hot') {
      // 「热门」= 点赞权重 2、评论权重 1。够简单、够可解释，且 tab 切换有可见效果。
      dtos.sort((a, b) => b.likeCount * 2 + b.commentCount - (a.likeCount * 2 + a.commentCount))
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

    const post = {
      id: nextId('p'),
      authorId: viewerId,
      title,
      content,
      createdAt: new Date().toISOString(),
      likedBy: [],
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

/**
 * 点赞 / 取消点赞。
 *
 * 去重由数据模型天然保证：likedBy 是用户 id 列表，成员资格即点赞记录，
 * 所以 likeCount 永远等于 likedBy.length，不可能和点赞记录对不上。
 * 真正的风险在客户端连点 —— 由 LikeButton 的 pending 状态挡住。
 */
export async function toggleLike(postId: string): Promise<LikeResult> {
  return simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()

    const post = db.posts.find((p) => p.id === postId)
    if (!post) throw new ApiError('这条帖子不存在或已被删除', 'POST_NOT_FOUND')

    const index = post.likedBy.indexOf(viewerId)
    if (index >= 0) post.likedBy.splice(index, 1)
    else post.likedBy.push(viewerId)
    saveDb()

    return { liked: index < 0, likeCount: post.likedBy.length }
  })
}
