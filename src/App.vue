<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <!-- 刻意不加 <KeepAlive>：数据由各视图自己取、卸载即丢弃，
           加了 KeepAlive 会把陈旧数据的问题重新引进来。 -->
      <RouterView />
    </main>
    <footer class="app-footer">
      <div class="container">
        树洞 · 一个用于演示的前端 Mock 环境 —— 所有数据都只存在你自己的浏览器里
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-footer {
  padding: 20px 16px 28px;
  color: var(--th-text-faint);
  font-size: 12px;
  text-align: center;
}
</style>
