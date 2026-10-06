import { nextId } from '@/mock/id'
import { getDb, saveDb } from '@/mock/db'
import { ApiError, simulate } from '@/mock/delay'
import { hashPassword } from '@/mock/password'
import { clearSession, getSession, setSession } from '@/mock/session'
import type { Credentials, UserDTO } from './types'

function toUserDTO(user: { id: string; username: string; createdAt: string }): UserDTO {
  return Object.freeze({ id: user.id, username: user.username, createdAt: user.createdAt })
}

/**
 * 同步读取当前登录用户。**这是整个 API 层唯一的同步函数。**
 *
 * 它必须同步，因为 auth store 在 state() 初始化时就要拿到身份，
 * 这样路由守卫才能同步判定 —— 否则受保护页面每次刷新都会闪一下登录页。
 * 以后不要「顺手」把它改成 async。
 */
export function getSessionUser(): UserDTO | null {
  const session = getSession()
  if (!session) return null

  const user = getDb().users.find((u) => u.id === session.userId)
  if (!user) {
    // 会话指向的用户已经不存在了（最典型的原因：数据被重置过），顺手清理掉
    clearSession()
    return null
  }
  return toUserDTO(user)
}

export async function register(input: Credentials): Promise<UserDTO> {
  return simulate(() => {
    const db = getDb()
    const username = input.username.trim()
    if (username === '') throw new ApiError('用户名不能为空', 'EMPTY_USERNAME')
    if (input.password === '') throw new ApiError('密码不能为空', 'EMPTY_PASSWORD')

    const taken = db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())
    if (taken) throw new ApiError('这个用户名已经被占用了', 'USERNAME_TAKEN')

    const user = {
      id: nextId('u'),
      username,
      passwordHash: hashPassword(input.password),
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    saveDb()

    setSession({ userId: user.id, username: user.username })
    return toUserDTO(user)
  })
}

export async function login(input: Credentials): Promise<UserDTO> {
  return simulate(() => {
    const db = getDb()
    const username = input.username.trim()
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase())

    // 刻意不区分「用户名不存在」和「密码错误」—— 否则等于提供了一个账号枚举接口
    if (!user || user.passwordHash !== hashPassword(input.password)) {
      throw new ApiError('用户名或密码不正确', 'BAD_CREDENTIALS')
    }

    setSession({ userId: user.id, username: user.username })
    return toUserDTO(user)
  })
}

export async function logout(): Promise<void> {
  return simulate(() => {
    clearSession()
  })
}
