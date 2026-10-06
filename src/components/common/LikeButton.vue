<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError, toggleLike } from '@/api'

const props = defineProps<{
  postId: string
  liked: boolean
  count: number
}>()

const emit = defineEmits<{
  (e: 'update', payload: { liked: boolean; count: number }): void
}>()

const pending = ref(false)

async function onClick() {
  // 防连点。真正的坑从来不是数据模型，而是这里：两次快速点击会发出两个
  // toggleLike，一加一减互相抵消，用户看到的是「点了没反应」。
  if (pending.value) return
  pending.value = true

  const previous = { liked: props.liked, count: props.count }

  // 乐观更新：点赞是唯一一个 300ms 延时会明显读作「卡住了」的操作。
  emit('update', { liked: !previous.liked, count: previous.count + (previous.liked ? -1 : 1) })

  try {
    const result = await toggleLike(props.postId)
    // 用服务端返回值对账，而不是相信本地的猜测 —— 万一有分歧，这里会自愈。
    emit('update', { liked: result.liked, count: result.likeCount })
  } catch (error) {
    emit('update', previous)
    ElMessage.error(error instanceof ApiError ? error.message : '操作失败了，请稍后重试')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button
    class="like-button"
    :class="{ 'is-liked': liked }"
    type="button"
    :disabled="pending"
    :aria-pressed="liked"
    @click.stop.prevent="onClick"
  >
    <span class="heart">♥</span>
    <span class="count">{{ count }}</span>
  </button>
</template>

<style scoped>
.like-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1px solid var(--th-border);
  border-radius: 999px;
  background: transparent;
  color: var(--th-text-soft);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.like-button:hover:not(:disabled) {
  border-color: var(--th-primary);
  color: var(--th-primary);
  transform: scale(1.06);
}

.like-button:active:not(:disabled) {
  transform: scale(0.96);
}

.like-button:disabled {
  cursor: default;
  opacity: 0.7;
}

.like-button.is-liked {
  border-color: var(--th-primary);
  color: var(--th-primary);
  background: var(--th-primary-soft);
}

.heart {
  font-size: 12px;
  line-height: 1;
}
</style>
