/// <reference types="vite/client" />

/**
 * 不声明这两个变量的话，`import.meta.env.VITE_MOCK_LATENCY_MS` 会直接
 * 报 TS 错误，而报错信息完全不会提示你「需要在这里加个声明」——
 * 是个很常见的卡点。
 */
interface ImportMetaEnv {
  /** mock 层模拟的基准网络延时（毫秒），默认 300。设为 0 可关闭等待。 */
  readonly VITE_MOCK_LATENCY_MS?: string
  /** mock 层默认失败率（0~1），默认 0。演示错误分支时可临时调高。 */
  readonly VITE_MOCK_FAIL_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
