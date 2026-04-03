
import { Context, Schema } from 'koishi'
import { createDefaultRuntime, type Runtime } from './runtime.js'
import { loadManifestFromFile } from './manifest/loader.js'

export const name = 'elysia-ai-runtime'

export interface Config {
  /**
   * 生命体实例声明配置文件路径（JSON 格式）
   * 留空则不加载任何预设生命体
   */
  manifestPath?: string
}

export const Config: Schema<Config> = Schema.object({
  manifestPath: Schema.string()
    .description('生命体实例声明配置文件路径（JSON 格式），留空则不加载预设生命体'),
})

export * from './context/index.js'
export * from './runtime.js'
export * from './registry/life-registry.js'
export * from './registry/habitat-registry.js'
export * from './registry/memory-life-registry.js'
export * from './registry/memory-habitat-registry.js'
export * from './scheduler/index.js'
export * from './lifecycle/index.js'
export * from './manifest/index.js'

// 扩展 Context 类型，添加 runtime 属性
declare module 'koishi' {
  interface Context {
    'elysia-ai-runtime'?: Runtime
  }
}

export async function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('elysia-ai-runtime')

  // 创建默认 runtime 实例
  const runtime = createDefaultRuntime()

  // 将 runtime 挂载到 ctx 上，供其他插件使用
  ctx['elysia-ai-runtime'] = runtime

  // 启动 runtime
  try {
    await runtime.start()
    logger.info('Runtime started')
  } catch (error) {
    logger.error('Failed to start runtime:', error)
    return
  }

  // 加载 manifest 配置（如果配置了 manifestPath）
  if (config.manifestPath) {
    try {
      const manifest = await loadManifestFromFile(config.manifestPath)
      await runtime.loadManifest(manifest)
      logger.info(`Loaded ${manifest.lifeInstances.length} life instance(s) from manifest`)
    } catch (error) {
      logger.error('Failed to load manifest:', error)
    }
  }

  // 插件卸载时停止 runtime
  ctx.on('dispose', async () => {
    try {
      await runtime.stop()
      logger.info('Runtime stopped')
    } catch (error) {
      logger.error('Failed to stop runtime:', error)
    }
  })
}
