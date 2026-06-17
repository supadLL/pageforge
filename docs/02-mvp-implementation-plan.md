# PageForge MVP 实施计划

> 本文档定义 P0-P2 的可执行范围，并为 P3-P5 留出稳定接口。MVP 目标不是做完整低代码平台，而是先跑通“可视化编辑 -> 保存 -> 预览 -> 导出”的最小闭环。

---

## 1. MVP 目标

第一版要证明三件事：

1. **Schema 驱动编辑器可行**  
   页面不是靠临时 DOM 拼出来，而是由 Node Tree 渲染、编辑、保存、导出。

2. **基础页面搭建可用**  
   用户可以用少量组件搭一个落地页区块，修改文本、颜色、间距、布局，并撤销重做。

3. **导出结果可独立运行**  
   项目可以导出单文件 HTML 或分离文件，并在浏览器里正常预览。

暂不追求：

- 完整设计工具能力
- 完整组件库
- 完整响应式设计器
- 完整 AI 图生页面准确率
- 完整 Vue/React/uni-app 工程生成

---

## 2. 技术栈

推荐：

- Electron
- Vue 3
- Vite
- Pinia
- TypeScript
- JSON Schema 校验库：`ajv`
- 拖拽能力：优先自研简单 DnD，必要时引入轻量库
- 代码格式化：`prettier`
- 测试：`vitest`，后续补 Playwright

目录按 `00-产品需求与架构设计.md` 的规划创建，MVP 期间重点落在：

```text
pageforge/
├── electron/
│   ├── main/
│   ├── preload/
│   └── services/
├── packages/
│   └── schema/
├── src/
│   ├── builtin/
│   ├── editor/
│   ├── exporters/
│   ├── stores/
│   └── components/
└── docs/
```

---

## 3. 阶段计划

## P0 地基：Schema、工程、画布渲染

### 目标

建立 Electron + Vue 工程，跑通 Node Tree 到画布 DOM 的渲染，并支持最基础的拖入和选中。

### 任务

1. 初始化工程
   - 创建 `package.json`
   - 配置 Electron main/preload/renderer
   - 配置 Vite + Vue + TypeScript
   - 配置基础 lint/format/test 命令

2. 建立 `packages/schema`
   - 定义 `Project`、`Page`、`Node`、`Asset` 类型
   - 定义 `DesignTokens`
   - 定义 `ComponentDefinition`
   - 定义 MVP 组件类型枚举
   - 加入 JSON Schema 校验入口

3. 建立组件注册表
   - `PageRoot`
   - `Container`
   - `Card`
   - `Heading`
   - `Text`
   - `Button`
   - `Image`
   - `Input`
   - `Divider`

4. 建立画布渲染器
   - 递归渲染 Node Tree
   - 解析 token 为 CSS variables
   - 支持 hidden/locked 的编辑器表现
   - 点击节点可选中

5. 建立最小编辑器 store
   - 当前项目
   - 当前页面
   - 当前选中节点
   - 当前断点

6. 建立基础组件库面板
   - 点击或拖拽添加组件
   - 新节点自动补默认 props/style
   - 默认添加到当前选中容器，未选中时添加到 PageRoot

### 验收标准

- 启动桌面应用后显示编辑器界面。
- 默认项目包含一个空页面。
- 能添加 Text/Button/Image/Container 到画布。
- 节点点击后能显示选中态。
- 图层结构和画布结构一致。
- Project 数据能通过 schema 校验。
- 刷新渲染进程后不会导致应用崩溃。

---

## P1 编辑器可用：属性、图层、历史、保存

### 目标

让用户能真正搭一个简单页面区块，并能保存/打开工程。

### 任务

1. 属性面板
   - 根据组件 `propSchema` 自动生成基础表单
   - 支持文本、数字、颜色、选择、开关
   - 支持常用 style 编辑：颜色、背景、字号、间距、圆角、宽高、flex 布局

2. 图层面板
   - 树形展示 Node
   - 支持选中节点
   - 支持重命名
   - 支持显隐
   - 支持锁定
   - 支持删除

3. 命令系统
   - 实现 `addNode`
   - 实现 `removeNode`
   - 实现 `moveNode`
   - 实现 `reorderNode`
   - 实现 `updateProps`
   - 实现 `updateStyle`
   - 实现 `renameNode`
   - 实现 `setNodeState`

4. 历史栈
   - 撤销
   - 重做
   - 属性连续输入合并
   - 拖拽完成后只记录一次

5. 拖拽与排序
   - 从组件库拖入容器
   - 在同一容器内改变顺序
   - 容器高亮可放置状态

6. 项目持久化
   - 新建项目
   - 打开项目目录
   - 保存 `project.json`
   - 复制导入图片到 `assets/`
   - 最近打开项目记录

7. Electron IPC
   - preload 暴露 `project.open`
   - preload 暴露 `project.save`
   - preload 暴露 `asset.import`
   - 主进程校验参数

### 验收标准

- 能搭出一个包含标题、文本、按钮、图片、卡片的页面区块。
- 能修改组件文案、颜色、圆角、间距、flex 排列。
- 能通过图层面板选中、重命名、隐藏、锁定、删除节点。
- 撤销/重做覆盖新增、删除、属性修改、样式修改、排序。
- 保存后关闭应用，再打开项目可以恢复页面。
- 导入图片后项目目录内出现对应资源文件。
- 渲染进程拿不到 API Key、任意文件系统能力。

---

## P2 导出与预览

### 目标

把 Node Tree 转成可独立运行的 HTML，并提供代码视图和本地预览。

### 任务

1. HTML 导出器
   - Node Tree 递归生成 HTML
   - style 收集为 CSS class
   - token 输出为 CSS variables
   - responsive 输出为 media query
   - 图片资源复制或内联

2. 单文件导出
   - 生成 `index.html`
   - 内联 CSS
   - 内联最小 JS
   - 可直接浏览器打开

3. 分离文件导出
   - 生成 `index.html`
   - 生成 `styles.css`
   - 生成 `script.js`
   - 复制 `assets/`

4. 代码视图
   - 展示 HTML/CSS/JS
   - 支持复制
   - 支持重新生成

5. 本地预览服务
   - 主进程启动本地 HTTP 服务
   - 提供当前页面预览
   - 支持独立预览窗口

6. 导出测试
   - 对几个固定 Node Tree 做快照测试
   - 验证 token、media query、图片路径、事件输出

### 验收标准

- 当前页面可导出为单文件 HTML。
- 当前页面可导出为分离文件。
- 导出的 HTML 在浏览器中样式正确。
- 图片资源路径正确。
- 点击按钮跳转/openUrl 事件可用。
- 代码视图内容与导出内容一致。
- 本地预览窗口能显示当前页面。

---

## 4. P3-P5 预留接口

MVP 期间不完整实现 AI 和框架转译，但需要提前留好接口。

### P3 AI 图生页面

预留：

- `AIProvider.generateFromImage`
- `GeneratedPageDraft`
- `normalizeGeneratedDraft`
- `validateGeneratedDraft`
- `insertGeneratedDraft`

第一版 AI 验收目标：

- 上传一张简单卡片/落地页截图。
- 返回合法 Node Tree 草稿。
- 加载进画布。
- 失败时展示校验错误和原始响应摘要。

### P4 AI 微调

预留：

- `AIProvider.editByPrompt`
- `AiPatchSet`
- `validateAiPatchSet`
- `applyPatchCommand`

第一版 AI 微调验收目标：

- 选中一个节点。
- 输入“把按钮改成红色圆角”。
- AI 返回 `updateStyle` patch。
- 应用后可撤销。

### P5 框架转译

预留：

- `Exporter` 接口
- `toHtml`
- `toVueSfc`
- `toReact`
- `toUniPage`

第一版框架导出顺序：

1. HTML
2. Vue SFC
3. React + CSS Modules
4. uni-app 页面片段

---

## 5. 推荐实现顺序

1. `packages/schema` 类型与校验
2. 组件注册表
3. Pinia project/editor store
4. Node Tree 渲染器
5. 组件库添加节点
6. 选中态与图层树
7. 属性面板
8. 命令系统
9. 撤销重做
10. 保存/打开项目
11. HTML 导出器
12. 代码视图
13. 本地预览服务

这个顺序尽量让每一步都有可见结果，也能尽早暴露 Schema 设计问题。

---

## 6. 风险与处理

| 风险 | 影响 | 处理 |
|---|---|---|
| Schema 频繁变化 | 后续导出和 AI 全部返工 | P0 先只做 MVP 组件，新增字段必须写迁移说明 |
| 布局能力过早复杂化 | 画布、导出、响应式难以统一 | MVP 坚持 Flex 优先，absolute 延后 |
| AI 返回不可控 | 页面加载失败或污染项目 | AI 结果必须 schema 校验和 normalize |
| 撤销重做后补成本高 | 编辑体验不稳定 | P1 前必须统一 Command 入口 |
| Electron 权限过大 | 安全风险 | preload 最小 API，主进程校验参数 |
| 导出依赖编辑器 DOM | 导出不可测、不可复用 | 导出器只能读 Node Tree |

---

## 7. 测试策略

P0：

- Schema 校验单元测试
- 组件默认值测试
- Node Tree normalize 测试

P1：

- Command apply/revert 测试
- history undo/redo 测试
- project save/open 测试

P2：

- HTML exporter 快照测试
- responsive CSS 输出测试
- asset path 输出测试
- preview server smoke test

后续补：

- Playwright 编辑器流程测试
- AI provider mock 测试
- 框架导出快照测试

---

## 8. Definition of Done

MVP 完成需要满足：

- P0-P2 验收标准全部通过。
- 至少有一个示例项目保存在 `examples/`。
- 至少有一个导出结果保存在 `examples/exported-html/`。
- `npm run test` 通过。
- `npm run build` 通过。
- 文档包含启动、开发、打包、导出说明。

---

## 9. 之后再做的功能

这些功能不进入 MVP，避免范围膨胀：

- 多页面路由编辑器
- 模板市场
- 版本快照 UI
- 复杂表格/轮播/模态框
- 自定义组件导入
- 完整设计稿还原
- 完整 uni-app/小程序工程生成
- 团队协作
- 云端同步
