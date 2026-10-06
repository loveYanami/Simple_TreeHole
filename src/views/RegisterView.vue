<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApiError } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ username: '', password: '', confirm: '' })
const submitting = ref(false)

async function onSubmit() {
  if (form.username.trim() === '') {
    ElMessage.warning('请填写用户名')
    return
  }
  if (form.password === '') {
    ElMessage.warning('请填写密码')
    return
  }
  if (form.password !== form.confirm) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  submitting.value = true
  try {
    await auth.register(form.username, form.password)
    ElMessage.success('注册成功，已自动登录')
    await router.replace({ name: 'home' })
  } catch (e) {
    ElMessage.error(e instanceof ApiError ? e.message : '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card card">
      <h1 class="auth-title">注册</h1>
      <p class="auth-sub text-faint">
        用户名只用来登录。发帖时对外显示的是一个随机假名，不会暴露你的用户名。
      </p>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" size="large" placeholder="给自己起个名字" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            size="large"
            show-password
            placeholder="密码"
          />
        </el-form-item>

        <el-form-item label="确认密码">
          <el-input
            v-model="form.confirm"
            type="password"
            size="large"
            show-password
            placeholder="再输一次"
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
          注册
        </el-button>
      </el-form>

      <el-alert type="warning" :closable="false" class="warn-tip">
        这是纯前端演示，密码只是做了一层不可逆处理存在浏览器里，挡不住任何人。
        <strong>请不要使用你的真实密码。</strong>
      </el-alert>

      <div class="auth-footer">
        <span class="text-faint">已经有账号了？</span>
        <RouterLink :to="{ name: 'login' }" class="link">去登录</RouterLink>
      </div>
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

.warn-tip {
  margin-top: 18px;
}
</style>
