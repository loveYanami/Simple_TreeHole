import { hashIndex, hashSuffix } from './hash'

/** 假名前缀池。让不同的人看起来有不同的「花名」。 */
const ANON_PREFIXES = ['树友', '路人', '匿名', '夜行', '路过的', '小透明', '潜水员'] as const

/** 头像配色池大小，组件据此把索引映射到具体颜色。 */
export const AVATAR_PALETTE_SIZE = 8

/**
 * 生成某个用户在某条帖子上下文里的匿名展示名。
 *
 * scope 传 postId：同一个人在同一条帖子内（帖子本身 + 他发的评论）假名一致，
 * 跨帖子则不同。后者是刻意设计，不是 bug —— 它挡住了「靠昵称把一个人在全站的
 * 发言聚合起来」这种去匿名化攻击，而这正是树洞存在的意义。
 *
 * 假名完全由 hash 现算，不落库：零存储成本，且永远稳定。
 */
export function anonName(userId: string, scope: string): string {
  const seed = `${userId}::${scope}`
  const prefix = ANON_PREFIXES[hashIndex(`${seed}::prefix`, ANON_PREFIXES.length)] ?? '匿名'
  return `${prefix} ${hashSuffix(seed, 4)}`
}

/** 头像配色的调色板索引。同一个人在同一帖子内颜色一致。 */
export function anonAvatarIndex(userId: string, scope: string): number {
  return hashIndex(`${scope}::${userId}::avatar`, AVATAR_PALETTE_SIZE)
}

/** 取展示名首字，用于头像里的文字占位。 */
export function anonInitial(name: string): string {
  return name.trim().charAt(0) || '匿'
}
