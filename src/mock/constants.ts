/** 本地存储的 key。整个 mock 数据库存在单个 key 下，一次写、一个 key 就能重置。 */
export const DB_KEY = 'treehole:db:v1'

/** 登录会话的 key。只允许 src/mock/session.ts 写入它。 */
export const SESSION_KEY = 'treehole:session:v1'

/** 演示用的故障注入开关（值为 0~1 的失败率）。见 src/mock/delay.ts。 */
export const CHAOS_KEY = 'treehole:chaos'

/**
 * 演示账号。README 里会写明，登录页会预填。
 *
 * 放在这里而不是 seed.ts，是因为登录页也要用它 —— 视图不该深入 mock 内部，
 * 但「演示账号」本来就是这个 mock 的产物，所以由 mock 层统一持有最诚实。
 */
export const DEMO_ACCOUNT = { username: 'demo', password: 'demo1234' } as const

/**
 * 数据结构版本。
 *
 * ⚠️ 每次改动 src/types/models.ts 里的实体结构（增删字段）都必须把这个数字 +1。
 *
 * 不 +1 的后果是这样的：浏览器里还存着旧结构的数据，某处读到 undefined，
 * 页面白屏 —— 而无痕模式打开却一切正常，这个反差会把人引向完全错误的排查方向。
 * 版本不匹配时自动重新播种，是最省事的兜底。
 */
export const SCHEMA_VERSION = 2
