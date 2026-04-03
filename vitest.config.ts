import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // 测试文件匹配规则
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/__tests__/**/*.ts',
      '__tests__/**/*.ts',
    ],
    // 全局 globals（describe / it / expect 不需要 import）
    globals: true,
    // 环境
    environment: 'node',
    // 报告格式
    reporters: ['verbose'],
    // 路径别名，指向源码而非编译产物
    alias: {
      '@elysia-ai/core': resolve(__dirname, 'packages/core/src/index.ts'),
      'koishi-plugin-elysia-ai-runtime': resolve(__dirname, 'packages/runtime/src/runtime.ts'),
      'koishi-plugin-elysia-ai-body': resolve(__dirname, 'packages/body/src/index.ts'),
      // Mock Koishi — 在测试环境中不运行真实 Koishi
      'koishi': resolve(__dirname, '__mocks__/koishi.ts'),
    },
  },
})
