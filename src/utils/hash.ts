/**
 * 一个极小的确定性字符串哈希（FNV-1a 变体）。
 *
 * 用它是因为匿名假名必须满足「同样的输入永远得到同样的输出」，且不需要任何
 * 密码学强度 —— 它只负责生成展示用的假名，不承担任何安全职责。
 * 注意它作用于 UTF-16 code unit，对中文同样稳定。
 */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    // 等价于 h *= 16777619，用 imul 避免 32 位溢出后的精度问题
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** 由哈希派生一个定长的 base36 短串，用作假名后缀。取低位，混合度更好。 */
export function hashSuffix(input: string, length = 4): string {
  return hashString(input).toString(36).padStart(length, '0').slice(-length)
}

/** 把哈希映射到 [0, size) 区间，用于从调色板/词池里取一项。 */
export function hashIndex(input: string, size: number): number {
  if (size <= 0) return 0
  return hashString(input) % size
}
