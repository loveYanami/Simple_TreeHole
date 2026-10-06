<script setup lang="ts">
import type { CommentDTO } from '@/api'
import { fromNow } from '@/utils/time'
import AnonAvatar from '@/components/common/AnonAvatar.vue'
import ImageGallery from '@/components/common/ImageGallery.vue'

defineProps<{ comment: CommentDTO }>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
}>()
</script>

<template>
  <div class="comment-item">
    <AnonAvatar
      :name="comment.anonName"
      :index="comment.avatarIndex"
      :size="30"
      :mine="comment.isMine"
    />

    <div class="comment-body">
      <div class="comment-head">
        <span class="comment-author">{{ comment.anonName }}</span>
        <span v-if="comment.isMine" class="mine-tag">我</span>
        <span class="text-faint comment-time">{{ fromNow(comment.createdAt) }}</span>
        <button
          v-if="comment.isMine"
          class="delete-link"
          type="button"
          @click="emit('delete', comment.id)"
        >
          删除
        </button>
      </div>

      <p v-if="comment.content" class="comment-content preserve-lines">{{ comment.content }}</p>
      <ImageGallery :ids="comment.imageIds" size="sm" />
    </div>
  </div>
</template>

<style scoped>
.comment-item {
  display: flex;
  gap: 10px;
  padding: 14px 0;
}

.comment-item + .comment-item {
  border-top: 1px solid var(--th-border);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.comment-author {
  color: var(--th-text-soft);
}

.mine-tag {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--th-primary-soft);
  color: var(--th-primary);
  font-size: 11px;
  line-height: 17px;
}

.comment-time {
  font-size: 12px;
}

.delete-link {
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  color: var(--th-text-faint);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.delete-link:hover {
  color: #e0625a;
}

.comment-content {
  margin: 6px 0 0;
  line-height: 1.75;
}
</style>
