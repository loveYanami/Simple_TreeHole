import { hashString } from '@/utils/hash'

const SALT = 'treehole-demo-salt'

/**
 * 对密码做一层「不可逆」处理，避免明文直接躺进 localStorage。
 *
 * ⚠️ 这**不是**密码哈希，也不提供任何真实安全性：FNV-1a 既慢不了也抗不了碰撞，
 * 而且这是纯前端 mock —— 源码和 localStorage 任何人都能读。它唯一的作用是
 * 让「随手输了个真实密码」的人不至于在 devtools 里看到自己的明文。
 *
 * 对应的产品结论写在 README 里：这里永远不要用你的真实密码。
 */
export function hashPassword(plain: string): string {
  return `h${hashString(`${SALT}::${plain}`).toString(36)}`
}
