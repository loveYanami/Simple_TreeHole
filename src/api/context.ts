import { ApiError } from '@/mock/delay'
import { getSession } from '@/mock/session'

/**
 * 取当前登录用户 id。未登录则抛 UNAUTHORIZED。
 *
 * 所有写操作都必须先过这一关 —— 因为它跑在 simulate 的 thunk 里，
 * 所以「未登录」的错误表现和一个真实的 401 完全一样。
 */
export function requireViewer(): string {
  const session = getSession()
  if (!session) throw new ApiError('请先登录', 'UNAUTHORIZED')
  return session.userId
}

/** 取当前登录用户 id，未登录返回 null。读操作用它来算 likedByMe / isMine。 */
export function currentViewerId(): string | null {
  return getSession()?.userId ?? null
}
