<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ApiError, listPosts } from '@/api'
import type { PostDTO, PostSort } from '@/api'
import { withLikeResult } from '@/utils/dto'
import EmptyState from '@/components/common/EmptyState.vue'
import ListSkeleton from '@/components/common/ListSkeleton.vue'
import PostList from '@/components/post/PostList.vue'

const PAGE_SIZE = 5
const SEARCH_DEBOUNCE_MS = 300

const posts = ref<PostDTO[]>([])
const total = ref(0)
const page = ref(1)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')

const keyword = ref('')
const sort = ref<PostSort>('new')

const hasMore = computed(() => posts.value.length < total.value)
const isSearching = computed(() => keyword.value.trim() !== '')

async function fetchPage(targetPage: number, append: boolean) {
  if (append) loadingMore.value = true
  else loading.value = true
  error.value = ''

  try {
    const result = await listPosts({
      page: targetPage,
      pageSize: PAGE_SIZE,
      keyword: keyword.value,
      sort: sort.value,
    })
    posts.value = append ? [...posts.value, ...result.items] : result.items
    total.value = result.total
    page.value = result.page
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败了，请稍后重试'
    if (!append) {
      posts.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function reload() {
  void fetchPage(1, false)
}

function loadMore() {
  void fetchPage(page.value + 1, true)
}

// 搜索防抖：不加的话每敲一个字就发一次请求，容易出现后到的响应覆盖先到的
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(keyword, () => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  searchTimer = setTimeout(reload, SEARCH_DEBOUNCE_MS)
})

watch(sort, reload)

onMounted(reload)

onBeforeUnmount(() => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
})

function onLike(payload: { postId: string; liked: boolean; count: number }) {
  posts.value = withLikeResult(posts.value, payload.postId, payload)
}
</script>

<template>
  <div class="container">
    <div class="toolbar card">
      <el-input
        v-model="keyword"
        placeholder="搜索帖子标题或内容"
        clearable
        class="search"
        size="large"
      />
      <el-radio-group v-model="sort">
        <el-radio-button value="new">最新</el-radio-button>
        <el-radio-button value="hot">热门</el-radio-button>
      </el-radio-group>
    </div>

    <ListSkeleton v-if="loading" :rows="4" />

    <div v-else-if="error" class="error-box card">
      <p class="error-text">{{ error }}</p>
      <el-button @click="reload">重试</el-button>
    </div>

    <EmptyState
      v-else-if="posts.length === 0"
      :text="isSearching ? '没有找到相关的帖子' : '还没有人发帖'"
      :hint="isSearching ? '换个关键词试试' : '来写下第一条吧'"
    />

    <template v-else>
      <PostList :posts="posts" @like="onLike" />

      <div class="footer">
        <el-button v-if="hasMore" :loading="loadingMore" @click="loadMore">加载更多</el-button>
        <span v-else class="text-faint">已经到底了 · 共 {{ total }} 条</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 14px;
}

.search {
  flex: 1;
}

.error-box {
  padding: 40px 16px;
  text-align: center;
}

.error-text {
  margin: 0 0 14px;
  color: var(--th-text-soft);
}

.footer {
  display: flex;
  justify-content: center;
  padding: 22px 0 0;
  font-size: 13px;
}

@media (max-width: 560px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
