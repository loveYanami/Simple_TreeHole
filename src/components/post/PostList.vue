<script setup lang="ts">
import type { PostDTO } from '@/api'
import PostCard from './PostCard.vue'

withDefaults(defineProps<{ posts: PostDTO[]; deletable?: boolean }>(), { deletable: false })

const emit = defineEmits<{
  (e: 'like', payload: { postId: string; liked: boolean; count: number }): void
  (e: 'delete', id: string): void
}>()

function onLike(postId: string, payload: { liked: boolean; count: number }) {
  emit('like', { postId, ...payload })
}
</script>

<template>
  <div class="post-list">
    <PostCard
      v-for="post in posts"
      :key="post.id"
      :post="post"
      :deletable="deletable"
      @like="onLike(post.id, $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>

<style scoped>
.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
