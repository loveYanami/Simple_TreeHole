import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { resetDb } from '@/mock/db'
import { clearImages } from '@/mock/imageStore'
import { clearSession } from '@/mock/session'
import { useAuthStore } from '@/stores/auth'

/**
 * 用 hash 路由而不是 history 路由，是个有意的取舍。
 *
 * 代价是 URL 里多一个 `#`；换来的是 `vite preview`、静态托管、局域网分享
 * 全都零配置可用，直接刷新任意深链接也不会 404。对于「要交出去被各种方式打开」
 * 的项目，这个交换很划算。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },

    {
      path: '/post/:id',
      name: 'post',
      component: () => import('@/views/PostDetailView.vue'),
      props: true,
    },

    // 注意是 /me 而不是 /u/:name —— 因为 DTO 里根本没有 authorId，
    // 「查看别人的主页」在当前数据模型下是做不出来的。路由如实反映这一点。
    {
      path: '/me',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },

    {
      path: '/new',
      name: 'new-post',
      component: () => import('@/views/NewPostView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    { path: '/about', name: 'about', component: () => import('@/views/AboutView.vue') },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 守卫是**同步**的 —— 因为 auth store 在 state() 里就同步水合完了。
 * 若哪天把它改成异步水合，这里就得加 await，而代价是受保护页面每次刷新
 * 都会先闪一下登录页。改动前请想清楚。
 */
router.beforeEach((to) => {
  // 逃生舱：访问 `#/?reset=1` 清空本地数据、回到初始状态。
  //
  // 这段逻辑放在守卫里而不是 main.ts，是因为地址栏只改动 hash 时浏览器**不会**
  // 重新加载文档 —— 写在入口处的话，在「应用已经开着」的情况下根本不会执行，
  // 而那恰恰是它唯一会被用到的场景。
  if (to.query.reset === '1') {
    resetDb()
    clearSession()
    // 图片存在 IndexedDB 里，resetDb() 够不着，得单独清。
    // 这里刻意不用 await —— 守卫保持同步（见上面的说明），改成等清完再刷新，
    // 免得 reload 把还没提交的事务掐断、在库里留下残图。
    void clearImages()
      .catch(() => {})
      .finally(() => {
        // 先去掉 query 再刷新，否则刷新后会再次命中这个分支，陷入死循环
        window.history.replaceState(null, '', `${window.location.pathname}#/`)
        window.location.reload()
      })
    return false
  }

  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'home' }
  }

  return true
})

export default router
