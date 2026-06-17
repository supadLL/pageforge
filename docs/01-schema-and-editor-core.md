# PageForge Schema 与编辑器内核规格

> 本文档把产品愿景落到可实现的核心协议。目标是让编辑器、AI、导出器、项目文件都围绕同一套稳定数据模型工作。

---

## 1. 核心原则

1. **Node Tree 是唯一事实源**  
   画布渲染、属性面板、图层树、导出、AI 修改都读写同一棵 Node Tree。

2. **组件由注册表声明能力**  
   组件能不能有子节点、有哪些 props、默认样式、如何渲染、如何导出，都由 `ComponentDefinition` 描述。

3. **所有修改走命令系统**  
   用户拖拽、属性编辑、图层移动、AI 微调都产生 Command 或 Patch，再由统一入口应用到项目。

4. **AI 只能提交结构化结果**  
   AI 图生页面返回草稿 Node Tree；AI 微调返回 Patch 列表。所有结果必须经过本地校验、归一化、补 id、补默认值。

5. **导出从 Node Tree 开始**  
   HTML、Vue、React、uni-app 都从 Node Tree 生成，不以 HTML 作为中间转译源，避免丢失组件语义。

---

## 2. 项目数据模型

### 2.1 Project

```ts
interface Project {
  id: string
  name: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
  tokens: DesignTokens
  pages: Page[]
  assets: Asset[]
  settings: ProjectSettings
}
```

```ts
interface ProjectSettings {
  defaultPageId: string
  defaultBreakpoint: BreakpointName
  previewBasePath: string
}
```

### 2.2 Page

```ts
interface Page {
  id: string
  name: string
  route: string
  root: Node
  meta?: {
    title?: string
    description?: string
  }
}
```

约束：

- `route` 在同一项目内唯一。
- `root.type` 必须是 `PageRoot`。
- 页面级背景、宽度、最小高度写在 `root.style`。

### 2.3 Node

```ts
interface Node {
  id: string
  type: ComponentType
  name?: string
  props: Record<string, unknown>
  style: StyleMap
  children?: Node[]
  events?: NodeEvent[]
  responsive?: Partial<Record<BreakpointName, ResponsiveOverride>>
  state?: NodeState
}
```

```ts
interface NodeState {
  hidden?: boolean
  locked?: boolean
}
```

约束：

- `id` 由本地生成，AI 返回的 id 仅作参考。
- `children` 只有容器类组件允许存在。
- `props` 必须通过对应组件的 `propSchema` 校验。
- `style` 只允许可导出的 CSS 子集，见第 4 节。
- `hidden` 和 `locked` 只影响编辑器，不参与默认导出；导出时可由用户选择是否包含隐藏节点。

### 2.4 Asset

```ts
interface Asset {
  id: string
  type: 'image' | 'font' | 'file'
  name: string
  path: string
  mime: string
  size: number
  width?: number
  height?: number
  hash?: string
  source?: 'upload' | 'ai' | 'remote' | 'template'
  createdAt: string
}
```

约束：

- `path` 使用项目目录内相对路径，例如 `assets/hero.png`。
- 图片组件引用资源时使用 `assetId`，导出器再解析为相对路径或内联 data URL。

---

## 3. Design Tokens

```ts
interface DesignTokens {
  colors: Record<string, string>
  fontSize: Record<string, string>
  fontFamily: Record<string, string>
  spacing: Record<string, string>
  radius: Record<string, string>
  shadow: Record<string, string>
  motion: Record<string, string>
}
```

Token 引用统一使用完整路径：

```json
{
  "color": "$colors.text",
  "backgroundColor": "$colors.primary",
  "borderRadius": "$radius.md",
  "padding": "$spacing.4"
}
```

规则：

- `$colors.primary` 这种引用在渲染时解析为 CSS 变量：`var(--pf-colors-primary)`。
- 导出 HTML 时在根节点生成 CSS variables。
- 不再使用 `$primary` 这种短引用，避免命名冲突。

---

## 4. 样式模型

### 4.1 第一版支持的 CSS 子集

布局：

- `display`
- `flexDirection`
- `alignItems`
- `justifyContent`
- `gap`
- `flexWrap`
- `width`
- `height`
- `minWidth`
- `minHeight`
- `maxWidth`
- `maxHeight`
- `padding`
- `margin`
- `boxSizing`

视觉：

- `color`
- `backgroundColor`
- `backgroundImage`
- `border`
- `borderColor`
- `borderRadius`
- `boxShadow`
- `opacity`

文字：

- `fontFamily`
- `fontSize`
- `fontWeight`
- `lineHeight`
- `textAlign`
- `letterSpacing`
- `textDecoration`

定位：

- `position`
- `top`
- `right`
- `bottom`
- `left`
- `zIndex`

其他：

- `overflow`
- `cursor`

### 4.2 布局策略

MVP 采用 **Flex 容器流式布局优先**：

- `PageRoot`、`Container`、`Card` 默认 `display: flex`。
- 拖拽进入容器时，编辑器根据鼠标位置计算插入 index。
- 对齐、分布、间距修改最终写入父容器的 flex 样式。
- `position: absolute` 第一版只用于少量高级场景，不作为默认拖拽布局模式。

这样可以保证导出的页面更容易响应式适配，也能降低框架转译复杂度。

---

## 5. 响应式模型

```ts
type BreakpointName = 'desktop' | 'laptop' | 'tablet' | 'mobile'

interface Breakpoint {
  name: BreakpointName
  width: number
}

interface ResponsiveOverride {
  style?: Partial<StyleMap>
  props?: Record<string, unknown>
}
```

默认断点：

| 名称 | 宽度 |
|---|---:|
| desktop | 1440 |
| laptop | 1024 |
| tablet | 768 |
| mobile | 375 |

规则：

- `node.style` 是基础样式。
- `node.responsive[breakpoint].style` 是覆盖样式。
- 编辑器切换断点后，属性面板默认编辑当前断点覆盖；用户可切回“基础样式”。
- 导出 CSS 时使用 mobile-first 或 desktop-first 需要由导出器配置决定。MVP 默认 desktop-first，用 `max-width` media query 生成覆盖。

---

## 6. 组件注册协议

```ts
interface ComponentDefinition {
  type: ComponentType
  label: string
  category: ComponentCategory
  icon?: string
  defaultProps: Record<string, unknown>
  defaultStyle: StyleMap
  propSchema: JsonSchema
  acceptsChildren: boolean
  allowedChildren?: ComponentType[]
  render: ComponentRenderer
  exportHints?: ExportHints
}
```

```ts
type ComponentCategory =
  | 'layout'
  | 'basic'
  | 'form'
  | 'data'
  | 'navigation'
  | 'feedback'
```

MVP 组件：

| 类型 | 分类 | 子节点 | 说明 |
|---|---|---:|---|
| PageRoot | layout | 是 | 页面根节点 |
| Container | layout | 是 | 通用布局容器 |
| Card | layout | 是 | 带默认边框/阴影的容器 |
| Heading | basic | 否 | 标题 |
| Text | basic | 否 | 普通文本 |
| Button | basic | 否 | 按钮 |
| Image | basic | 否 | 图片 |
| Input | form | 否 | 输入框 |
| Divider | basic | 否 | 分隔线 |

后续扩展组件必须先加入注册表，不能只在渲染器里硬编码。

---

## 7. 事件模型

```ts
interface NodeEvent {
  type: 'click' | 'submit' | 'change'
  action: NodeAction
}

type NodeAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'openUrl'; url: string; target?: '_blank' | '_self' }
  | { kind: 'toggleVisibility'; nodeId: string }
  | { kind: 'customCode'; code: string }
```

MVP 只实现：

- `click -> navigate`
- `click -> openUrl`

`customCode` 需要安全提示，默认不在预览沙箱中执行。

---

## 8. 命令系统与历史栈

所有编辑动作通过 Command 进入 store。

```ts
interface EditorCommand {
  id: string
  label: string
  createdAt: string
  apply(project: Project): Project
  revert(project: Project): Project
}
```

MVP 命令类型：

- `addNode`
- `removeNode`
- `moveNode`
- `reorderNode`
- `updateProps`
- `updateStyle`
- `updateResponsiveStyle`
- `renameNode`
- `setNodeState`
- `applyPatch`

历史规则：

- 属性面板连续输入需要 debounce 后合并为一条历史记录。
- 拖拽过程不入历史，drop 后只入一条历史。
- AI 修改以一次请求为一条历史记录。
- 历史栈保存 command 元数据和前后快照片段，避免整项目频繁复制。

---

## 9. AI Patch 协议

AI 微调不直接返回整棵树，而是返回 Patch 列表。

```ts
interface AiPatchSet {
  summary: string
  patches: AiPatch[]
}

type AiPatch =
  | { op: 'addNode'; parentId: string; index?: number; node: Partial<Node> }
  | { op: 'removeNode'; nodeId: string }
  | { op: 'moveNode'; nodeId: string; parentId: string; index?: number }
  | { op: 'updateProps'; nodeId: string; props: Record<string, unknown> }
  | { op: 'updateStyle'; nodeId: string; style: Partial<StyleMap>; breakpoint?: BreakpointName }
  | { op: 'renameNode'; nodeId: string; name: string }
```

本地应用流程：

1. 校验 patch 结构。
2. 检查目标 node 是否存在。
3. 对新增 node 补 id、补默认 props、补默认 style。
4. 用组件注册表校验 children 和 props。
5. 生成一条 `applyPatch` command。
6. 应用到项目并进入历史栈。

AI 图生页面返回草稿：

```ts
interface GeneratedPageDraft {
  summary: string
  tokens?: Partial<DesignTokens>
  root: Partial<Node>
  warnings?: string[]
}
```

草稿必须经过 normalize 后才进入画布。

---

## 10. 导出器协议

```ts
interface Exporter {
  target: 'html' | 'vue' | 'react' | 'uni'
  export(project: Project, pageId: string, options: ExportOptions): Promise<CodeFile[]>
}

interface CodeFile {
  path: string
  content: string
}
```

MVP 导出：

- 单文件 HTML：`index.html`
- 分离文件：`index.html`、`styles.css`、`script.js`

导出规则：

- 从 Node Tree 递归生成结构。
- Token 输出为 CSS variables。
- style 输出为 class，而不是全部 inline style。
- 响应式覆盖输出为 media query。
- 事件输出为最小 JS 绑定。
- 图片资源按导出选项复制或内联。

框架导出后续补充：

- Vue SFC：确定性生成 `template` 和 `style`，AI 只用于命名/拆分建议。
- React：确定性生成 JSX 和 CSS Modules。
- uni-app：第一版只生成页面片段，不生成完整工程。

---

## 11. 项目文件格式

建议工程目录：

```text
my-project.pageforge/
├── project.json
├── assets/
├── snapshots/
└── meta.json
```

保存规则：

- `project.json` 保存完整 Project。
- `assets/` 保存项目资源。
- `snapshots/` 保存用户手动创建或自动保存的版本快照。
- `meta.json` 保存最近打开时间、窗口状态等非核心信息。
- 写入时先写临时文件，再原子替换，降低损坏风险。

---

## 12. Electron 安全边界

必须启用：

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`，如依赖不兼容再单独评估
- preload 只暴露白名单 API
- IPC 参数使用 schema 校验
- API Key 只在主进程读取和使用
- safeStorage 加密保存密钥
- 文件读写只允许用户选择的项目目录或导出目录
- 预览窗口与编辑器窗口隔离
- AI 返回内容不能直接作为脚本执行

---

## 13. Schema 迁移

```ts
interface Migration {
  from: number
  to: number
  migrate(project: unknown): Project
}
```

规则：

- 每次破坏性修改都提升 `schemaVersion`。
- 打开旧项目时自动迁移，并提示用户保存后不可被旧版本打开。
- 迁移前创建快照。

---

## 14. MVP 验收口径

核心协议完成的判断：

- 能创建合法 Project/Page/Node。
- 内置组件全部有 `ComponentDefinition`。
- Node Tree 可通过 JSON Schema 校验。
- 任一编辑动作都能映射为 Command。
- AI Patch 可以被校验、应用、撤销。
- HTML 导出不依赖编辑器 DOM，而是直接从 Node Tree 生成。
