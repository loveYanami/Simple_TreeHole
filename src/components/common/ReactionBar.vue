<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ApiError, toggleDislike, toggleLike } from '@/api'
import type { ReactionResult } from '@/api'

/**
 * 赞 / 踩一对按钮。
 *
 * 两个按钮由**同一个组件**持有，而不是两个各自独立的按钮组件 —— 因为赞和踩
 * 互斥，一次点击会同时改变两边的状态。拆开的话，「点踩要顺手把赞撤掉」这件事
 * 就得由父组件来协调，乐观更新会立刻变成两处都要改的难题。
 */
const props = defineProps<{
  postId: string
  liked: boolean
  likeCount: number
  disliked: boolean
  dislikeCount: number
}>()

const emit = defineEmits<{
  (e: 'update', payload: ReactionResult): void
}>()

/**
 * 一个 pending 管住**两个**按钮。
 *
 * 不能每个按钮各管各的：点赞的请求还在飞的时候去点踩，两次请求会并发落到
 * 同一条帖子上，谁最后到达谁说了算 —— 而互斥逻辑让它们的结果互相依赖，
 * 顺序一乱，界面就会停在一个服务端从来没有过的状态上。
 */
const pending = ref(false)

function current(): ReactionResult {
  return {
    liked: props.liked,
    likeCount: props.likeCount,
    disliked: props.disliked,
    dislikeCount: props.dislikeCount,
  }
}

/**
 * 在本地算出「这次点完之后应该是什么样」，用来立刻更新界面。
 *
 * ⚠️ 这里的规则必须和 src/api/posts.ts 的 applyReaction 逐字一致，包括互斥那
 * 一半。它只是一个「预测」，服务端返回值会覆盖它（见 onClick）—— 猜错了能自愈，
 * 但猜错了的那一瞬间用户是看得见的，所以两边仍然要对齐。
 */
function predict(kind: 'like' | 'dislike'): ReactionResult {
  if (kind === 'like') {
    const nowLiked = !props.liked
    return {
      liked: nowLiked,
      likeCount: props.likeCount + (nowLiked ? 1 : -1),
      // 只有「新点上赞」才会撤掉踩；取消赞不碰踩。
      disliked: nowLiked ? false : props.disliked,
      dislikeCount: nowLiked && props.disliked ? props.dislikeCount - 1 : props.dislikeCount,
    }
  }

  const nowDisliked = !props.disliked
  return {
    disliked: nowDisliked,
    dislikeCount: props.dislikeCount + (nowDisliked ? 1 : -1),
    liked: nowDisliked ? false : props.liked,
    likeCount: nowDisliked && props.liked ? props.likeCount - 1 : props.likeCount,
  }
}

async function onClick(kind: 'like' | 'dislike') {
  // 防连点。真正的坑从来不是数据模型，而是这里：两次快速点击会发出两个
  // toggle，一加一减互相抵消，用户看到的是「点了没反应」。
  if (pending.value) return
  pending.value = true

  const previous = current()

  // 乐观更新：赞和踩是仅有的两个 300ms 延时会明显读作「卡住了」的操作。
  emit('update', predict(kind))

  try {
    const result =
      kind === 'like' ? await toggleLike(props.postId) : await toggleDislike(props.postId)
    // 用服务端返回值对账，而不是相信本地的猜测 —— 万一有分歧，这里会自愈。
    emit('update', result)
  } catch (error) {
    emit('update', previous)
    ElMessage.error(error instanceof ApiError ? error.message : '操作失败了，请稍后重试')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="reactions">
    <button
      class="reaction reaction--like"
      :class="{ 'is-on': liked }"
      type="button"
      :disabled="pending"
      :aria-pressed="liked"
      :aria-label="liked ? '取消点赞' : '点赞'"
      @click.stop.prevent="onClick('like')"
    >
      <span class="glyph" aria-hidden="true">♥</span>
      <span class="count">{{ likeCount }}</span>
    </button>

    <button
      class="reaction reaction--dislike"
      :class="{ 'is-on': disliked }"
      type="button"
      :disabled="pending"
      :aria-pressed="disliked"
      :aria-label="disliked ? '取消点踩' : '点踩'"
      @click.stop.prevent="onClick('dislike')"
    >
      <span class="glyph" aria-hidden="true">▽</span>
      <span class="count">{{ dislikeCount }}</span>
    </button>
  </div>
</template>

<style scoped>
.reactions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.reaction {
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

.reaction:hover:not(:disabled) {
  transform: scale(1.06);
}

.reaction:active:not(:disabled) {
  transform: scale(0.96);
}

.reaction:disabled {
  cursor: default;
  opacity: 0.7;
}

.reaction--like:hover:not(:disabled) {
  border-color: var(--th-primary);
  color: var(--th-primary);
}

.reaction--like.is-on {
  border-color: var(--th-primary);
  color: var(--th-primary);
  background: var(--th-primary-soft);
}

/* 踩刻意用中性灰而不是红色：红色在这个项目里是「删除」的语义（见删除按钮），
   两件事撞色会让人以为点踩会删掉什么。它的实心感也比赞弱一档 —— 这也是
   多数平台的做法，反对票不该比赞同票更吸引眼球。 */
.reaction--dislike:hover:not(:disabled) {
  border-color: var(--th-text-soft);
  color: var(--th-text);
}

.reaction--dislike.is-on {
  border-color: var(--th-text);
  color: var(--th-text);
  background: rgba(31, 35, 40, 0.06);
}

.glyph {
  font-size: 12px;
  line-height: 1;
}

/* 关掉动效的规则必须在**这个文件**里：scoped 样式编译后会多带一个属性选择器，
   全局那条（src/assets/styles/main.css）优先级不够，盖不住这里的 :hover 规则。 */
@media (prefers-reduced-motion: reduce) {
  .reaction {
    transition: none;
  }

  .reaction:hover:not(:disabled),
  .reaction:active:not(:disabled) {
    transform: none;
  }
}
</style>
