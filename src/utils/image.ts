/**
 * 图片压缩。全部在浏览器本地完成 —— 这个项目没有后端。
 *
 * **为什么非压不可**：一张手机照片动辄 3~5MB、4000px 宽。原样存进去，
 * 几张就把存储配额吃掉一大块，列表加载也会明显变卡。而网页上根本用不到
 * 4000px —— 压到长边 1600px 之后，体积通常降到 5% 左右，肉眼却看不出差别。
 *
 * 这一层只负责「把 File 变成小一点的 Blob」，不碰存储。
 * 存哪、怎么取，见 src/mock/imageStore.ts。
 */

/**
 * 单张原图的上限。超过这个尺寸基本是选错了文件（比如误选了视频），
 * 与其花时间压缩它，不如直接拒绝并说清楚。
 */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024

/** 每个帖子 / 每条评论最多几张图。 */
export const MAX_IMAGES = 4

/** 压缩后的长边上限（像素）。1600 已超过大多数屏幕的实际显示宽度。 */
const MAX_EDGE = 1600

/** WebP 质量。0.82 是「看不出压缩痕迹」的常见起点。 */
const QUALITY = 0.82

/** createImageBitmap 和 <img> 都能喂给 canvas.drawImage。 */
type Drawable = ImageBitmap | HTMLImageElement

/**
 * 把文件解码成可绘制的东西。
 *
 * 首选 createImageBitmap：它的解码不走主线程，大图不会让界面卡住。
 * 但它对格式更挑，旧版 Safari 上也常失败，所以保留 <img> 这条退路。
 */
async function decode(file: File): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // 落到下面的 <img> 分支
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    // decode() 比 onload 干净：它返回 Promise，失败时直接 reject
    await img.decode()
    return img
  } finally {
    // 解码完成后像素数据已在内存里，这个 URL 可以立刻释放
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片处理失败，请换一张试试'))),
      'image/webp',
      QUALITY,
    )
  })
}

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * 压缩一张图片。
 *
 * 失败时抛出的都是 `Error`，且 message 是**可以直接展示给用户**的中文 ——
 * 调用方拿到后直接 toast 即可，不用再翻译一遍。
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('只能添加图片文件')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`单张图片不能超过 ${formatBytes(MAX_SOURCE_BYTES)}`)
  }

  let source: Drawable
  try {
    source = await decode(file)
  } catch {
    throw new Error('这张图片读不出来，可能已损坏或格式不受支持')
  }

  const sourceWidth = source.width
  const sourceHeight = source.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('这张图片的尺寸异常，无法处理')
  }

  // 只缩小、不放大 —— 小图放大只会变糊，还平白变大
  const scale = Math.min(1, MAX_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持图片处理')

  // 缩小时开启高质量平滑，否则边缘会有明显锯齿
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)

  // ImageBitmap 占的是非托管内存，用完必须显式释放
  if (source instanceof ImageBitmap) source.close()

  return { blob: await toBlob(canvas), width, height }
}

/** 人类可读的体积，用于提示文案。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
