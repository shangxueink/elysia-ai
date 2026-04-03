
export interface CoreEventMap {
  // Runtime 生命周期事件
  'runtime.starting': { timestamp: number }
  'runtime.started': { timestamp: number }
  'runtime.stopping': { timestamp: number }
  'runtime.stopped': { timestamp: number }

  // Life 实例事件
  'life.loaded': {
    /** 生命体 id */
    lifeId: string
    /** 生命体类型 */
    type: string
    /** 完整的原始配置（供其他插件读取 extensions） */
    config: unknown
  }

  // Stimulus 事件
  'stimulus.received': { stimulusId: string }
  'perception.completed': { stimulusId: string }
  'homeostasis.updated': { lifeInstanceId: string }
  'behavior.selected': { lifeInstanceId: string }
  'dialogue.generated': { lifeInstanceId: string }
}
