import type { PlatformMessage } from '../types/index.js'
import type { Stimulus } from '@elysia-ai/core'

/**
 * 将 PlatformMessage 转换为 Stimulus
 *
 * 这是 body 层中**唯一**负责 PlatformMessage → Stimulus 转换的函数。
 * 所有平台适配器（KoishiBodyAdapter 等）和 handlePlatformMessage 都必须
 * 通过此函数构造 Stimulus，禁止在其他地方内联构造。
 *
 * habitatId 选取优先级：
 *   guildId（群）> channelId（频道）> userId（私聊）> 'unknown'
 *
 * 设计说明：
 * - type 固定为 'utterance'（用户主动发言）
 * - platform / botId 等元信息放入 payload 供上层感知层使用
 * - 未来如需支持其他 StimulusType（如 system / reaction），应扩展此函数
 *
 * @param message 平台无关的消息对象
 * @returns 系统内部使用的 Stimulus 对象
 */
export function platformMessageToStimulus(message: PlatformMessage): Stimulus {
  return {
    id: message.id,
    type: 'utterance',
    // 生境优先级：群 > 频道 > 私聊 > 未知
    // 这决定了此刺激属于哪个"栖息地"
    habitatId: message.guildId ?? message.channelId ?? message.userId ?? 'unknown',
    actorId: message.userId,
    timestamp: message.timestamp ?? Date.now(),
    payload: {
      content: message.content ?? '',
      // 保留平台元信息，供感知层（perception）解析使用
      platform: message.platform,
      botId: message.botId,
      guildId: message.guildId,
      channelId: message.channelId,
    },
  }
}

/**
 * @deprecated 请使用 platformMessageToStimulus()
 *
 * 此函数已被重命名为 platformMessageToStimulus，名称更准确地反映了
 * 输入来源（PlatformMessage，而非 Session）和转换方向。
 *
 * 保留此别名是为了向后兼容，将在未来版本中移除。
 */
export const sessionToStimulus = platformMessageToStimulus
