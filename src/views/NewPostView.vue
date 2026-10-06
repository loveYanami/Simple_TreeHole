<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPost, discardImages, saveImages } from '@/api'
import PostForm from '@/components/post/PostForm.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const submitting = ref(false)

async function onSubmit(payload: { title: string; content: string; images: File[] }) {
  submitting.value = true
  /** 已经写进图片库的 id。发帖失败时要靠它回滚，所以声明在 try 外面。 */
  let savedIds: string[] = []

  try {
    // 顺序很重要：先压图入库拿到 id，再用 id 建帖子。
    // 反过来做的话，帖子建好了图却没存上，就会留下一条永远加载不出图的帖子。
    savedIds = await saveImages(payload.images)

    const created = await createPost({
      title: payload.title,
      content: payload.content,
      imageIds: savedIds,
    })
    ElMessage.success('发布成功')
    // 直接跳到详情页，让用户马上看到自己发出去的东西
    await router.push({ name: 'post', params: { id: created.id } })
  } catch (e) {
    // 帖子没建成，图就不能留在库里 —— 否则它们是永远没人引用的垃圾，
    // 用户看不见，也清不掉，只会一直占着配额。
    await discardImages(savedIds).catch(() => {})
    // 用 Error 而不是 ApiError 兜底：图片压缩抛的是普通 Error，
    // 它的 message 同样是写好给用户看的中文，不该被吞掉。
    ElMessage.error(e instanceof Error ? e.message : '发布失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">发一条树洞</h1>

    <el-alert type="info" :closable="false" class="tip">
      当前以 <strong>{{ auth.username }}</strong> 的身份登录，但发布后对外只显示一个随机假名；
      同一条帖子下的假名保持一致，跨帖子则不同 —— 这样别人没法把你散落各处的发言串起来。
    </el-alert>

    <div class="card">
      <PostForm :submitting="submitting" @submit="onSubmit" />
    </div>
  </div>
</template>

<style scoped>
.tip {
  margin-bottom: 14px;
}
</style>
