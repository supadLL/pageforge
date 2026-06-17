# P0 Node 树渲染器与选中态

## 目标

实现从 Node Tree 到画布 DOM 的递归渲染，并支持基础选中态，让用户能看到和选中节点。

## 范围

- 建立 editor store。
- 建立 `Canvas.vue`。
- 实现 Node Tree 递归渲染。
- 支持 token 解析。
- 支持节点选中态。
- 支持组件库点击添加节点。

## 不做什么

- 不实现完整属性面板。
- 不实现拖拽排序。
- 不实现保存打开。
- 不实现导出。

## 前置依赖

- 需要完成 [03-P0-组件注册表与默认组件.md](./03-P0-组件注册表与默认组件.md)。

## 实现要点

### 1. Store

建议至少拆分：

```text
src/stores/project.ts
src/stores/editor.ts
```

`project` store 负责当前 Project。  
`editor` store 负责选中节点、当前页面、当前断点。

### 2. 渲染器

渲染器必须从 Node Tree 递归生成 Vue 组件/DOM：

- `PageRoot` 渲染页面容器。
- `Container`、`Card` 渲染子节点。
- `Heading`、`Text`、`Button`、`Image`、`Input`、`Divider` 渲染对应基础 DOM。

### 3. Style 处理

- 基础样式来自 `node.style`。
- 当前断点有覆盖时，合并 `node.responsive[currentBreakpoint].style`。
- token 引用解析为 CSS variable 或实际值。

### 4. 选中态

- 点击节点后设置 `selectedNodeId`。
- 选中态用编辑器 overlay 或 outline 表示。
- 点击子节点时阻止事件冒泡导致父节点被选中。
- `locked` 节点不可被画布选中，但可在图层面板选中。

### 5. 添加节点

P0 可先支持点击组件库添加：

- 有选中容器时，添加到该容器。
- 没有选中容器时，添加到 PageRoot。
- 当前选中节点不是容器时，添加到其最近可承载父容器；找不到则添加到 PageRoot。

## 验收标准

- 默认空页面可以渲染。
- 点击组件库能添加 Text/Button/Image/Container。
- 添加后的节点显示在画布上。
- 点击节点能看到选中态。
- 子节点点击不会误选父节点。
- token 样式能正确显示。
- 非容器节点不会被添加 children。

## 测试建议

- 渲染器对简单 Node Tree 的组件测试。
- token 解析单元测试。
- 查找可承载父节点的工具函数测试。

## PR Checklist

- [ ] 画布由 Node Tree 渲染，不手写临时 DOM 状态。
- [ ] editor store 和 project store 职责清楚。
- [ ] 选中态稳定。
- [ ] 添加节点遵守组件注册表的 children 规则。
- [ ] P0 验收 demo 可手动走通。
