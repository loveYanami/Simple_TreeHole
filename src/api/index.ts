/**
 * API 层的唯一出口。组件一律从这里 import，不要深入到 api/ 内部的文件。
 *
 * 这一层将来换成真实后端的成本应该很低：只要保持这里的函数签名不变，
 * 把实现从 src/mock 换成 fetch 即可，组件一行都不用改。
 */

export * from './types'
export * from './auth'
export * from './posts'
export * from './comments'

export { ApiError } from '@/mock/delay'
export { resetDb } from '@/mock/db'
export { DEMO_ACCOUNT } from '@/mock/constants'

// 图片的存取。压缩在 utils/image.ts，落库在 mock/imageStore.ts，
// 视图需要「发帖前先把图存好、发帖失败再回滚」的能力，所以从这里透出。
export { clearImages, discardImages, saveImages } from '@/mock/imageStore'
