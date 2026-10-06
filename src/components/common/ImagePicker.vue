<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MAX_IMAGES, MAX_SOURCE_BYTES, formatBytes } from '@/utils/image'

const props = withDefaults(
  defineProps<{
    max?: number
    disabled?: boolean
  }>(),
  { max: MAX_IMAGES, disabled: false },
)

const emit = defineEmits<{
  (e: 'change', files: File[]): void
}>()

interface Pending {
  file: File
  /** 本地预览用的 object URL。移除或卸载时必须释放。 */
  url: string
}

/**
 * 这里只存 File，**不压缩**。
 *
 * 压缩放到提交那一刻做，因为压缩是纯浪费 CPU 的事：用户挑了三张又删掉两张，
 * 提前压就是白压。而校验（类型、体积）必须在这里做 —— 它是即时的，能让用户
 * 立刻知道哪张图不行，不用等到点发布才被拒。
 */
const pending = ref<Pending[]>([])
const dragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const atMax = computed(() => pending.value.length >= props.max)
const blocked = computed(() => props.disabled || atMax.value)

const hint = computed(() => {
  if (atMax.value) return `最多 ${props.max} 张，已达上限`
  return `最多 ${props.max} 张，单张不超过 ${formatBytes(MAX_SOURCE_BYTES)}，会自动压缩`
})

function sync() {
  emit(
    'change',
    pending.value.map((item) => item.file),
  )
}

function addFiles(incoming: FileList | null) {
  if (!incoming || incoming.length === 0) return

  const room = props.max - pending.value.length
  if (room <= 0) {
    ElMessage.warning(`最多只能添加 ${props.max} 张图片`)
    return
  }

  const accepted: Pending[] = []
  for (const file of Array.from(incoming)) {
    if (accepted.length >= room) {
      ElMessage.warning(`最多只能添加 ${props.max} 张图片，多余的已忽略`)
      break
    }
    if (!file.type.startsWith('image/')) {
      ElMessage.warning(`「${file.name}」不是图片，已跳过`)
      continue
    }
    if (file.size > MAX_SOURCE_BYTES) {
      ElMessage.warning(`「${file.name}」超过 ${formatBytes(MAX_SOURCE_BYTES)}，已跳过`)
      continue
    }
    accepted.push({ file, url: URL.createObjectURL(file) })
  }

  if (accepted.length === 0) return
  pending.value = [...pending.value, ...accepted]
  sync()
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(input.files)
  // 必须清空：否则连续两次选同一个文件不会触发 change
  input.value = ''
}

function pick() {
  if (blocked.value) return
  inputRef.value?.click()
}

function onDrop(event: DragEvent) {
  dragging.value = false
  if (props.disabled) return
  addFiles(event.dataTransfer?.files ?? null)
}

function removeAt(index: number) {
  const item = pending.value[index]
  if (!item) return
  URL.revokeObjectURL(item.url)
  pending.value = pending.value.filter((_, i) => i !== index)
  sync()
}

function clear() {
  for (const item of pending.value) URL.revokeObjectURL(item.url)
  pending.value = []
  sync()
}

onBeforeUnmount(() => {
  // 不释放的话，这些 blob 会一直挂在内存里直到标签页关闭
  for (const item of pending.value) URL.revokeObjectURL(item.url)
})

defineExpose({ clear })
</script>

<template>
  <div class="image-picker">
    <ul v-if="pending.length" class="thumbs">
      <li v-for="(item, index) in pending" :key="item.url" class="thumb">
        <img :src="item.url" :alt="`待添加的图片 ${index + 1}`" />
        <button
          type="button"
          class="remove"
          :aria-label="`移除第 ${index + 1} 张图片`"
          @click="removeAt(index)"
        >
          ✕
        </button>
      </li>
    </ul>

    <!-- @click.self：点空白区域也能触发选择，但点内部的按钮走它自己的处理，
         免得一次点击弹出两个文件选择框。键盘用户则由里面那个真按钮负责。 -->
    <div
      class="drop"
      :class="{ 'is-dragging': dragging, 'is-blocked': blocked }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click.self="pick"
    >
      <input
        ref="inputRef"
        class="file-input"
        type="file"
        accept="image/*"
        multiple
        :disabled="blocked"
        @change="onInputChange"
      />
      <button type="button" class="pick" :disabled="blocked" @click="pick">＋ 添加图片</button>
      <span class="hint text-faint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.image-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.thumb {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--th-border);
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.remove:hover {
  background: rgba(0, 0, 0, 0.75);
}

.drop {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px dashed var(--th-border);
  border-radius: 8px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.drop:hover:not(.is-blocked),
.drop.is-dragging {
  border-color: var(--th-primary);
  background: var(--th-primary-soft);
}

.drop.is-blocked {
  opacity: 0.65;
}

.file-input {
  display: none;
}

.pick {
  padding: 5px 12px;
  border: 1px solid var(--th-border);
  border-radius: 6px;
  background: var(--th-surface);
  color: var(--th-text);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.pick:hover:not(:disabled) {
  border-color: var(--th-primary);
  color: var(--th-primary);
}

.pick:disabled {
  cursor: default;
}

.hint {
  font-size: 12px;
  /* 让点击穿透到 .drop 上，这样点提示文字也能打开选择框 */
  pointer-events: none;
}
</style>
