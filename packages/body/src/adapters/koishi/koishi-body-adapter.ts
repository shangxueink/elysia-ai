import type { Context } from 'koishi'
import type { Runtime } from 'koishi-plugin-elysia-ai-runtime'
import { sessionToPlatformMessage } from './session-to-platform-message.js'
import { platformMessageToStimulus } from '../../normalize/session-to-stimulus.js'

/**
 * KoishiBodyAdapter 配置
 */
export interface KoishiBodyAdapterConfig {
  // 配置项可以后续扩展
}

/**
 * Koishi 适配器
 * 负责监听 Koishi 消息并转发到 Elysia A.I. runtime。
 *
 * 职责边界（来自项目设计文档 §7.3）：
 * - 只负责"接世界"：Koishi session → PlatformMessage → Stimulus → runtime
 * - 不做任何行为判断（要不要回复、用户关系等）
 * - Stimulus 构造统一通过 platformMessageToStimulus() 函数，禁止内联
 */
export class KoishiBodyAdapter {
  private disposables: (() => void)[] = []

  constructor(
    private ctx: Context,
    private runtime: Runtime,
    private config: KoishiBodyAdapterConfig = {}
  ) {}

  /**
   * 注册消息监听
   */
  registerListeners(): void {
    // 监听所有消息
    const dispose = this.ctx.on('message', async (session) => {
      try {
        // Step 1: Koishi session → 平台无关消息
        const platformMessage = sessionToPlatformMessage(session)
        
        // Step 2: 平台无关消息 → 系统内部刺激（统一转换入口）
        const stimulus = platformMessageToStimulus(platformMessage)
        
        // Step 3: 将刺激注入 runtime
        await this.runtime.receiveStimulus(stimulus)
      } catch (error) {
        this.ctx.logger('elysia-ai-body').error('Error handling message:', error)
      }
    })

    this.disposables.push(dispose)
  }

  /**
   * 移除消息监听
   */
  removeListeners(): void {
    for (const dispose of this.disposables) {
      dispose()
    }
    this.disposables = []
  }
}
