<script setup lang="ts">
import type { CommentDTO } from '@/api'
import CommentItem from './CommentItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ListSkeleton from '@/components/common/ListSkeleton.vue'

defineProps<{
  comments: CommentDTO[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
}>()
</script>

<template>
  <ListSkeleton v-if="loading" :rows="2" />
  <EmptyState v-else-if="comments.length === 0" text="还没有人评论" hint="来说第一句吧" />
  <div v-else class="comment-list">
    <CommentItem
      v-for="comment in comments"
      :key="comment.id"
      :comment="comment"
      @delete="emit('delete', $event)"
    />
  </div>
</template>

<style scoped>
.comment-list {
  display: flex;
  flex-direction: column;
}
</style>
