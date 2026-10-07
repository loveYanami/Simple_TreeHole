import type { PostDTO, ReactionResult } from '@/api'

/**
 * 从列表项冒泡到页面的表态更新：表态结果 + 是哪一条。
 *
 * 列表本身知道自己在渲染哪条帖子，按钮不知道 —— 所以 postId 由列表补上，
 * 而不是让 ReactionBar 把它塞进 payload 里再传回来。
 */
export type ReactionUpdate = ReactionResult & { postId: string }

/**
 * 用赞/踩结果替换列表里的那一条。
 *
 * 必须整条替换而不能原地改 —— 因为 mapper 对 DTO 做了 Object.freeze，
 * 原地赋值在严格模式下会直接抛错。这个「别扭」是刻意的：它把
 * 「组件误改数据」从一类静默 bug 变成了一个当场就炸的错误。
 *
 * 四个字段一起写，是因为赞和踩互斥：一次点击可能同时改变两个按钮的状态，
 * 只更新一半会让界面和库里对不上。
 */
export function withReactionResult(
  posts: PostDTO[],
  postId: string,
  payload: ReactionResult,
): PostDTO[] {
  return posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          likedByMe: payload.liked,
          likeCount: payload.likeCount,
          dislikedByMe: payload.disliked,
          dislikeCount: payload.dislikeCount,
        }
      : post,
  )
}

/** 从列表里移除一条（删帖后用）。 */
export function withoutPost(posts: PostDTO[], postId: string): PostDTO[] {
  return posts.filter((post) => post.id !== postId)
}
