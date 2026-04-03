import type { Stimulus } from '@elysia-ai/core'
import { MemoryEventBus } from '@elysia-ai/core'
import type { CoreEventMap } from '@elysia-ai/core'
import type { RuntimeContext } from './context/index.js'
import type { LifeRegistry } from './registry/life-registry.js'
import type { HabitatRegistry } from './registry/habitat-registry.js'
import { MemoryLifeRegistry } from './registry/memory-life-registry.js'
import { MemoryHabitatRegistry } from './registry/memory-habitat-registry.js'
import type { Lifecycle, LifecycleState } from './lifecycle/index.js'
import { MinimalLifecycle } from './lifecycle/minimal-lifecycle.js'
import type { ManifestConfig, LifeInstanceConfig } from './manifest/types.js'

/**
 * 从生命体实例配置中解析显示名称
 *
 * 优先级：meta.name > id
 * 使用独立函数是为了让逻辑明确可测，避免内联 `as string` 转换隐藏类型问题
 *
 * @param instance 生命体实例配置
 * @returns 解析后的显示名称
 */
function resolveLifeName(instance: LifeInstanceConfig): string {
  const metaName = instance.meta?.['name']
  if (typeof metaName === 'string' && metaName.length > 0) {
    return metaName
  }
  return instance.id
}

export interface Runtime {
  context: RuntimeContext
  lifeRegistry: LifeRegistry
  habitatRegistry: HabitatRegistry
  lifecycle: Lifecycle

  start(): Promise<void>
  stop(): Promise<void>
  getState(): LifecycleState
  
  receiveStimulus(stimulus: Stimulus): Promise<void>
  
  /**
   * 从 ManifestConfig 加载生命体实例
   * 将所有 enabled 的 lifeInstance 注册到 lifeRegistry
   * 并对每个实例发出 life.loaded 事件
   */
  loadManifest(config: ManifestConfig): Promise<void>
}

export class DefaultRuntime implements Runtime {
  constructor(
    public context: RuntimeContext,
    public lifeRegistry: LifeRegistry,
    public habitatRegistry: HabitatRegistry,
    public lifecycle: Lifecycle
  ) {}

  async start(): Promise<void> {
    await this.lifecycle.start()
  }

  async stop(): Promise<void> {
    // 幂等保护：已停止时静默返回，不抛出错误
    // 这允许外层代码（如 Koishi dispose 事件）安全地多次调用 stop()
    if (this.lifecycle.getState() === 'stopped' || this.lifecycle.getState() === 'idle') {
      return
    }
    await this.lifecycle.stop()
  }

  getState(): LifecycleState {
    return this.lifecycle.getState()
  }

  async receiveStimulus(stimulus: Stimulus): Promise<void> {
    if (!this.lifecycle.isRunning()) {
      // Runtime 未启动时，忽略 stimulus
      // 这是正常行为，不需要报错，调用方无需判断 runtime 状态
      return
    }

    // 发出 stimulus.received 事件，让所有已注册的监听器处理此刺激
    // TODO(Phase 2)：在这里实现 life routing 逻辑
    // 未来需要根据 stimulus.habitatId 确定哪些生命体能感知到此刺激，
    // 并在 stimulus 或事件 payload 中附加目标生命体 id 列表，
    // 让 behavior / cognition 等层知道要处理哪个生命体的响应。
    await this.context.eventBus.emit('stimulus.received', {
      stimulusId: stimulus.id,
    })
  }

  async loadManifest(config: ManifestConfig): Promise<void> {
    // 注意：当前实现允许在 runtime 未启动时调用 loadManifest()
    // 这是有意为之的设计选择：允许在 start() 之前预加载配置
    // 如果需要强制要求在 running 状态下才能加载，可以在此处添加检查：
    //   if (!this.lifecycle.isRunning()) throw new Error('...')
    // 目前保持宽松策略，方便初始化流程中先加载配置再启动

    const now = Date.now()
    for (const instance of config.lifeInstances) {
      // 跳过 disabled 的实例
      if (instance.enabled === false) continue

      // 按 LifeInstance 接口构造
      // 注意：LifeInstance.name 从 meta.name 获取，不存在时回退为 id
      // instance.type 和 extensions 保存到 metadata 中，供其他插件通过 life.loaded 事件读取
      const lifeName = resolveLifeName(instance)
      this.lifeRegistry.register({
        id: instance.id,
        name: lifeName,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        metadata: {
          type: instance.type,
          extensions: instance.extensions,
          ...instance.meta,
        },
      })

      // 发出 life.loaded 事件，供其他插件监听并处理 extensions 配置
      await this.context.eventBus.emit('life.loaded', {
        lifeId: instance.id,
        type: instance.type,
        config: instance,
      })
    }
  }
}

export function createDefaultRuntime(): Runtime {
  const eventBus = new MemoryEventBus<CoreEventMap>()
  const context: RuntimeContext = {
    eventBus,
  }

  const lifeRegistry = new MemoryLifeRegistry()
  const habitatRegistry = new MemoryHabitatRegistry()
  const lifecycle = new MinimalLifecycle(eventBus)

  return new DefaultRuntime(context, lifeRegistry, habitatRegistry, lifecycle)
}
