<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="container">
    <div class="notice card">
      <div class="code">404</div>
      <h1 class="notice-title">这个页面不存在</h1>
      <p class="text-soft">地址可能敲错了，或者这个链接已经失效。</p>
      <el-button type="primary" @click="router.push({ name: 'home' })">回到首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.notice {
  padding: 72px 24px;
  text-align: center;
}

.code {
  font-size: 40px;
  font-weight: 700;
  color: var(--th-text-faint);
  line-height: 1;
  letter-spacing: 2px;
}

.notice-title {
  margin: 14px 0 8px;
  font-size: 18px;
}

.notice .el-button {
  margin-top: 20px;
}
</style>
