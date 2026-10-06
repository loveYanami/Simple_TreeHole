/**
 * 内部存储实体。这些类型只活在 mock 数据层内部，不会直接交给组件。
 *
 * ⚠️ authorId 与 passwordHash 是「内部字段」，绝不能出现在 API 层返回的 DTO 里
 * （见 src/api/types.ts）。全项目只有 src/mock/mappers.ts 允许读取 authorId ——
 * 这条约束是匿名性成立的结构性保证，而不是靠自觉。
 */

export interface User {
  id: string
  username: string
  /** 仅做「不明文落库」的处理，不具备任何真实安全性。见 README「关于安全性」。 */
  passwordHash: string
  createdAt: string
}

export interface Post {
  id: string
  /** 真实作者。存储层必须保留，否则「我的帖子」无从查起；但对外永不下发。 */
  authorId: string
  title: string
  content: string
  createdAt: string
  /** 点过赞的用户 id 列表。成员资格即点赞记录，点赞数由 length 派生。 */
  likedBy: string[]
  /** 配图 id 列表。图片本体在 IndexedDB 里，这里只存引用。见 src/mock/imageStore.ts。 */
  imageIds: string[]
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: string
  /** 配图 id 列表。和 Post 共用同一个图片库。 */
  imageIds: string[]
  /** 预留字段：当前 UI 是扁平一层，不参与渲染。将来加「回复」时无需数据迁移。 */
  parentId?: string
}

export interface Db {
  version: number
  users: User[]
  posts: Post[]
  comments: Comment[]
}
