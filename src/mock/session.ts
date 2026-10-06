import { SESSION_KEY } from './constants'

export interface Session {
  userId: string
  username: string
}

/**
 * 登录会话。
 *
 * 存的是 { userId, username } **快照**而不只是 id —— 这个选择带来一个关键性质：
 * auth store 启动时能**同步**水合，不需要 await，路由守卫也就不用写成异步的。
 * 异步守卫会让受保护页面每次刷新都闪一下登录页（先判定未登录 → 跳转 → 再跳回来）。
 *
 * 本模块是 SESSION_KEY 的唯一写入方。
 */

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw === null) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const session = parsed as Partial<Session>
    if (typeof session.userId !== 'string' || typeof session.username !== 'string') return null

    return { userId: session.userId, username: session.username }
  } catch {
    return null
  }
}

export function setSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.warn('[treehole] 写入会话失败', error)
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // 清不掉也不该让登出失败
  }
}
