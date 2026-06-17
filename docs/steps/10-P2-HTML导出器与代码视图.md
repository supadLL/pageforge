# P2 HTML 导出器与代码视图

## 目标

实现从 Node Tree 到可运行 HTML/CSS/JS 的确定性导出，并在应用内提供代码视图。

## 范围

- 实现 HTML exporter。
- 支持单文件 HTML 导出。
- 支持分离文件导出。
- 生成 CSS variables 和 class。
- 生成响应式 media query。
- 处理图片资源路径。
- 提供代码视图和复制能力。

## 不做什么

- 不实现 Vue/React/uni-app 导出。
- 不使用 AI 优化代码。
- 不实现复杂代码编辑器。
- 不支持用户手写代码回写 Node Tree。

## 前置依赖

- 需要完成 [09-P1-项目保存打开与资源导入.md](./09-P1-项目保存打开与资源导入.md)。

## 实现要点

### 1. Exporter 接口

```ts
interface Exporter {
  target: 'html'
  export(project: Project, pageId: string, options: ExportOptions): Promise<CodeFile[]>
}

interface CodeFile {
  path: string
  content: string
}
```

### 2. 结构生成

从 Node Tree 递归生成 HTML：

- `PageRoot` -> 页面主容器。
- `Container` / `Card` -> `div`。
- `Heading` -> `h1`-`h6`。
- `Text` -> `p` 或 `span`。
- `Button` -> `button` 或 `a`。
- `Image` -> `img`。
- `Input` -> `input`。
- `Divider` -> `hr`。

### 3. CSS 生成

- 每个节点生成稳定 class，例如 `.pf-n-abc`。
- `tokens` 输出到 `:root`。
- `node.style` 输出基础 class。
- `node.responsive` 输出 media query。
- token 引用输出为 `var(--pf-colors-primary)`。

### 4. JS 生成

MVP 只支持：

- `openUrl`
- `navigate`

没有事件时不生成 JS 或生成空文件。

### 5. 资源处理

导出选项：

```ts
type AssetExportMode = 'copy' | 'inline'
```

- copy：复制到导出目录 `assets/`。
- inline：图片转 data URL。

### 6. 代码视图

代码视图至少支持：

- HTML tab
- CSS tab
- JS tab
- 复制当前 tab
- 重新生成

代码视图内容必须来自 exporter，而不是从画布 DOM 读取。

## 验收标准

- 当前页面可导出单文件 `index.html`。
- 当前页面可导出分离文件 `index.html/styles.css/script.js`。
- 导出 HTML 可直接在浏览器打开。
- token 样式正确。
- 响应式覆盖生成 media query。
- 图片路径在 copy 模式下正确。
- 代码视图与实际导出内容一致。
- 没有隐藏节点时导出完整；隐藏节点默认不导出。

## 测试建议

- 简单页面导出快照测试。
- token CSS variables 测试。
- responsive media query 测试。
- asset copy/inline 测试。
- event JS 输出测试。

## PR Checklist

- [ ] 导出器只读取 Project/Node Tree。
- [ ] 代码视图不依赖画布 DOM。
- [ ] 单文件和分离文件都可用。
- [ ] CSS class 稳定可测试。
- [ ] 导出测试覆盖关键路径。
