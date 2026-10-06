<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { clearImages, resetDb } from '@/api'

async function onReset() {
  try {
    await ElMessageBox.confirm(
      '会清空你在本地产生的所有数据（注册的账号、发过的帖子、评论、点赞和配图），并恢复到初始状态。确定吗？',
      '重置本地数据',
      { confirmButtonText: '重置', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  resetDb()
  // 图片在 IndexedDB 里，不在 resetDb() 管的那个 localStorage key 下，得单独清
  await clearImages().catch(() => {})
  // 直接刷新最省事：session、内存里的 store 状态、当前页面数据一次性全部回到初始
  window.location.reload()
}

async function onResetAndLogout() {
  ElMessage.info('正在重置…')
  resetDb()
  await clearImages().catch(() => {})
  window.location.hash = '#/'
  window.location.reload()
}
</script>

<template>
  <div class="container">
    <h1 class="page-title">关于这个项目</h1>

    <section class="card block">
      <h2 class="block-title">它是什么</h2>
      <p>
        一个「树洞」环境：任何人都可以匿名发帖、评论和点赞。它<b>没有后端</b>， 所有数据都通过前端的
        Mock 层读写，存在你自己浏览器的 localStorage 里。
      </p>
      <p class="text-soft">
        也就是说：这里看到的一切都只属于你这台机器。换个浏览器、换台设备，或者打开无痕窗口，
        都会看到一份全新的初始数据。
      </p>
    </section>

    <section class="card block">
      <h2 class="block-title">匿名是怎么实现的</h2>
      <p>
        数据里当然记录了作者是谁（否则「我的帖子」就无从查起），但它在传给页面之前 就被剥离了 ——
        对外的数据结构里根本没有这个字段，取而代之的是一个即时算出来的假名。
      </p>
      <p>
        假名由 <code>hash(用户id + 帖子id)</code> 得出，所以：<b>同一条帖子下</b>（含你发的评论）
        假名保持一致，方便对话；<b>跨帖子</b>则完全不同。
      </p>
      <p class="text-soft">
        后面的这一点不是缺陷，而是刻意的 —— 它挡住了「靠昵称把一个人散落各处的发言
        串起来」这种去匿名化手段。你自己不受影响：你的内容上会有一个「我」的标记。
      </p>
    </section>

    <section class="card block">
      <h2 class="block-title">关于安全性</h2>
      <p class="warn">
        这是一个演示环境，<b>不是真实可用的产品</b>。没有任何服务端校验， localStorage
        的内容任何人都能读改，密码只做了形式上的处理。
      </p>
      <p class="warn"><b>请不要在这里使用你任何一处正在使用的真实密码。</b></p>
    </section>

    <section class="card block">
      <h2 class="block-title">数据不受控了？</h2>
      <p class="text-soft">
        如果页面出现异常（比如数据结构调整后残留了旧数据），重置一次即可。 也可以在地址栏访问
        <code>#/?reset=1</code> 达到同样效果。
      </p>
      <div class="actions">
        <el-button type="danger" plain @click="onReset">重置本地数据</el-button>
        <el-button v-if="$route.name !== 'home'" @click="onResetAndLogout"
          >重置并回到首页</el-button
        >
      </div>
    </section>
  </div>
</template>

<style scoped>
.block {
  padding: 22px;
  margin-bottom: 14px;
}

.block-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}

.block p {
  margin: 0 0 10px;
  line-height: 1.85;
}

.block p:last-child {
  margin-bottom: 0;
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--th-bg);
  font-size: 12.5px;
}

.warn {
  color: #b0402f;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
</style>
