import type { CommentDTO, PostDTO } from '@/api/types'
import type { Comment, Db, Post } from '@/types/models'
import { anonAvatarIndex, anonName } from '@/utils/anon'

/**
 * ⚠️ 全项目唯一允许读取 authorId 的地方。
 *
 * 匿名性是「序列化层」的属性，不是「存储层」的属性：数据库必须保留作者外键
 * （否则个人主页无从查起），但对外输出的 DTO 里压根没有这个字段可以泄漏。
 * 于是这个保证是**结构性**的，不依赖任何人记得「别在模板里渲染 authorId」。
 *
 * 同理，所有返回值都 Object.freeze —— 组件误改 DTO 时会当场抛错，
 * 而不是悄悄污染数据直到下次刷新才发作。
 */

/**
 * 假名的 scope 用 postId。
 * 于是同一个人在同一条帖子内（帖子本身 + 他发的评论）假名一致，
 * 跨帖子则不同 —— 后者是刻意设计，见 src/utils/anon.ts 的说明。
 */
function scopeOf(postId: string): string {
  return postId
}

function countComments(db: Db, postId: string): number {
  let n = 0
  for (const c of db.comments) {
    if (c.postId === postId) n += 1
  }
  return n
}

export function toPostDTO(post: Post, db: Db, viewerId: string | null): PostDTO {
  return Object.freeze({
    id: post.id,
    title: post.title,
    content: post.content,
    anonName: anonName(post.authorId, scopeOf(post.id)),
    avatarIndex: anonAvatarIndex(post.authorId, scopeOf(post.id)),
    createdAt: post.createdAt,
    likeCount: post.likedBy.length,
    commentCount: countComments(db, post.id),
    likedByMe: viewerId !== null && post.likedBy.includes(viewerId),
    isMine: viewerId !== null && post.authorId === viewerId,
    // 复制一份再冻结：组件既改不了这个数组，也够不着库里那一份。
    // 只传 id、不传图片本体 —— 二进制在 IndexedDB，由展示层按需去取。
    imageIds: Object.freeze([...post.imageIds]),
  })
}

export function toCommentDTO(comment: Comment, viewerId: string | null): CommentDTO {
  return Object.freeze({
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    anonName: anonName(comment.authorId, scopeOf(comment.postId)),
    avatarIndex: anonAvatarIndex(comment.authorId, scopeOf(comment.postId)),
    createdAt: comment.createdAt,
    isMine: viewerId !== null && comment.authorId === viewerId,
    imageIds: Object.freeze([...comment.imageIds]),
  })
}
