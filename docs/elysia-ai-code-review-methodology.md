# Elysia A.I. 代码审查与优化分析方法论

## 文档用途

本文档记录了 **Elysia A.I.** 项目的系统性代码审查方法。

每次需要对项目代码进行以下工作时，都应使用本方法：

- 发现并修复 Bug
- 提升代码可读性
- 优化代码结构与分层
- 确保代码实现与项目设计原则对齐

本方法不是"凭感觉找问题"，而是结构化地从多个维度系统扫描代码，保证分析结果完整且不遗漏。

---

## 一、分析维度定义

代码审查需要从以下五个维度逐一分析，每个维度关注不同层面的问题。

---

### 维度 1：正确性（Correctness）

> 代码是否在所有预期场景下都正确运行？

扫描时关注：

- 状态机的合法转换是否完整覆盖？（尤其是并发和异步场景）
- 异步流程是否存在竞争条件（race condition）？
- 边界输入（空值、空数组、undefined）是否会导致 crash 或 undefined 行为？
- 函数的 contract（输入输出承诺）是否被实现层真正满足？
- 接口类型与实现类型是否真正对齐？
- 错误路径是否被正确处理，还是被静默忽略？

---

### 维度 2：健壮性（Robustness）

> 代码在非预期输入或异常状态下是否能优雅降级？

扫描时关注：

- 函数对 `undefined` / `null` 的处理是否明确？
- 错误消息是否携带足够的上下文信息（位置、字段名、当前状态）？
- 操作失败时是否有恢复路径，还是会让系统进入不可恢复状态？
- 幂等性：重复调用同一操作是否安全？
- 错误处理风格是否一致（throw / return / log）？

---

### 维度 3：可读性（Readability）

> 代码是否让下一个开发者（包括未来的自己）容易理解意图？

扫描时关注：

- 函数名、变量名、类名是否准确反映其语义？
- 复杂逻辑（尤其是状态转移、多条件判断）是否有注释说明"为什么"？
- 内联逻辑是否应该提取为有意义的命名函数？
- 是否存在"魔法值"（字符串字面量、数字），应该提取为命名常量？
- 是否存在误导性命名（名字和实际行为不匹配）？

---

### 维度 4：一致性（Consistency）

> 同类问题是否用同一种方式解决？

扫描时关注：

- 同一类操作（如构造 Stimulus、发出事件）是否在多处以不同方式重复实现？
- 错误处理风格是否统一？
- 命名约定是否统一（前缀、后缀、camelCase/PascalCase）？
- 导出方式是否一致（named export / index barrel / re-export）？
- 模块结构是否对称（同类模块是否遵循相同的目录和导出约定）？

---

### 维度 5：可测试性（Testability）

> 代码结构是否利于测试隔离？

扫描时关注：

- 纯逻辑函数和有副作用的代码是否分离？
- 外部依赖（Koishi / fs / Redis）是否通过接口注入，而不是直接引用？
- 模块边界是否清晰，不需要 mock 过多内部细节就能测试核心逻辑？
- 测试时是否被迫因为一个文件顶层有外部依赖而 mock 整个模块？

---

## 二、逐文件扫描流程

每次审查代码时，对每个文件按以下顺序扫描：

```
1. 读文件头注释
   → 明确这个文件的职责是什么
   → 如果没有注释，先判断文件职责应该是什么

2. 看 export 列表
   → 这个文件对外暴露了什么
   → 导出内容和文件职责是否一致

3. 逐个函数 / 类 / 接口：
   a. 函数名 / 类名是否准确
   b. 参数处理是否有防御（null / undefined / 边界值）
   c. 复杂分支是否有注释
   d. 是否有潜在的状态混乱（异步、并发、状态机）
   e. 同样的逻辑是否在别处重复

4. 标注发现的问题
   → 注明维度（正确性 / 健壮性 / 可读性 / 一致性 / 可测试性）
   → 注明严重程度（高 / 中 / 低）
   → 写明发现的问题和建议修复方向
```

---

## 三、横向依赖分析

完成单文件扫描后，进行跨文件分析：

```
1. 同一概念出现位置扫描
   → 例如："Stimulus 构造"在哪些文件里出现？
   → 目标：找出重复实现和不一致逻辑

2. 接口与实现对齐检查
   → 每个 Interface / abstract 和实现它的 Class 是否真正对齐？
   → 包括方法签名、返回类型、错误行为

3. 导入路径一致性
   → 同一模块是否在不同地方以不同路径导入？
   → 是否存在直接 import 编译产物（lib/）而非源码的情况？

4. 纯逻辑与外部依赖混合点
   → 哪些文件同时包含"纯逻辑"和"外部系统依赖（Koishi / fs / Redis）"？
   → 这些是可测试性问题的根源
```

---

## 四、优先级评定标准

发现问题后，按以下标准评定优先级：

| 级别 | 含义 | 示例 |
|------|------|------|
| 高（必须修复）| 影响功能正确性，可能导致 bug 或系统进入错误状态 | 状态机缺少并发保护、接口行为不一致 |
| 中（建议修复）| 影响系统健壮性或可维护性，但不会立刻导致 bug | 错误消息不清晰、函数职责混合 |
| 低（规范化）| 影响代码可读性或工程规范，不影响功能 | 缺少注释、导出方式不统一 |

---

## 五、与项目设计原则的校验

**在完成技术层面的分析后，必须对照项目设计文档（`elysia-ai-top-level-design.md`）对每个优化点进行二次校验。**

以下是本项目的核心设计约束与对应的代码层面检查项：

### 5.1 状态优先于输出
> 先维护生命体状态，再决定是否表达。

代码检查项：
- 是否存在跳过状态更新直接输出的路径？
- runtime 的 `receiveStimulus` 是否在确认 running 状态后才处理？（✓）
- body 层是否有可能在 runtime 未启动时仍然触发输出？

### 5.2 刺激优先于消息
> 系统接收的是 Stimulus，不是单纯聊天消息。

代码检查项：
- `PlatformMessage → Stimulus` 转换是否统一集中在一处？
- 不同来源的消息是否都正确转换成 `Stimulus` 类型？
- `Stimulus` 的 `type` 是否被正确分类（`utterance` / `system` / ...）？

### 5.3 不绕过总线直接构建跨层强耦合
> 跨层关键生命周期节点必须通过总线或统一 service abstraction 传播。

代码检查项：
- body 层是否通过 `eventBus` 传播事件，而不是直接调用 runtime 内部方法？
- 各层是否只通过 eventBus 交互，而不是直接持有其他层的实例？
- `handlePlatformMessage` 是否只调用 `runtime.receiveStimulus()`，而不会直接操作 registry？（✓）

### 5.4 代码与配置解耦
> 配置描述生命体的存在方式，不描述代码逻辑。

代码检查项：
- manifest loader 是否只负责读取配置，而不包含业务判断？
- runtime 加载 manifest 时是否只做"声明加载"，而不包含行为策略？

### 5.5 不允许把 Body 层混入业务逻辑
> body 只负责"接世界"和"出世界"，不判断要不要回复、用户关系如何。

代码检查项：
- `KoishiBodyAdapter` 和 `handlePlatformMessage` 是否只做消息接收和转换？
- 是否存在任何行为判断（要不要回复）混入 body 层？

---

## 六、分析输出格式

每次执行代码审查后，输出一张问题表格，格式如下：

| ID | 文件 | 问题描述 | 维度 | 严重程度 | 是否符合设计原则 | 修复方向 |
|----|------|----------|------|----------|-----------------|---------|
| C1 | lifecycle/minimal-lifecycle.ts | starting/stopping 状态未拒绝重复调用 | 正确性 | 高 | ✓ 符合 | 补充状态拦截 |
| ... | | | | | | |

**必须填写"是否符合设计原则"一列**，确保所有优化方向都没有偏离项目核心设计目的。

---

## 七、代码审查执行清单

每次开始代码审查时，按以下清单执行：

```
✅ 第一步：读取 elysia-ai-top-level-design.md，确认当前阶段的设计原则
✅ 第二步：读取 elysia-ai-development-roadmap.md，确认当前阶段的代码范围
✅ 第三步：对目标代码文件逐一进行五维扫描
✅ 第四步：做横向依赖分析
✅ 第五步：对照设计原则进行二次校验
✅ 第六步：输出问题表格（含优先级和设计原则一致性）
✅ 第七步：按优先级排序，生成修复 Todo List
```

---

## 八、本轮分析结果（Phase 1 实现阶段）

以下是对 Phase 1 代码（core / runtime / body）使用本方法进行分析后的完整输出。

---

### 8.1 分析范围

- `packages/core/src/bus/`
- `packages/core/src/plugin/`
- `packages/runtime/src/lifecycle/`
- `packages/runtime/src/registry/`
- `packages/runtime/src/manifest/`
- `packages/runtime/src/runtime.ts`
- `packages/body/src/`

---

### 8.2 问题表格

| ID | 文件 | 问题描述 | 维度 | 严重程度 | 符合设计原则 | 修复方向 |
|----|------|----------|------|----------|---------|-|
| C1 | `lifecycle/minimal-lifecycle.ts` | `starting/stopping` 状态下再次调用 `start/stop` 没有被拒绝，存在状态污染风险 | 正确性 | 高 | ✓ | 在 `start()` 检查中也拒绝 `starting/running` 状态；`stop()` 检查中也拒绝 `stopping/stopped` 状态 |
| C2 | `runtime/src/runtime.ts` | `stop()` 在 `stopped` 状态下会抛出异常，但外层调用者没有处理 | 健壮性 | 高 | ✓ | runtime 层对 `stopped` 状态的 `stop()` 调用静默处理（幂等） |
| C3 | `body/src/index.ts` + `body/adapters/koishi/koishi-body-adapter.ts` | `handlePlatformMessage` 用 `sessionToStimulus()` 构造 Stimulus，`KoishiBodyAdapter` 内联构造 Stimulus，两条路径不一致 | 正确性 + 一致性 | 高 | 违反"刺激优先于消息"一致性 | 提取统一的 `platformMessageToStimulus()` 函数，两者都调用它 |
| C4 | `body/src/normalize/session-to-stimulus.ts` | 这个文件的实现与 KoishiBodyAdapter 里的内联逻辑可能语义不同，存在行为分叉 | 正确性 | 高 | 违反"不允许把转换逻辑分散在多处" | 统一 Stimulus 构造路径，移除或整合旧的 `sessionToStimulus` |
| R1 | `manifest/loader.ts` | 错误信息只抛出字段名（如 `'version'`），缺乏完整的错误描述 | 健壮性 | 中 | ✓ | 改为 `Manifest validation error: missing required field "version"` 格式 |
| R2 | `runtime/src/runtime.ts` | `meta?.['name'] as string ?? instance.id` 访问方式不清晰，有潜在类型转换问题 | 健壮性 + 可读性 | 中 | ✓ | 提取 `resolveLifeName(instance)` 工具函数，明确逻辑 |
| ST1 | `body/src/index.ts` | Koishi 插件代码（有 Koishi 副作用）和纯逻辑函数混在同一文件中 | 可测试性 + 一致性 | 中 | 符合"躯体层职责"，但影响可测试性 | 把 `handlePlatformMessage` 拆到 `body/src/message-handler.ts`，`index.ts` 只保留插件入口 |
| RD1 | `body/adapters/koishi/koishi-body-adapter.ts` | Stimulus 构造逻辑（包括 habitatId 选取）内联在 callback 里，难以阅读和修改 | 可读性 | 中 | ✓ | 提取 `platformMessageToStimulus(message)` 函数 |
| RD2 | `lifecycle/minimal-lifecycle.ts` | `start/stop` 方法缺少注释说明合法的前置状态和后置状态 | 可读性 | 低 | ✓ | 补充 JSDoc 注释说明状态转移 |
| RD3 | 所有主要导出函数 | JSDoc 注释覆盖不完整，部分接口有注释，部分实现类没有 | 可读性 | 低 | ✓ | 统一补全主要 public 接口的 JSDoc |
| ST2 | `runtime/src/manifest/` | 缺少 `index.ts` 统一导出，调用方需要分别引用 `types` 和 `loader` | 一致性 | 低 | ✓ | 新增 `manifest/index.ts` |
| ST3 | `core/src/index.ts` | 缺少区段注释，导出内容多但没有分类说明 | 可读性 | 低 | ✓ | 加区段注释 |
| ST4 | `vitest.config.ts` | `alias` 放在 `test` 块内，标准 vitest 写法应在 `resolve.alias` | 一致性 | 低 | ✓ | 移到 `resolve.alias` |

---

### 8.3 二次校验结论

基于项目设计文档 `elysia-ai-top-level-design.md` 的二次校验结论：

**保留（符合或不违反设计原则）：**
- C1、C2、R1、R2、RD1、RD2、RD3、ST2、ST3、ST4
- 这些优化都在单层内部，不破坏分层边界

**调整说明（违反设计原则需特别注意）：**
- **C3/C4（最重要）**：Stimulus 构造路径不统一，直接违反"刺激优先于消息"原则——如果不同路径构造出的 Stimulus 语义不同，系统对"刺激"的理解就会出现分裂，这是高优先级问题
- **ST1**：body/src/index.ts 混合了纯逻辑和 Koishi 依赖，不违反分层，但影响"可插拔"原则。拆分后，未来如果需要支持其他平台，只需新增 adapter，不需要动 `handlePlatformMessage`

**新增（由设计原则推导出但之前未发现的优化点）：**
- **NEW-1**：`runtime.receiveStimulus()` 里目前只检查 `isRunning()`，但没有在 `Stimulus` 上附加 `lifeInstanceId`——按设计文档，runtime 应该根据 stimulus 决定"哪些生命体能感知到"，但目前跳过了这一步
  - 严重程度：**中**（Phase 1 可以先留占位，但需要注释说明这是后续补充点）
- **NEW-2**：`loadManifest` 目前在 runtime 未 `running` 时依然可以调用，但生命体状态应该在运行中才能被激活
  - 严重程度：**中**（可以在文档和注释里标注这个行为，避免未来出现错误假设）

---

### 8.4 修复优先级排序（最终版）

```
阶段 1（必须做，影响正确性）
  C3/C4 → 统一 Stimulus 构造路径（提取 platformMessageToStimulus()）
  C1 → lifecycle starting/stopping 状态拦截
  C2 → runtime stop() 幂等保护

阶段 2（建议做，提升健壮性和可维护性）
  NEW-1 → receiveStimulus 添加占位注释（后续补 life routing 逻辑）
  NEW-2 → loadManifest 在未 running 时的行为说明
  R1 → manifest 错误信息规范化
  R2 → loadManifest 的 meta 处理
  ST1 → 拆分 body/src/index.ts

阶段 3（规范化，低优先级）
  ST2 → manifest/index.ts 统一导出
  ST3 → core/src/index.ts 区段注释
  ST4 → vitest.config.ts 规范
  RD2/RD3 → 注释补全
