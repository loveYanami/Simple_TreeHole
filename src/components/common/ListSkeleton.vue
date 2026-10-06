<script setup lang="ts">
/**
 * 列表加载中的占位。
 *
 * 存在的意义只有一个：把「加载中」和「没有数据」区分开。在首个 300ms 里
 * 就渲染「还没有人发帖」，会让应用每次导航都显得是坏的。
 */
withDefaults(defineProps<{ rows?: number }>(), { rows: 3 })
</script>

<template>
  <div class="skeleton">
    <div v-for="i in rows" :key="i" class="skeleton-card card">
      <div class="bar bar-title" />
      <div class="bar bar-line" />
      <div class="bar bar-line is-short" />
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  padding: 18px;
}

.bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef0f3 25%, #e4e7eb 37%, #eef0f3 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.bar-title {
  width: 45%;
  height: 16px;
  margin-bottom: 14px;
}

.bar-line {
  width: 100%;
}

.bar-line + .bar-line {
  margin-top: 8px;
}

.bar-line.is-short {
  width: 65%;
}

@keyframes shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    animation: none;
  }
}
</style>
