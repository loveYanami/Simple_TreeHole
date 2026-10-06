<script setup lang="ts">
import { reactive, ref } from 'vue'
import ImagePicker from '@/components/common/ImagePicker.vue'

const props = withDefaults(defineProps<{ submitting?: boolean }>(), { submitting: false })

const emit = defineEmits<{
  (e: 'submit', payload: { title: string; content: string; images: File[] }): void
}>()

const form = reactive({ title: '', content: '' })
/** 由 ImagePicker 同步过来，提交时原样交给父组件去压缩入库。 */
const images = ref<File[]>([])
const titleError = ref('')
const contentError = ref('')

function onSubmit() {
  const title = form.title.trim()
  const content = form.content.trim()

  titleError.value = title === '' ? '标题不能为空' : ''
  contentError.value =
    content === '' && images.value.length === 0 ? '写点什么，或者至少加一张图' : ''
  if (titleError.value !== '' || contentError.value !== '') return

  emit('submit', { title, content, images: images.value })
}

/** 供父组件在提交失败后保留用户输入，不需要重新打字。 */
defineExpose({ form })
</script>

<template>
  <el-form label-position="top" class="post-form" @submit.prevent>
    <el-form-item label="标题" :error="titleError">
      <el-input
        v-model="form.title"
        placeholder="一句话说清楚你想说的"
        maxlength="60"
        show-word-limit
        size="large"
      />
    </el-form-item>

    <el-form-item label="正文" :error="contentError">
      <el-input
        v-model="form.content"
        type="textarea"
        :rows="8"
        resize="vertical"
        placeholder="这里没有人认识你，慢慢说"
        maxlength="2000"
        show-word-limit
      />
    </el-form-item>

    <el-form-item label="配图">
      <ImagePicker :disabled="props.submitting" @change="images = $event" />
    </el-form-item>

    <div class="actions">
      <el-button type="primary" size="large" :loading="props.submitting" @click="onSubmit">
        发布
      </el-button>
      <span class="hint text-faint">发布后会以随机假名展示，不会显示你的用户名</span>
    </div>
  </el-form>
</template>

<style scoped>
.post-form {
  padding: 20px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hint {
  font-size: 12px;
}
</style>
