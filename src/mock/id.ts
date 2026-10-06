/**
 * 生成一个带前缀的 id，例如 `p_m1x9k2f_a3b1c2`。
 *
 * 刻意不用 crypto.randomUUID()：它只在安全上下文（localhost / https）下存在，
 * 在 http://192.168.x.x 这类局域网地址下是 undefined。而「把 preview 构建发给
 * 别人、对方用手机或另一台机器打开」是演示时的常见场景，届时会直接报
 * `crypto.randomUUID is not a function`。
 */
export function nextId(prefix: string): string {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${time}${rand}`
}
