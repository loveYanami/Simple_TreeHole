<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initial = computed(() => auth.username.charAt(0).toUpperCase() || '?')

async function onLogout() {
  try {
    await auth.logout()
    ElMessage.success('已退出登录')
    await router.push({ name: 'home' })
  } catch (error) {
    ElMessage.error(error instanceof ApiError ? error.message : '退出登录失败')
  }
}
</script>

<template>
  <header class="app-header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">树洞</span>
        <span class="brand-sub">说点想说的</span>
      </RouterLink>

      <nav class="nav">
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/about" class="nav-link">关于</RouterLink>
      </nav>

      <div class="actions">
        <el-button type="primary" @click="router.push({ name: 'new-post' })">发帖</el-button>

        <el-dropdown v-if="auth.isLoggedIn">
          <span class="user-chip">
            <span class="user-avatar">{{ initial }}</span>
            <span class="user-name">{{ auth.username }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push({ name: 'profile' })"
                >个人主页</el-dropdown-item
              >
              <el-dropdown-item divided @click="onLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <template v-else>
          <el-button text @click="router.push({ name: 'login' })">登录</el-button>
          <el-button text @click="router.push({ name: 'register' })">注册</el-button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--th-surface);
  border-bottom: 1px solid var(--th-border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  /* 比 56px 高一点，让放大后的品牌字样有呼吸空间，不至于贴着上下边框 */
  height: 60px;
}

.brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.brand:hover {
  opacity: 0.82;
}

.brand-mark {
  font-size: 23px;
  font-weight: 800;
  letter-spacing: 3px;
  /* letter-spacing 会在**最后一个字后面**也加一份间距，把右边撑出 3px 的空。
     抵消掉，不然它和副标题之间的缝比看上去的宽。 */
  margin-right: -3px;

  /* 渐变文字。两端都取自主色系里够深的那一端 —— #db2777 对白底是 4.6:1，
     #af1f5f 更深，所以整条渐变上的字都过 WCAG AA。
     换成浅粉收尾，末尾那个字就开始糊在背景里了。 */
  background: linear-gradient(135deg, var(--th-primary) 0%, var(--th-primary-deep) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-sub {
  font-size: 12px;
  color: var(--th-text-faint);
}

.nav {
  display: flex;
  gap: 18px;
  flex: 1;
}

.nav-link {
  color: var(--th-text-soft);
  font-size: 14px;
  transition: color 0.15s;
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  color: var(--th-primary);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
  outline: none;
}

.user-chip:hover {
  background: var(--th-bg);
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--th-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.user-name {
  font-size: 13px;
  color: var(--th-text);
}

/* 窄屏下把副标题和导航收起来，保证发帖和登录态始终可见 */
@media (max-width: 560px) {
  .brand-sub,
  .nav {
    display: none;
  }
}
</style>
