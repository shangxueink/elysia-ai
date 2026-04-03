
import { Context, Schema } from 'koishi'

export const name = 'elysia-ai-behavior'

export interface Config {
  enableReply: boolean
}

export const Config: Schema<Config> = Schema.object({
  enableReply: Schema.boolean().default(true),
})

export function apply(ctx: Context, config: Config) {
  // 后续在这里挂 behavior 的具体实现
}
