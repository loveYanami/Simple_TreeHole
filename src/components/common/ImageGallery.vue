<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getImage } from '@/mock/imageStore'

const props = withDefaults(
  defineProps<{
    /** 图片 id 列表，来自 PostDTO / CommentDTO。 */
    ids: readonly string[]
    /** sm 用于信息流和评论，md 用于帖子详情。 */
    size?: 'sm' | 'md'
    /** 是否开启点击放大。信息流里关掉，免得和「点进帖子」抢点击。 */
    preview?: boolean
    /** 最多渲染几张。列表页只需要挑一张露个脸。 */
    limit?: number
  }>(),
  { size: 'md', preview: true, limit: 4 },
)

/**
 * 取到手的 object URL。
 *
 * ⚠️ 每一个都必须显式 revoke —— object URL 会把对应的 blob 一直钉在内存里，
 * 不释放的话，用户翻多少页就攒多少，直到关掉标签页为止。
 */
const urls = ref<string[]>([])
const loading = ref(false)

/** 每次加载领一个号。迟到的结果凭号码作废，避免快速切页时旧结果覆盖新结果。 */
let token = 0

function release() {
  for (const url of urls.value) URL.revokeObjectURL(url)
  urls.value = []
}

function wanted(): readonly string[] {
  return props.limit > 0 ? props.ids.slice(0, props.limit) : props.ids
}

async function load(ids: readonly string[]) {
  const mine = ++token
  release()

  if (ids.length === 0) {
    loading.value = false
    return
  }

  loading.value = true
  const created: string[] = []

  for (const id of ids) {
    try {
      const blob = await getImage(id)
      if (blob) created.push(URL.createObjectURL(blob))
    } catch {
      // 单张读失败不该让整组图片都消失，跳过继续
    }
  }

  if (mine !== token) {
    // 这次加载已经过期（用户又翻页了），把刚建出来的 URL 就地释放
    for (const url of created) URL.revokeObjectURL(url)
    return
  }

  urls.value = created
  loading.value = false
}

watch(
  () => props.ids,
  () => load(wanted()),
  { immediate: true },
)

onBeforeUnmount(() => {
  token += 1 // 让还在飞的加载作废，别再去碰即将卸载的组件
  release()
})

const shownCount = computed(() => Math.min(wanted().length, 4))
/** ids 有值、也加载完了，却一张都没取到 —— 说明图片真的没了。 */
const missing = computed(() => !loading.value && props.ids.length > 0 && urls.value.length === 0)
</script>

<template>
  <div
    v-if="urls.length"
    class="gallery"
    :class="[`is-${size}`, { 'is-single': urls.length === 1 }]"
  >
    <el-image
      v-for="(url, index) in urls"
      :key="url"
      class="pic"
      :class="{ 'is-zoomable': preview }"
      :src="url"
      :preview-src-list="preview ? urls : []"
      :initial-index="index"
      fit="cover"
      preview-teleported
      hide-on-click-modal
    >
      <template #error>
        <div class="pic-fallback">读不出来</div>
      </template>
    </el-image>
  </div>

  <div
    v-else-if="loading && ids.length"
    class="gallery is-skeleton"
    :class="`is-${size}`"
    aria-hidden="true"
  >
    <div v-for="n in shownCount" :key="n" class="skeleton" />
  </div>

  <!-- 只有「本该有图却读不到」才提示。ids 为空是正常的，什么都不显示。 -->
  <p v-else-if="missing" class="missing text-faint">配图已丢失</p>
</template>

<style scoped>
.gallery {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}

.pic {
  display: block;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: var(--th-bg);
}

/* 只有真的能点开放大时才给放大镜光标。信息流里的图不可放大（点了是进帖子），
   给它 zoom-in 是在骗用户。
   必须 :deep 打到 <img> 上：Element Plus 给可放大的图在内部元素上设了
   `cursor: pointer`，只写在 .pic 容器上会被它盖掉（真正被 hover 的是那个 <img>）。 */
.pic.is-zoomable,
.pic.is-zoomable :deep(.el-image__inner),
.pic.is-zoomable :deep(.el-image__preview) {
  cursor: zoom-in;
}

.is-md {
  grid-template-columns: repeat(3, 1fr);
  max-width: 540px;
}

.is-md .pic,
.is-md .skeleton {
  height: 118px;
}

.is-sm {
  grid-template-columns: repeat(4, 1fr);
  max-width: 300px;
  margin-top: 8px;
  gap: 5px;
}

.is-sm .pic,
.is-sm .skeleton {
  height: 68px;
}

/* 只有一张图时不要挤在三分之一格里 —— 给它一个像样的尺寸 */
.is-single.is-md {
  grid-template-columns: 1fr;
  max-width: 300px;
}

.is-single.is-md .pic {
  height: 200px;
}

.is-single.is-sm {
  grid-template-columns: 1fr;
  max-width: 150px;
}

.is-single.is-sm .pic {
  height: 100px;
}

.skeleton {
  border-radius: 8px;
  background: var(--th-border);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pic-fallback {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--th-text-faint);
  font-size: 12px;
}

.missing {
  margin: 10px 0 0;
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
