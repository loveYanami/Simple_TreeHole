<script setup lang="ts">
import { ref } from 'vue'
import ImagePicker from '@/components/common/ImagePicker.vue'

withDefaults(defineProps<{ submitting?: boolean }>(), { submitting: false })

const emit = defineEmits<{
  (e: 'submit', payload: { content: string; images: File[] }): void
}>()

const content = ref('')
const images = ref<File[]>([])
const picker = ref<InstanceType<typeof ImagePicker> | null>(null)

function onSubmit() {
  const text = content.value.trim()
  // 只发图不写字也是允许的
  if (text === '' && images.value.length === 0) return
  emit('submit', { content: text, images: images.value })
}

/** 由父组件在提交成功后调用 —— 失败时不清空，免得用户白打一遍字。 */
function clear() {
  content.value = ''
  picker.value?.clear()
}

defineExpose({ clear })
</script>

<template>
  <div class="comment-form">
    <el-input
      v-model="content"
      type="textarea"
      :rows="3"
      resize="none"
      maxlength="500"
      show-word-limit
      placeholder="友善一点 —— 这里每个人都是匿名的"
    />
    <ImagePicker ref="picker" :disabled="submitting" @change="images = $event" />
    <div class="actions">
      <el-button type="primary" :loading="submitting" @click="onSubmit">发表评论</el-button>
    </div>
  </div>
</template>

<style scoped>
.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
