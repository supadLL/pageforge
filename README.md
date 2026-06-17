# PageForge

> AI 驱动的可视化前端页面生成器（类墨刀桌面端）。
> Schema-first：编辑器、AI、导出全部围绕同一棵 Node Tree。

## 当前阶段

**全阶段完成** — P0/P1/P2/P3/P4/P5 全部交付（Step 01-17）。314 个单元测试全部通过。

### 已完成能力

**P0 地基**
- Electron + electron-vite + Vue 3 + TypeScript 三进程骨架
- `packages/schema`：Project / Page / Node / DesignTokens / StyleMap / Breakpoint / NodeEvent / Asset 类型 + JSON Schema 校验（ajv）
- 9 个 MVP 组件注册表：PageRoot / Container / Card / Heading / Text / Button / Image / Input / Divider
- Node Tree 递归渲染器（编辑器内联 style + token → CSS var）
- 选中态、组件库点击添加、图层结构一致

**P1 编辑器可用**
- 属性面板：从组件 `propSchema` 自动生成表单 + 通用 style 字段表单（布局/外观/文字/间距）
- 图层面板：树形展示、选中、重命名、显隐、锁定、删除、展开折叠
- 命令系统：10 种可序列化命令（addNode/removeNode/moveNode/reorderNode/updateProps/updateStyle/updateResponsiveStyle/renameNode/setNodeState/applyPatch）
- 撤销/重做：历史栈 + dirty 状态 + Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Ctrl+S 快捷键 + 连续输入合并
- 拖拽：组件库拖入画布、跨容器移动、同容器重排、insert index 计算、drop target 视觉反馈
- 项目持久化：`.pageforge` 工程目录、原子写入、schema 校验、最近项目记录
- 资源导入：图片复制到 `assets/`、Asset 记录、路径穿越防护

**P2 导出与预览**
- HTML 导出器：Node Tree → HTML + CSS class + token CSS variables + 响应式 media query + 事件 JS
- 单文件 HTML（内联 CSS/JS）与分离文件（index.html / styles.css / script.js）两种模式
- 代码视图面板：HTML/CSS/JS 三 tab、复制、单文件切换、导出到磁盘
- 本地预览服务：主进程 HTTP 服务、端口 fallback、独立预览窗口（权限隔离）

**P3 AI 集成**
- AI Provider 抽象层：`AIProvider` 接口、GLM 适配器（GLM-4V）、主进程 `aiService`、safeStorage 加密 Key、配置面板
- 图生页面：上传截图 → Vision AI 识别 → `GeneratedPageDraft` 草稿 → 校验/归一化 → 加载进画布（替换/追加两种模式，可撤销）
- AI 微调：自然语言指令 → `AiPatchSet` patch 列表 → 校验/归一化 → `applyPatchCommand` 应用（一条历史记录，可撤销，支持选中范围限定）

**P4 框架转译**
- Vue 3 SFC 导出器：Node Tree → `.vue`（template + script setup + style scoped），token CSS 变量、响应式、事件
- React 导出器：Node Tree → `Page.tsx` + `Page.module.css`（CSS Modules），TypeScript/JavaScript 可选
- uni-app 导出器：Node Tree → uni-app 页面 `.vue`（view/text/image/button 标签、`@tap`、`uni.navigateTo`）+ `pages.json.fragment`
- 代码视图加 Vue / React / uni-app 三个 tab

## 目录结构

```
pageforge/
├── docs/                          # 设计与计划文档（15 份）
├── electron/
│   ├── main/index.ts              # 主进程入口、窗口、IPC 注册
│   ├── preload/index.ts           # contextBridge 白名单 API
│   ├── shared/types.ts            # 跨进程共享类型
│   └── services/
│       ├── projectService.ts      # 项目保存/打开/资源导入/导出
│       └── previewService.ts      # 本地 HTTP 预览服务
├── packages/
│   └── schema/                    # 核心数据模型 + JSON Schema 校验
│       └── src/
│           ├── types/             # Project/Page/Node/Asset/Tokens/Style/...
│           ├── components/        # 9 个 MVP 组件定义 + 注册表
│           ├── factories/         # createProject/createPage/createPageRoot/createNode
│           ├── validation/        # ajv 校验入口 + token 引用解析
│           └── __tests__/         # schema + components 单元测试
├── src/                           # 渲染进程（Vue 3 + Pinia）
│   ├── stores/
│   │   ├── project.ts             # Project store + 命令 dispatcher
│   │   └── editor.ts              # 选中/断点等编辑器状态
│   ├── editor/
│   │   ├── Canvas.vue             # 画布
│   │   ├── NodeRenderer.vue       # 递归渲染器
│   │   ├── treeOps.ts             # Node 树纯函数（增删改查/移动）
│   │   ├── styleResolver.ts       # token → CSS var 解析
│   │   ├── dnd.ts                 # 拖拽 drop target 计算
│   │   └── commands/
│   │       ├── types.ts           # 10 种命令 + 构造器 + 类型守卫
│   │       ├── executor.ts        # 命令应用/撤销纯函数
│   │       └── historyStore.ts    # 历史栈 + 合并策略
│   ├── panels/
│   │   ├── Toolbar.vue            # 工具栏（新建/打开/保存/撤销/重做/代码/预览）
│   │   ├── ComponentLibrary.vue   # 组件库（点击+拖拽）
│   │   ├── LayersPanel.vue        # 图层面板
│   │   ├── LayerNode.vue          # 递归图层节点
│   │   ├── PropertyPanel.vue      # 属性面板（schema 驱动表单）
│   │   ├── formMeta.ts            # schema → 表单字段元数据
│   │   └── CodeView.vue           # 代码视图
│   ├── exporters/
│   │   └── htmlExporter.ts        # Node Tree → HTML/CSS/JS
│   └── ...
├── examples/                      # 示例项目与导出产物
│   ├── landing-demo.project.json
│   └── exported-html/
│       ├── index.html             # 单文件 HTML
│       └── split/                 # 分离文件
├── tests/                         # 14 个测试文件，224 个测试
└── ...
```

## 开发命令

```bash
npm install        # 安装依赖（含 devDependencies，见下方说明）
npm run dev        # 启动 Electron + Vite 开发模式
npm run build      # 构建主/preload/renderer
npm run typecheck  # 主进程 + 渲染进程类型检查
npm run test       # 跑单元测试（224 个）
npm run test:build # 构建后跑测试
```

### 关于 npm install

本仓库使用 npm workspaces。安装时务必带 `--include=dev`：

```bash
npm install --include=dev
```

否则 devDependencies（vitest / electron-vite / vue-tsc 等）的 .bin 链接不会创建。

### 关于 Electron 二进制

`.npmrc` 配置了 `electron_skip_binary_download=1` 和国内镜像。如需实际启动桌面窗口：

```bash
# 临时解除跳过，从镜像下载二进制
$env:ELECTRON_SKIP_BINARY_DOWNLOAD=0
npm install --include=dev
npm run dev
```

> 注：本机访问 GitHub 受限，开发期间以 typecheck/build/test 全绿为验收依据。
> 桌面运行时验证推迟到 Electron 二进制可用后。

## 安全说明

- 渲染进程**没有** Node API 直接访问权（`nodeIntegration: false` + `sandbox: true` + `contextIsolation: true`）
- 所有文件系统/网络/AI 调用都走主进程
- 渲染进程通过 preload 暴露的白名单 API 与主进程通信
- API Key 等敏感信息仅在主进程持有（safeStorage 加密，后续步骤实现）
- 预览窗口与编辑器窗口权限隔离，不复用编辑器 preload
- AI 返回内容不直接作为脚本执行（后续步骤实现）
- 文件读写限制在用户选择的项目目录或导出目录
- 资源读取有路径穿越防护

## 测试覆盖

| 测试文件 | 覆盖范围 |
|---|---|
| step01-build-artifacts | 三进程 build 产物健全性 |
| schema | Project/Node/Asset 校验 + token 引用 + factory |
| components | 9 个组件注册表 + createNode |
| treeOps | Node 树增删改查/移动/计数 |
| stores | project/editor store 基础行为 |
| propertyPanel | updateNodeProps/Style/State + 断点覆盖 |
| formMeta | schema → 表单控件映射 |
| layersPanel | 图层树遍历/选中/状态/删除/重命名 |
| commands | 10 种命令 apply/revert + 历史栈 + 合并 |
| dnd | drop target 计算 + canDrop + moveNode |
| projectIo | 项目序列化/保存/打开 mock + 文件 IO |
| htmlExporter | HTML/CSS/JS 导出 + token + 响应式 + 隐藏 + 事件 |
| previewService | exporter 集成 + 端口 fallback + 生命周期 |
| dod | Definition of Done 示例产物生成 |

## 路线图

参见 `docs/00-产品需求与架构设计.md` 与 `docs/02-mvp-implementation-plan.md`。

- ✅ **P0**（Step 01-04）：Schema + 画布渲染 + 选中态
- ✅ **P1**（Step 05-09）：属性面板 / 图层面板 / 命令系统 / 拖拽 / 保存打开
- ✅ **P2**（Step 10-11）：HTML 导出器 / 代码视图 / 本地预览
- ✅ **P3**（Step 12-13）：AI Provider 抽象层 + 图生页面
- ✅ **P4**（Step 14）：AI 微调
- ✅ **P5**（Step 15-17）：Vue SFC / React / uni-app 框架转译

后续打磨方向（未列入步骤文档）：
- 多页面路由编辑器
- 模板库 / 版本快照 UI
- 自定义组件导入
- AI 命名/拆分增强（Vue 导出器已预留接口）
- 团队协作 / 云端同步
