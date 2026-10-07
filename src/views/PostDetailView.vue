<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ApiError,
  createComment,
  deleteComment,
  deletePost,
  discardImages,
  getPost,
  listComments,
  saveImages,
} from '@/api'
import type { CommentDTO, PostDTO, ReactionResult } from '@/api'
import AnonAvatar from '@/components/common/AnonAvatar.vue'
import ImageGallery from '@/components/common/ImageGallery.vue'
import ReactionBar from '@/components/common/ReactionBar.vue'
import CommentForm from '@/components/comment/CommentForm.vue'
import CommentList from '@/components/comment/CommentList.vue'
import ListSkeleton from '@/components/common/ListSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { formatDate, fromNow } from '@/utils/time'

const props = defineProps<{ id: string }>()

const router = useRouter()
const auth = useAuthStore()

const post = ref<PostDTO | null>(null)
const comments = ref<CommentDTO[]>([])
const loading = ref(true)
const commentsLoading = ref(true)
const error = ref('')
const notFound = ref(false)

const submitting = ref(false)
const deletingPost = ref(false)
const commentForm = ref<InstanceType<typeof CommentForm> | null>(null)

async function loadPost() {
  loading.value = true
  error.value = ''
  notFound.value = false
  post.value = null

  try {
    post.value = await getPost(props.id)
  } catch (e) {
    // 非法路由参数（/post/xxx）必须渲染成「不存在」，而不是抛出去白屏
    if (e instanceof ApiError && e.code === 'POST_NOT_FOUND') notFound.value = true
    else error.value = e instanceof ApiError ? e.message : '加载失败了，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  commentsLoading.value = true
  try {
    comments.value = await listComments(props.id)
  } catch (e) {
    comments.value = []
    ElMessage.error(e instanceof ApiError ? e.message : '评论加载失败')
  } finally {
    commentsLoading.value = false
  }
}

function reload() {
  void loadPost()
  void loadComments()
}

onMounted(reload)
watch(() => props.id, reload)

function onReact(payload: ReactionResult) {
  if (!post.value) return
  // DTO 被 Object.freeze 过，所以只能整条替换
  post.value = {
    ...post.value,
    likedByMe: payload.liked,
    likeCount: payload.likeCount,
    dislikedByMe: payload.disliked,
    dislikeCount: payload.dislikeCount,
  }
}

async function onComment(payload: { content: string; images: File[] }) {
  submitting.value = true
  /** 同发帖：已经入库的图片 id，失败时靠它回滚。 */
  let savedIds: string[] = []

  try {
    savedIds = await saveImages(payload.images)

    const created = await createComment({
      postId: props.id,
      content: payload.content,
      imageIds: savedIds,
    })
    comments.value = [...comments.value, created]
    if (post.value) post.value = { ...post.value, commentCount: post.value.commentCount + 1 }
    commentForm.value?.clear()
    ElMessage.success('评论成功')
  } catch (e) {
    await discardImages(savedIds).catch(() => {})
    ElMessage.error(e instanceof Error ? e.message : '评论失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function onDeleteComment(id: string) {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '删除评论', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 用户点了取消
  }

  try {
    await deleteComment(id)
    comments.value = comments.value.filter((c) => c.id !== id)
    if (post.value) {
      post.value = { ...post.value, commentCount: Math.max(0, post.value.commentCount - 1) }
    }
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败，请稍后重试')
  }
}

async function onDeletePost() {
  try {
    await ElMessageBox.confirm('删除后这条帖子和它下面的所有评论都会消失，确定吗？', '删除帖子', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  deletingPost.value = true
  try {
    await deletePost(props.id)
    ElMessage.success('已删除')
    await router.push({ name: 'home' })
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败，请稍后重试')
  } finally {
    deletingPost.value = false
  }
}
</script>

<template>
  <div class="container">
    <div class="back">
      <el-button text @click="router.back()">← 返回</el-button>
    </div>

    <ListSkeleton v-if="loading" :rows="3" />

    <div v-else-if="notFound" class="notice card">
      <h2 class="notice-title">这条帖子不存在</h2>
      <p class="text-soft">它可能已经被作者删除，或者链接本身就不对。</p>
      <el-button type="primary" @click="router.push({ name: 'home' })">回到首页</el-button>
    </div>

    <div v-else-if="error" class="notice card">
      <h2 class="notice-title">加载失败</h2>
      <p class="text-soft">{{ error }}</p>
      <el-button type="primary" @click="reload">重试</el-button>
    </div>

    <template v-else-if="post">
      <article class="post card">
        <header class="post-header">
          <AnonAvatar
            :name="post.anonName"
            :index="post.avatarIndex"
            :size="40"
            :mine="post.isMine"
          />
          <div class="post-author">
            <div class="post-author-line">
              <span class="author-name">{{ post.anonName }}</span>
              <span v-if="post.isMine" class="mine-tag">我</span>
            </div>
            <div class="text-faint post-time" :title="formatDate(post.createdAt)">
              {{ fromNow(post.createdAt) }}
            </div>
          </div>
          <el-button
            v-if="post.isMine"
            text
            type="danger"
            :loading="deletingPost"
            @click="onDeletePost"
          >
            删除
          </el-button>
        </header>

        <h1 class="post-title">
          <span class="post-no" :title="`第 ${post.no} 号帖子`">#{{ post.no }}</span>
          <span class="post-title-text">{{ post.title }}</span>
        </h1>
        <div class="post-content preserve-lines">{{ post.content }}</div>

        <!-- 没有配图时它自己什么都不渲染，不需要在这里判断 -->
        <ImageGallery :ids="post.imageIds" />

        <footer class="post-footer">
          <ReactionBar
            :post-id="post.id"
            :liked="post.likedByMe"
            :like-count="post.likeCount"
            :disliked="post.dislikedByMe"
            :dislike-count="post.dislikeCount"
            @update="onReact"
          />
          <span class="text-faint">{{ post.commentCount }} 条评论</span>
        </footer>
      </article>

      <section class="comments card">
        <h2 class="section-title">评论</h2>

        <CommentForm
          v-if="auth.isLoggedIn"
          ref="commentForm"
          :submitting="submitting"
          @submit="onComment"
        />
        <div v-else class="login-hint">
          <RouterLink :to="{ name: 'login', query: { redirect: `/post/${post.id}` } }">
            登录
          </RouterLink>
          后可以参与讨论
        </div>

        <CommentList
          class="comment-list"
          :comments="comments"
          :loading="commentsLoading"
          @delete="onDeleteComment"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.back {
  margin-bottom: 8px;
}

.post {
  padding: 24px;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-author {
  flex: 1;
  min-width: 0;
}

.post-author-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-name {
  color: var(--th-text-soft);
}

.mine-tag {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--th-primary-soft);
  color: var(--th-primary);
  font-size: 11px;
  line-height: 18px;
}

.post-time {
  font-size: 12px;
}

.post-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 20px 0 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.45;
}

.post-no {
  flex-shrink: 0;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--th-primary-soft);
  color: var(--th-primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 26px;
}

.post-title-text {
  min-width: 0;
}

.post-content {
  margin-top: 14px;
  font-size: 15px;
  line-height: 1.85;
}

.post-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--th-border);
  font-size: 13px;
}

.comments {
  margin-top: 14px;
  padding: 20px 24px 24px;
}

.section-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
}

.login-hint {
  padding: 14px;
  border-radius: 8px;
  background: var(--th-bg);
  color: var(--th-text-soft);
  font-size: 13px;
  text-align: center;
}

.login-hint a {
  color: var(--th-primary);
}

.comment-list {
  margin-top: 8px;
}

.notice {
  padding: 56px 24px;
  text-align: center;
}

.notice-title {
  margin: 0 0 8px;
  font-size: 18px;
}

.notice .el-button {
  margin-top: 20px;
}
</style>
