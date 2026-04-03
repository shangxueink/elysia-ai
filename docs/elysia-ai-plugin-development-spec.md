# Elysia A.I. 插件开发规范

## 文档用途

本文档用于规范 **Elysia A.I.** 生态中所有插件的开发标准，包括官方主包插件和第三方扩展插件。

它的目标是：

- 让插件开发者有统一的入口和规则可遵循
- 让官方主系统可以对插件进行可靠的装配与校验
- 让生态中不同插件之间不会相互冲突
- 让运行时可以追踪和解释每个插件的行为

任何接入 Elysia A.I. 系统的插件，都必须遵守本文档所定义的规范。

---

## 1. 什么是插件

在 Elysia A.I. 语境下，插件是指：

> 任何向系统生命周期的某一层注入行为、能力或配置的扩展单元。

插件可以是：

- **官方生命层主插件**：如 `@elysia-ai/perception`、`@elysia-ai/behavior`
- **官方能力扩展**：如 `@elysia-ai/brain-openai`
- **第三方插件**：如自定义人格注入器、自定义记忆策略、自定义感知过滤器
- **社区配套工具**：如配置生成器、调试工具、角色模板库

插件不是系统的"控制者"，而是系统"生命流水线"上的"能力扩展点"。

---

## 2. 插件命名规范

### 2.1 官方插件命名

所有官方插件使用 scoped package 格式：

```
@elysia-ai/<name>
```

示例：
- `@elysia-ai/core`
- `@elysia-ai/runtime`
- `@elysia-ai/body`
- `@elysia-ai/perception`
- `@elysia-ai/brain-openai`

### 2.2 第三方插件命名

第三方插件建议使用反向域名格式，或带作者/组织前缀的格式：

```
<reverse-domain>.<name>
```

或：

```
elysia-plugin-<name>
```

示例：
- `com.example.persona-extension`
- `elysia-plugin-weather-tool`

### 2.3 配置命名空间命名

每个插件在配置文件的 `extensions` 区块内，必须使用自己的独立命名空间，命名规则与包名保持一致：

```json
{
  "extensions": {
    "@elysia-ai/persona": { ... },
    "com.example.my-plugin": { ... }
  }
}
```

**禁止将配置字段平铺到顶层**，必须放在 `extensions[namespace]` 内。

---

## 3. Plugin Manifest 标准

每个插件都必须提供一个 `manifest`，用于向 runtime 声明自己的身份和能力。

### 3.1 Manifest 结构

```ts
interface ElysiaPluginManifest {
  // 插件唯一名称
  name: string

  // 插件版本（semver）
  version: string

  // 声明此插件兼容的 core API 版本范围（semver range）
  coreApiVersion: string

  // 插件所属的生命层
  layer: ElysiaLayer

  // 插件在 extensions 中使用的配置命名空间
  configNamespace: string

  // 此插件会消费的事件列表
  consumesEvents?: string[]

  // 此插件会产出的事件列表
  producesEvents?: string[]

  // 依赖的其他插件列表
  dependencies?: string[]

  // 插件执行优先级（数值越小越先执行，默认 100）
  priority?: number

  // 插件声明的可选能力标签
  capabilities?: string[]
}
```

### 3.2 生命层（ElysiaLayer）取值

```ts
type ElysiaLayer =
  | 'body'
  | 'perception'
  | 'homeostasis'
  | 'cognition'
  | 'persona'
  | 'behavior'
  | 'dialogue'
  | 'runtime'
  | 'observatory'
  | 'brain'
  | 'model-gateway'
  | 'extension'   // 通用扩展，不属于特定生命层
```

### 3.3 Manifest 最小示例

```ts
const manifest: ElysiaPluginManifest = {
  name: '@elysia-ai/perception',
  version: '0.1.0',
  coreApiVersion: '^0.1.0',
  layer: 'perception',
  configNamespace: '@elysia-ai/perception',
  consumesEvents: ['stimulus.received'],
  producesEvents: ['perception.completed'],
}
```

---

## 4. 配置扩展标准

生命体实例配置文件采用 JSON 格式，结构如下：

### 4.1 配置文件顶层结构

```json
{
  "version": "1.0",
  "lifeInstances": [
    {
      "id": "elysia-main",
      "type": "elysia-default",
      "enabled": true,
      "meta": {
        "displayName": "Elysia"
      },
      "extensions": {
        "@elysia-ai/persona": { ... },
        "@elysia-ai/dialogue": { ... },
        "com.example.plugin": { ... }
      }
    }
  ]
}
```

### 4.2 核心字段说明（不可被插件覆盖）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 生命体唯一标识 |
| `type` | string | 是 | 生命体类型，用于插件识别 |
| `enabled` | boolean | 否 | 是否启用，默认 true |
| `meta` | object | 否 | 通用元信息，供 runtime 和 observatory 使用 |
| `extensions` | object | 否 | 插件扩展配置区，按命名空间隔离 |

### 4.3 配置扩展规则

- 每个插件只能读取 `extensions[自己的configNamespace]` 中的配置
- 不允许读取其他插件命名空间的配置
- 不允许把扩展字段平铺到顶层

---

## 5. Pipeline 注入标准

Elysia A.I. 的生命处理流程是一条流水线。  
每个处理阶段（perception/homeostasis/behavior/...）都可以向后续阶段传递扩展信息。

### 5.1 统一容器（PipelineContext）

所有插件在流水线中通过统一容器读写数据：

```ts
interface PipelineContext<TCore = unknown> {
  // 核心数据区（只读或受限）
  core: TCore

  // 扩展数据区（按插件命名空间写入）
  ext: Record<string, Record<string, unknown>>

  // 操作追踪区（自动填充，不需要手动写入）
  trace: Array<{
    plugin: string    // 写入操作的插件名
    stage: string     // 操作发生的处理阶段
    action: string    // 操作描述
    at: number        // 时间戳
  }>
}
```

### 5.2 注入规则

- 插件只能往 `ctx.ext[自己的configNamespace]` 写入
- 禁止直接修改 `ctx.core` 的核心字段（除非 runtime 明确授权 mutate 权限）
- 禁止写入其他插件命名空间的扩展区

### 5.3 读取规则

- 读取自己写入的扩展数据：`ctx.ext['@elysia-ai/my-plugin']`
- 读取核心数据：`ctx.core.stimulus`、`ctx.core.life` 等
- 下游插件可以读取任意上游插件的 ext 数据（但不能修改）

---

## 6. Hook 注册标准

插件通过注册 hook 来参与生命流水线的处理过程。

### 6.1 Hook 接口

```ts
interface ElysiaPluginHook<T = unknown> {
  // 此 hook 挂载的处理阶段
  stage: string

  // hook 执行函数
  run(ctx: PipelineContext<T>): Promise<void> | void
}
```

### 6.2 可用的处理阶段（stage）

| stage | 触发时机 |
|-------|----------|
| `body.message.normalized` | body 层完成消息标准化后 |
| `stimulus.received` | runtime 收到 stimulus 后 |
| `perception.filter` | perception 做注意力筛选时 |
| `perception.completed` | perception 完成后 |
| `homeostasis.tick` | homeostasis 每次状态更新时 |
| `homeostasis.updated` | homeostasis 完成更新后 |
| `cognition.reasoning` | cognition 推理过程中 |
| `cognition.completed` | cognition 完成推理后 |
| `behavior.candidates` | behavior 生成候选行为时 |
| `behavior.selected` | behavior 选定行为后 |
| `dialogue.before.render` | dialogue 渲染前 |
| `dialogue.after.render` | dialogue 渲染完成后 |

---

## 7. 冲突与兼容标准

### 7.1 冲突处理策略

当多个插件在同一阶段操作同一类型数据时，默认行为如下：

- 每个插件写入自己的 namespace，**天然不冲突**
- 如果需要影响核心对象，必须通过 runtime 提供的 mutate API，且需要声明意图

### 7.2 版本兼容规则

- 插件 manifest 中必须声明 `coreApiVersion`
- runtime 在装配时校验兼容性：
  - 不兼容：拒绝加载，记录错误
  - 兼容：正常加载

### 7.3 弃用周期规则

- 当 core API 中某个接口需要变更时，至少保留一个小版本周期的兼容期
- 在兼容期内，同时支持新旧接口，旧接口打 deprecation warning
- 兼容期结束后，才移除旧接口

---

## 8. 开发者检查清单

开发一个 Elysia A.I. 插件时，请在发布前完成以下检查：

### 必须项
- [ ] 提供了 `ElysiaPluginManifest`
- [ ] `name` 符合命名规范
- [ ] `coreApiVersion` 已声明
- [ ] `layer` 已声明
- [ ] `configNamespace` 已声明，且与包名一致
- [ ] 所有配置只放在 `extensions[configNamespace]` 下
- [ ] hook 的 `ext` 写入只使用自己的 namespace
- [ ] 没有直接修改 `ctx.core` 的核心字段

### 推荐项
- [ ] 提供了 `consumesEvents` 和 `producesEvents` 声明
- [ ] 提供了 TypeScript 类型定义
- [ ] 提供了最小测试用例
- [ ] 提供了 README 说明

---

## 9. 官方插件目录

当前官方插件树及其命名空间：

| 插件 | 包名 | 配置命名空间 | 所属层 |
|------|------|-------------|--------|
| 核心协议 | `@elysia-ai/core` | - | - |
| 运行时 | `@elysia-ai/runtime` | - | runtime |
| 躯体层 | `@elysia-ai/body` | `@elysia-ai/body` | body |
| 感知层 | `@elysia-ai/perception` | `@elysia-ai/perception` | perception |
| 内稳态层 | `@elysia-ai/homeostasis` | `@elysia-ai/homeostasis` | homeostasis |
| 认知层 | `@elysia-ai/cognition` | `@elysia-ai/cognition` | cognition |
| 人格层 | `@elysia-ai/persona` | `@elysia-ai/persona` | persona |
| 行为层 | `@elysia-ai/behavior` | `@elysia-ai/behavior` | behavior |
| 表达层 | `@elysia-ai/dialogue` | `@elysia-ai/dialogue` | dialogue |
| 观察层 | `@elysia-ai/observatory` | `@elysia-ai/observatory` | observatory |
| OpenAI 大脑 | `@elysia-ai/brain-openai` | `@elysia-ai/brain-openai` | brain |
| Gemini 大脑 | `@elysia-ai/brain-gemini` | `@elysia-ai/brain-gemini` | brain |
| Claude 大脑 | `@elysia-ai/brain-claude` | `@elysia-ai/brain-claude` | brain |
| 通用兼容大脑 | `@elysia-ai/brain-openai-compatible` | `@elysia-ai/brain-openai-compatible` | brain |

---

## 10. 与项目顶层设计的关系

本文档是 `elysia-ai-top-level-design.md` 中"扩展协议与开发生态"设计原则的具体落地。

顶层设计文档负责说明"为什么要这样设计"，本文档负责说明"开发者应该怎么做"。

两份文档需要保持同步，任何一方的重大变更都应同步更新另一方。
