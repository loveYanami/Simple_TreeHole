<script setup lang="ts">
import { computed } from 'vue'
import type { PostDTO } from '@/api'
import { fromNow } from '@/utils/time'
import AnonAvatar from '@/components/common/AnonAvatar.vue'
import ImageGallery from '@/components/common/ImageGallery.vue'
import LikeButton from '@/components/common/LikeButton.vue'

const props = withDefaults(defineProps<{ post: PostDTO; deletable?: boolean }>(), {
  deletable: false,
})

const emit = defineEmits<{
  (e: 'like', payload: { liked: boolean; count: number }): void
  (e: 'delete', id: string): void
}>()

const excerpt = computed(() => {
  const text = props.post.content.replace(/\s+/g, ' ').trim()
  return text.length > 110 ? `${text.slice(0, 110)}…` : text
})

const postLink = computed(() => ({ name: 'post', params: { id: props.post.id } }))
</script>

<template>
  <article class="post-card card">
    <RouterLink :to="postLink" class="post-main">
      <h3 class="post-title">{{ post.title }}</h3>
      <p class="post-excerpt">{{ excerpt }}</p>
      <!-- 信息流里只露第一张图，且关掉点击放大 —— 否则点图和点卡片是两件互相打架的事。
           每张卡片都去把图全读出来，也会让长列表白白多出一堆 IndexedDB 读取。 -->
      <ImageGallery :ids="post.imageIds" size="sm" :preview="false" :limit="1" />
    </RouterLink>

    <div class="post-meta">
      <div class="author">
        <AnonAvatar
          :name="post.anonName"
          :index="post.avatarIndex"
          :size="26"
          :mine="post.isMine"
        />
        <span class="author-name">{{ post.anonName }}</span>
        <span v-if="post.isMine" class="mine-tag">我</span>
        <span class="text-faint">· {{ fromNow(post.createdAt) }}</span>
      </div>

      <div class="metrics">
        <RouterLink :to="postLink" class="metric">💬 {{ post.commentCount }}</RouterLink>
        <LikeButton
          :post-id="post.id"
          :liked="post.likedByMe"
          :count="post.likeCount"
          @update="emit('like', $event)"
        />
        <button
          v-if="deletable && post.isMine"
          class="delete-link"
          type="button"
          @click.stop.prevent="emit('delete', post.id)"
        >
          删除
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.post-card {
  padding: 18px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.post-card:hover {
  border-color: #d8dce3;
  box-shadow: 0 2px 10px rgba(31, 35, 40, 0.05);
}

.post-main {
  display: block;
}

.post-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.post-title:hover {
  color: var(--th-primary);
}

.post-excerpt {
  margin: 8px 0 0;
  color: var(--th-text-soft);
  font-size: 13.5px;
  line-height: 1.7;
}

.post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  font-size: 13px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.author-name {
  color: var(--th-text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mine-tag {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--th-primary-soft);
  color: var(--th-primary);
  font-size: 11px;
  line-height: 18px;
}

.metrics {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.metric {
  color: var(--th-text-faint);
  font-size: 13px;
}

.metric:hover {
  color: var(--th-primary);
}

.delete-link {
  padding: 0;
  border: none;
  background: none;
  color: var(--th-text-faint);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.delete-link:hover {
  color: #e0625a;
}
</style>
