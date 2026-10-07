<script setup lang="ts">
import { computed } from 'vue'
import type { PostDTO, ReactionResult } from '@/api'
import { fromNow } from '@/utils/time'
import AnonAvatar from '@/components/common/AnonAvatar.vue'
import ImageGallery from '@/components/common/ImageGallery.vue'
import ReactionBar from '@/components/common/ReactionBar.vue'

const props = withDefaults(defineProps<{ post: PostDTO; deletable?: boolean }>(), {
  deletable: false,
})

const emit = defineEmits<{
  (e: 'react', payload: ReactionResult): void
  (e: 'delete', id: string): void
}>()

/** 编号的显示格式。改这里就能全局改样式（比如换成 `#0007`）。 */
const noLabel = computed(() => `#${props.post.no}`)

const excerpt = computed(() => {
  const text = props.post.content.replace(/\s+/g, ' ').trim()
  return text.length > 110 ? `${text.slice(0, 110)}…` : text
})

const postLink = computed(() => ({ name: 'post', params: { id: props.post.id } }))
</script>

<template>
  <article class="post-card card">
    <RouterLink :to="postLink" class="post-main">
      <!-- 编号和标题同一行：编号是「这条帖子叫什么号」，和标题是同一个层级的信息。
           单独占一行会平白多出一行高度，挂在正文起首又会被长标题挤走。 -->
      <h3 class="post-title">
        <span class="post-no" :title="`第 ${post.no} 号帖子`">{{ noLabel }}</span>
        <span class="post-title-text">{{ post.title }}</span>
      </h3>
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
        <ReactionBar
          :post-id="post.id"
          :liked="post.likedByMe"
          :like-count="post.likeCount"
          :disliked="post.dislikedByMe"
          :dislike-count="post.dislikeCount"
          @update="emit('react', $event)"
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
  display: flex;
  /* baseline 而不是 center：编号和标题字号不同，按基线对齐才像同一行文字 */
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.post-no {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 4px;
  background: var(--th-primary-soft);
  color: var(--th-primary);
  font-size: 12px;
  /* 等宽数字：不然 #1 和 #12 宽度不同，每张卡片的标题起点会参差不齐 */
  font-variant-numeric: tabular-nums;
  line-height: 20px;
}

.post-title-text {
  /* flex 子项默认不肯缩到内容宽度以下，长标题会在窄屏上撑破卡片 */
  min-width: 0;
}

/* 只让标题文字变色，编号保持自己的底色 —— 整块一起变会像整行被选中了 */
.post-title:hover .post-title-text {
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
