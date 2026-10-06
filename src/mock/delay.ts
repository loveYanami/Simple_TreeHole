import { CHAOS_KEY } from './constants'

/** mock 层抛出的错误。组件据此拿到可直接展示的文案。 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function readNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** 基准延时（毫秒）。可在 .env.local 里改 VITE_MOCK_LATENCY_MS=0 关掉等待。 */
const LATENCY_MS = readNumber(import.meta.env.VITE_MOCK_LATENCY_MS, 300)

/** 默认失败率。刻意默认为 0 —— 演示和评审时不该撞上随机失败。 */
const ENV_FAIL_RATE = readNumber(import.meta.env.VITE_MOCK_FAIL_RATE, 0)

/**
 * 演示用的故障注入。在控制台执行下面这行再刷新，即可注入 30% 的失败率，
 * 用来展示「错误分支是写了的」：
 *   localStorage.setItem('treehole:chaos', '0.3')
 */
function chaosFailRate(): number {
  try {
    const raw = localStorage.getItem(CHAOS_KEY)
    return raw === null ? 0 : readNumber(raw, 0)
  } catch {
    return 0
  }
}

export interface SimulateOptions {
  /** 覆盖基准延时（毫秒）。 */
  ms?: number
  /** 覆盖失败率（0~1）。 */
  failRate?: number
  /** 失败时抛出的文案。 */
  failWith?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 模拟一次网络往返：先等待，再执行。
 *
 * 只接受 thunk（() => T）而不接受裸值，是刻意的 —— 写操作要等到「延时之后」
 * 才真正改库，这才是对真实请求的诚实模拟，也避免了一类「延时期间数据已被别的
 * 调用改掉」的时序 bug。顺带还规避了 TS 在 `T | (() => T)` 这种联合签名上的
 * 推断歧义。
 */
export async function simulate<T>(thunk: () => T, options: SimulateOptions = {}): Promise<T> {
  const base = options.ms ?? LATENCY_MS
  if (base > 0) {
    // 加一点抖动，让列表加载的节奏不那么机械
    const jitter = Math.floor(Math.random() * base * 0.4)
    await sleep(base * 0.6 + jitter)
  }

  const failRate = options.failRate ?? Math.max(ENV_FAIL_RATE, chaosFailRate())
  if (failRate > 0 && Math.random() < failRate) {
    throw new ApiError(options.failWith ?? '网络开小差了，请稍后重试', 'MOCK_NETWORK')
  }

  return thunk()
}
