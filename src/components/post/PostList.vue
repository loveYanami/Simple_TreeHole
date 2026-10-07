<script setup lang="ts">
import type { PostDTO, ReactionResult } from '@/api'
import type { ReactionUpdate } from '@/utils/dto'
import PostCard from './PostCard.vue'

withDefaults(defineProps<{ posts: PostDTO[]; deletable?: boolean }>(), { deletable: false })

const emit = defineEmits<{
  (e: 'react', payload: ReactionUpdate): void
  (e: 'delete', id: string): void
}>()

/** 卡片只管表态结果，是哪条帖子由列表补上 —— 它才知道自己在渲染谁。 */
function onReact(postId: string, payload: ReactionResult) {
  emit('react', { postId, ...payload })
}
</script>

<template>
  <div class="post-list">
    <PostCard
      v-for="post in posts"
      :key="post.id"
      :post="post"
      :deletable="deletable"
      @react="onReact(post.id, $event)"
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
