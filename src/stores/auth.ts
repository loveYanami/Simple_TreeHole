import { defineStore } from 'pinia'
import * as api from '@/api'
import type { UserDTO } from '@/api'

/**
 * 全项目唯一的 Pinia store，只负责回答「我是谁」。
 *
 * 帖子和评论**刻意不放进 store**：它们真正的存储是 mock db，镜像一份进来
 * 只会制造第二个真相源和一个缓存失效问题（在详情页改了数据，返回列表还渲染
 * 旧副本），收益为零。列表数据由需要它的视图自己取，视图卸载即丢弃。
 */

/**
 * 同步水合。这不是「偷懒的同步 API」，而是一个刻意的设计：
 * 身份必须在守卫运行前就绪，否则受保护页面每次刷新都会闪一下登录页。
 */
function hydrate(): UserDTO | null {
  try {
    return api.getSessionUser()
  } catch (error) {
    console.warn('[treehole] 会话水合失败，按未登录处理', error)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: hydrate(),
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
    username: (state) => state.user?.username ?? '',
  },

  actions: {
    async login(username: string, password: string) {
      this.user = await api.login({ username, password })
    },

    async register(username: string, password: string) {
      this.user = await api.register({ username, password })
    },

    async logout() {
      await api.logout()
      this.user = null
    },
  },
})
