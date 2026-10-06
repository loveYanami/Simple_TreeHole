import type { Comment, Db, Post, User } from '@/types/models'
import { DEMO_ACCOUNT, SCHEMA_VERSION } from './constants'
import { hashPassword } from './password'

/**
 * 种子数据。
 *
 * 两条原则：
 * 1. 文案固定 —— 演示和截图每次看到的都一样，不会因为随机生成而「这次怎么没那条」。
 * 2. 时间戳是相对当前时间算的 —— 信息流永远显得是活的，而不是一片「1970年」。
 */

const HOUR = 3600 * 1000

function iso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * HOUR).toISOString()
}

const USERS: Array<{ id: string; username: string; password: string; hoursAgo: number }> = [
  { id: 'u_demo', username: 'demo', password: DEMO_ACCOUNT.password, hoursAgo: 24 * 30 },
  { id: 'u_sakura', username: 'sakura', password: 'sakura123', hoursAgo: 24 * 21 },
  { id: 'u_yuki', username: 'yuki', password: 'yuki1234', hoursAgo: 24 * 14 },
]

interface PostSeed {
  author: string
  title: string
  content: string
  hoursAgo: number
  likedBy: string[]
}

const POST_SEEDS: PostSeed[] = [
  {
    author: 'u_sakura',
    title: '第一次在树洞发帖，有点紧张',
    content:
      '关注这个板块很久了，一直只看不发。今天终于鼓起勇气。\n\n其实也没什么大事，就是想找个没人认识我的地方说说话。',
    hoursAgo: 3,
    likedBy: ['u_yuki', 'u_demo'],
  },
  {
    author: 'u_yuki',
    title: '图书馆四楼靠窗的位置真的会让人静下来',
    content: '下午三点的光斜着照进来，桌上摊着书，一坐就是四个小时。推荐给最近静不下心的人。',
    hoursAgo: 7,
    likedBy: ['u_sakura'],
  },
  {
    author: 'u_demo',
    title: '期末周的焦虑，有没有人和我一样',
    content:
      '明明开始复习了，但一想到还有那么多没看就整个人僵住，然后什么都做不进去。\n\n恶性循环。',
    hoursAgo: 12,
    likedBy: ['u_sakura', 'u_yuki'],
  },
  {
    author: 'u_sakura',
    title: '今天食堂阿姨多给了我一个鸡腿',
    content: '啥也没说，就是多夹了一个。开心了一整天。',
    hoursAgo: 20,
    likedBy: ['u_demo'],
  },
  {
    author: 'u_yuki',
    title: '关于喜欢的东西，想说几句',
    content:
      '喜欢一件在别人看来「没什么用」的事情，是不需要向任何人解释的。\n\n它让你在很累的时候还愿意睁开眼睛，这就够了。',
    hoursAgo: 28,
    likedBy: ['u_demo', 'u_sakura'],
  },
  {
    author: 'u_demo',
    title: '想学的方向太多了，反而什么都学不进去',
    content: '前端、算法、游戏开发……每个都觉得有意思，每个都开了个头就断了。有点挫败。',
    hoursAgo: 40,
    likedBy: [],
  },
  {
    author: 'u_sakura',
    title: '室友半夜打游戏，我该怎么办',
    content: '已经连续一周了，凌晨两点还在开麦。不想把关系搞僵，但我也要早起。',
    hoursAgo: 52,
    likedBy: ['u_yuki'],
  },
  {
    author: 'u_yuki',
    title: '一个人吃饭真的有那么奇怪吗',
    content: '每次一个人去食堂都感觉有人在看我。后来想想，可能根本没人注意。',
    hoursAgo: 66,
    likedBy: ['u_sakura', 'u_demo'],
  },
  {
    author: 'u_demo',
    title: '记一次很失败的社团面试',
    content:
      '准备了两周，进去五分钟就出来了。面试官问的问题我一句都没答上来，全程大脑空白。\n\n现在想起来还是很难受。',
    hoursAgo: 80,
    likedBy: [],
  },
  {
    author: 'u_sakura',
    title: '给三年后的自己写一封信',
    content: '不知道你还在不在这个城市，有没有变成自己想成为的人。希望你至少比现在勇敢一点。',
    hoursAgo: 100,
    likedBy: ['u_yuki'],
  },
  {
    author: 'u_yuki',
    title: '最近在自学前端，记录一下',
    content:
      '从 HTML 开始，现在能写一点简单的页面了。第一次看到自己写的代码在浏览器里跑起来的时候，还挺感动的。',
    hoursAgo: 130,
    likedBy: ['u_demo'],
  },
  {
    author: 'u_demo',
    title: '深夜 emo，但明天还要早起',
    content: '没什么具体原因，就是突然觉得有点累。写下来好像就好一点了。',
    hoursAgo: 160,
    likedBy: ['u_sakura'],
  },
]

interface CommentSeed {
  /** 1-based，对应 POST_SEEDS 的下标 + 1 */
  post: number
  author: string
  content: string
  hoursAgo: number
}

const COMMENT_SEEDS: CommentSeed[] = [
  // 第 1 帖：注意 u_sakura 既是楼主也在这里评论 —— 用来验证「同一帖子内假名一致」
  { post: 1, author: 'u_yuki', content: '欢迎欢迎，这里没什么规矩，想说就说。', hoursAgo: 2.5 },
  {
    post: 1,
    author: 'u_sakura',
    content: '谢谢！那我就不客气了，其实就是想找个地方碎碎念。',
    hoursAgo: 2,
  },
  { post: 1, author: 'u_demo', content: '紧张什么，这里没人认识你。', hoursAgo: 1.2 },

  { post: 2, author: 'u_sakura', content: '四楼靠窗 +1，下午的光特别好。', hoursAgo: 6 },
  { post: 2, author: 'u_demo', content: '我一般都去三楼，四楼太难抢了。', hoursAgo: 5 },

  {
    post: 3,
    author: 'u_yuki',
    content: '抱抱，我也是。列个清单会好一点，至少知道要做什么。',
    hoursAgo: 11,
  },
  {
    post: 3,
    author: 'u_sakura',
    content: '同焦虑。我最近在用的办法是把任务切到「小到不可能失败」为止。',
    hoursAgo: 10,
  },
  { post: 3, author: 'u_demo', content: '谢谢你们，我试试。', hoursAgo: 9 },

  { post: 4, author: 'u_demo', content: '阿姨的善意是会传染一整天的那种。', hoursAgo: 19 },
  { post: 4, author: 'u_yuki', content: '这种小事真的能开心很久。', hoursAgo: 18 },

  {
    post: 5,
    author: 'u_demo',
    content: '写得好。喜欢一件事不需要理由，也不用向谁证明。',
    hoursAgo: 27,
  },
  {
    post: 5,
    author: 'u_sakura',
    content: '同感，有时候就是需要一个稳定的情绪出口。',
    hoursAgo: 26,
  },

  {
    post: 6,
    author: 'u_sakura',
    content: '这个我太懂了。挑一个先做三个月，别贪多。',
    hoursAgo: 39,
  },
  {
    post: 6,
    author: 'u_yuki',
    content: '「什么都想学」往往是因为还没找到真正喜欢的那个。',
    hoursAgo: 38,
  },

  {
    post: 7,
    author: 'u_yuki',
    content: '先沟通，直接说。很多人自己意识不到声音有多大。',
    hoursAgo: 50,
  },
  { post: 7, author: 'u_demo', content: '耳塞先备一副，救急用。', hoursAgo: 48 },

  {
    post: 8,
    author: 'u_sakura',
    content: '不奇怪。一个人吃饭效率还高，想吃什么吃什么。',
    hoursAgo: 64,
  },
  { post: 8, author: 'u_demo', content: '一个人吃火锅才是真的需要勇气，我试过。', hoursAgo: 63 },
  { post: 8, author: 'u_yuki', content: '楼上笑死，下次我也试试。', hoursAgo: 62 },

  { post: 9, author: 'u_sakura', content: '失败一次而已，面试本来就是概率游戏。', hoursAgo: 78 },
  { post: 9, author: 'u_yuki', content: '能去面试就已经比大多数人强了。', hoursAgo: 76 },

  { post: 10, author: 'u_yuki', content: '这个我想抄作业，今晚就写。', hoursAgo: 98 },
  {
    post: 10,
    author: 'u_demo',
    content: '三年后看到这封信的人，一定会感谢现在写它的你。',
    hoursAgo: 95,
  },

  {
    post: 11,
    author: 'u_demo',
    content: '加油！前端上手快，但后面的坑也多，坚持住。',
    hoursAgo: 128,
  },
  { post: 11, author: 'u_sakura', content: '一起学，我也在折腾这个。', hoursAgo: 120 },

  { post: 12, author: 'u_sakura', content: '早点睡，明天的事明天再想。', hoursAgo: 158 },
  {
    post: 12,
    author: 'u_yuki',
    content: 'emo 就 emo 一会儿，然后去睡觉，会好很多。',
    hoursAgo: 156,
  },
]

function postId(index1Based: number): string {
  return `p_${String(index1Based).padStart(3, '0')}`
}

/** 构造一份全新的种子数据库。每次调用都会重算时间戳，所以信息流看起来永远是新的。 */
export function buildSeed(): Db {
  const users: User[] = USERS.map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: hashPassword(u.password),
    createdAt: iso(u.hoursAgo),
  }))

  const posts: Post[] = POST_SEEDS.map((p, i) => ({
    id: postId(i + 1),
    authorId: p.author,
    title: p.title,
    content: p.content,
    createdAt: iso(p.hoursAgo),
    likedBy: [...p.likedBy],
    // 种子数据不带图：图片是二进制，没法在同步的播种流程里生成。
    // 想看效果就自己发一条带图的帖子。
    imageIds: [],
  }))

  const comments: Comment[] = COMMENT_SEEDS.map((c, i) => ({
    id: `c_${String(i + 1).padStart(3, '0')}`,
    postId: postId(c.post),
    authorId: c.author,
    content: c.content,
    createdAt: iso(c.hoursAgo),
    imageIds: [],
  }))

  return { version: SCHEMA_VERSION, users, posts, comments }
}
