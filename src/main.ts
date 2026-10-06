import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)

// 顺序有讲究：pinia 必须先于 router 安装 —— 路由守卫里会用到 store。
app.use(createPinia())
app.use(router)
// 全量引入而非按需引入：包大一点，但零配置、零 ESLint 冲突。zh-cn 必须显式设置，
// 否则分页器等组件会在满屏中文里冒出英文。
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
