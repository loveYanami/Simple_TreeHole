<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError, DEMO_ACCOUNT } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/**
 * 预填演示账号。就这一个细节，能消掉大部分「我 clone 下来跑不起来」的反馈 ——
 * 评审不需要先去 README 里翻账号密码。
 */
const form = reactive({
  username: DEMO_ACCOUNT.username,
  password: DEMO_ACCOUNT.password,
})

const submitting = ref(false)

async function onSubmit() {
  submitting.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')

    const redirect = route.query.redirect
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      await router.replace(redirect)
    } else {
      await router.replace({ name: 'home' })
    }
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <h1 class="auth-title">登录</h1>
      <p class="auth-sub text-faint">这里是一个纯前端演示环境，账号只存在你自己的浏览器里</p>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" size="large" placeholder="用户名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            size="large"
            show-password
            placeholder="密码"
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="submit"
          :loading="submitting"
          @click="onSubmit"
        >
          登录
        </el-button>
      </el-form>

      <div class="auth-footer">
        <span class="text-faint">还没有账号？</span>
        <RouterLink :to="{ name: 'register' }" class="link">去注册</RouterLink>
      </div>

      <el-alert type="info" :closable="false" class="demo-tip">
        演示账号已预填：<strong>{{ DEMO_ACCOUNT.username }}</strong> /
        <strong>{{ DEMO_ACCOUNT.password }}</strong>
      </el-alert>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding-top: 32px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 28px;
}

.auth-title {
  margin: 0;
  font-size: 20px;
}

.auth-sub {
  margin: 6px 0 22px;
  font-size: 12px;
}

.submit {
  width: 100%;
}

.auth-footer {
  margin-top: 16px;
  font-size: 13px;
  text-align: center;
}

.link {
  color: var(--th-primary);
  margin-left: 4px;
}

.demo-tip {
  margin-top: 18px;
}
</style>
