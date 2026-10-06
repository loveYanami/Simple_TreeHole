/**
 * API 层的传输契约（DTO）。组件只认识这里定义的类型。
 *
 * 内部实体（src/types/models.ts）与这里的 DTO 是刻意分开的两套类型：
 * 分开之后，「哪些字段允许离开数据层」变成了一件看得见的事。
 */

export interface UserDTO {
  id: string
  username: string
  createdAt: string
}

/**
 * 帖子的公开形态。
 *
 * ⚠️ 这里**没有** authorId，也没有任何指向作者的引用 —— 这是匿名性的结构性保证：
 * 组件根本拿不到「作者是谁」，只拿得到服务端算好的两个布尔值。
 *
 * 需要判断「是不是我发的」就用 isMine，不要试图去要 id。
 */
export interface PostDTO {
  id: string
  title: string
  content: string
  /** 派生假名，例如「树友 a3f9」。不落库，由 hash(authorId + postId) 现算。 */
  anonName: string
  /** 头像配色索引，取值 0 ~ AVATAR_PALETTE_SIZE-1 */
  avatarIndex: number
  createdAt: string
  likeCount: number
  commentCount: number
  /** 当前登录用户是否点过赞 */
  likedByMe: boolean
  /** 当前登录用户是否就是作者 */
  isMine: boolean
  /**
   * 配图 id。图片本体在 IndexedDB 里，组件拿到 id 后由 ImageGallery 去取。
   * 只读 —— mapper 已经冻结过，改它会当场抛错。
   */
  imageIds: readonly string[]
}

export interface CommentDTO {
  id: string
  postId: string
  content: string
  anonName: string
  avatarIndex: number
  createdAt: string
  isMine: boolean
  imageIds: readonly string[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type PostSort = 'new' | 'hot'

export interface ListPostsParams {
  page?: number
  pageSize?: number
  keyword?: string
  sort?: PostSort
}

export interface PageParams {
  page?: number
  pageSize?: number
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface Credentials {
  username: string
  password: string
}

export interface PostInput {
  title: string
  content: string
  /**
   * 已经存进图片库的 id，由 saveImages() 产出。
   * 注意传进来的是 id 而不是 File —— 压缩和落库发生在调用 createPost 之前，
   * 这样「传图失败」和「发帖失败」是两件可以分别处理的事。
   */
  imageIds?: readonly string[]
}

export interface CommentInput {
  postId: string
  content: string
  imageIds?: readonly string[]
}
