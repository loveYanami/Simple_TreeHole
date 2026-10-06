import type { PostDTO } from '@/api'

/**
 * 用点赞结果替换列表里的那一条。
 *
 * 必须整条替换而不能原地改 —— 因为 mapper 对 DTO 做了 Object.freeze，
 * 原地赋值在严格模式下会直接抛错。这个「别扭」是刻意的：它把
 * 「组件误改数据」从一类静默 bug 变成了一个当场就炸的错误。
 */
export function withLikeResult(
  posts: PostDTO[],
  postId: string,
  payload: { liked: boolean; count: number },
): PostDTO[] {
  return posts.map((post) =>
    post.id === postId ? { ...post, likedByMe: payload.liked, likeCount: payload.count } : post,
  )
}

/** 从列表里移除一条（删帖后用）。 */
export function withoutPost(posts: PostDTO[], postId: string): PostDTO[] {
  return posts.filter((post) => post.id !== postId)
}
