import { nextId } from '@/mock/id'
import { getDb, saveDb } from '@/mock/db'
import { ApiError, simulate } from '@/mock/delay'
import { deleteImages } from '@/mock/imageStore'
import { toCommentDTO } from '@/mock/mappers'
import { currentViewerId, requireViewer } from './context'
import type { CommentDTO, CommentInput } from './types'

/** 评论列表。时间正序（先发的在上），这样读起来像一段对话。 */
export async function listComments(postId: string): Promise<CommentDTO[]> {
  return simulate(() => {
    const db = getDb()
    const viewerId = currentViewerId()

    return db.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => toCommentDTO(c, viewerId))
  })
}

export async function createComment(input: CommentInput): Promise<CommentDTO> {
  return simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()

    const content = input.content.trim()
    const imageIds = [...(input.imageIds ?? [])]

    // 和发帖一致：只发图不写字也算一条有效回复
    if (content === '' && imageIds.length === 0) {
      throw new ApiError('评论内容和配图不能都是空的', 'EMPTY_CONTENT')
    }
    if (!db.posts.some((p) => p.id === input.postId)) {
      throw new ApiError('这条帖子不存在或已被删除', 'POST_NOT_FOUND')
    }

    const comment = {
      id: nextId('c'),
      postId: input.postId,
      authorId: viewerId,
      content,
      createdAt: new Date().toISOString(),
      imageIds,
    }
    db.comments.push(comment)
    saveDb()

    return toCommentDTO(comment, viewerId)
  })
}

export async function deleteComment(id: string): Promise<void> {
  // 同 deletePost：把图片 id 带出来，删完主库再去回收二进制
  const orphanedImages = await simulate(() => {
    const viewerId = requireViewer()
    const db = getDb()

    const index = db.comments.findIndex((c) => c.id === id)
    const comment = db.comments[index]
    if (!comment) throw new ApiError('这条评论不存在或已被删除', 'COMMENT_NOT_FOUND')
    if (comment.authorId !== viewerId) throw new ApiError('只能删除自己的评论', 'FORBIDDEN')

    db.comments.splice(index, 1)
    saveDb()

    return comment.imageIds
  })

  await deleteImages(orphanedImages).catch(() => {})
}
