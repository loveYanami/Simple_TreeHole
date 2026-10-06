<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiError, deletePost, listMyLikedPosts, listMyPosts } from '@/api'
import type { PostDTO } from '@/api'
import { withLikeResult, withoutPost } from '@/utils/dto'
import EmptyState from '@/components/common/EmptyState.vue'
import ListSkeleton from '@/components/common/ListSkeleton.vue'
import PostList from '@/components/post/PostList.vue'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/time'

type Tab = 'posts' | 'liked'

const auth = useAuthStore()

const tab = ref<Tab>('posts')
const posts = ref<PostDTO[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''

  try {
    const result = tab.value === 'posts' ? await listMyPosts() : await listMyLikedPosts()
    posts.value = result.items
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败了，请稍后重试'
    posts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(tab, load)

function onLike(payload: { postId: string; liked: boolean; count: number }) {
  posts.value = withLikeResult(posts.value, payload.postId, payload)

  // 在「我赞过的」里取消点赞，这条就不该继续留在这个列表里
  if (tab.value === 'liked' && !payload.liked) {
    posts.value = withoutPost(posts.value, payload.postId)
  }
}

async function onDelete(id: string) {
  try {
    await ElMessageBox.confirm('删除后这条帖子和它下面的所有评论都会消失，确定吗？', '删除帖子', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deletePost(id)
    posts.value = withoutPost(posts.value, id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '删除失败，请稍后重试')
  }
}
</script>

<template>
  <div class="container">
    <section class="profile card">
      <div class="avatar">{{ auth.username.charAt(0).toUpperCase() || '?' }}</div>
      <div class="identity">
        <h1 class="username">{{ auth.username }}</h1>
        <p class="text-faint tip">
          这是你的登录身份。对外发布的内容不会显示它，只显示按帖子随机生成的假名。
        </p>
        <p v-if="auth.user" class="text-faint joined">
          注册于 {{ formatDate(auth.user.createdAt) }}
        </p>
      </div>
    </section>

    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane label="我的帖子" name="posts" />
      <el-tab-pane label="我赞过的" name="liked" />
    </el-tabs>

    <ListSkeleton v-if="loading" :rows="3" />

    <div v-else-if="error" class="error-box card">
      <p class="error-text">{{ error }}</p>
      <el-button @click="load">重试</el-button>
    </div>

    <EmptyState
      v-else-if="posts.length === 0"
      :text="tab === 'posts' ? '你还没有发过帖子' : '你还没有赞过任何帖子'"
      :hint="tab === 'posts' ? '去写下第一条吧' : '在首页看到喜欢的就点个赞'"
    />

    <PostList
      v-else
      :posts="posts"
      :deletable="tab === 'posts'"
      @like="onLike"
      @delete="onDelete"
    />
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--th-primary);
  color: #fff;
  font-size: 22px;
  font-weight: 600;
}

.identity {
  min-width: 0;
}

.username {
  margin: 0;
  font-size: 18px;
}

.tip,
.joined {
  margin: 4px 0 0;
  font-size: 12px;
}

.tabs {
  margin: 18px 0 12px;
}

.error-box {
  padding: 40px 16px;
  text-align: center;
}

.error-text {
  margin: 0 0 14px;
  color: var(--th-text-soft);
}
</style>
