# P0 核心 Schema 与校验基础

## 目标

建立 `packages/schema`，定义 PageForge 的核心数据结构和校验入口，为编辑器、AI、导出器提供共同协议。

## 范围

- 定义 `Project`、`Page`、`Node`、`Asset`。
- 定义 `DesignTokens`、`StyleMap`、`BreakpointName`。
- 定义 `NodeEvent` 与最小事件 action。
- 建立 JSON Schema 校验入口。
- 提供创建默认项目、默认页面、默认根节点的 factory。

## 不做什么

- 不实现具体组件渲染。
- 不实现属性面板。
- 不实现 AI Patch。
- 不实现 schema migration 的完整链路，只预留接口。

## 前置依赖

- 需要完成 [01-P0-工程初始化与运行骨架.md](./01-P0-工程初始化与运行骨架.md)。

## 实现要点

### 1. 类型定义

核心类型以 TypeScript 为主，JSON Schema 作为运行时校验。

建议文件：

```text
packages/schema/src/types/project.ts
packages/schema/src/types/node.ts
packages/schema/src/types/tokens.ts
packages/schema/src/types/events.ts
packages/schema/src/index.ts
```

### 2. schemaVersion

第一版固定：

```ts
export const CURRENT_SCHEMA_VERSION = 1
```

所有新建项目都写入该版本。

### 3. 默认 Project

提供：

```ts
createProject(options?: Partial<Project>): Project
createPage(options?: Partial<Page>): Page
createPageRoot(): Node
```

默认页面必须包含 `PageRoot`。

### 4. Token 引用

统一使用完整路径：

- `$colors.primary`
- `$colors.text`
- `$radius.md`
- `$spacing.4`

### 5. 校验入口

建议提供：

```ts
validateProject(project: unknown): ValidationResult<Project>
validateNode(node: unknown): ValidationResult<Node>
```

校验错误要能返回 path 和 message，方便 UI 展示。

## 验收标准

- 可以创建一个默认合法 Project。
- 默认 Project 能通过 `validateProject`。
- 缺少 `schemaVersion`、`pages`、`root` 时校验失败。
- `Page.route` 类型错误时校验失败。
- `Node.id`、`Node.type` 缺失时校验失败。
- TypeScript 类型可被主进程和渲染进程共同引用。

## 测试建议

- 默认 Project 快照测试。
- 合法 Project 校验测试。
- 非法 Project 校验测试。
- Token 引用格式测试。

## PR Checklist

- [ ] `packages/schema` 可独立导出类型和方法。
- [ ] 默认项目 factory 可用。
- [ ] JSON Schema 校验入口可用。
- [ ] 单元测试覆盖合法和非法数据。
- [ ] 文档示例与代码类型一致。
