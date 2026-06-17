# P5-3 uni-app / 小程序页面片段导出器

## 目标

把 Node Tree 转译为 uni-app 页面片段（`.vue` 页面 + 必要的 `pages.json` 片段），覆盖移动端/小程序场景。MVP 只生成页面级代码片段，不生成完整工程脚手架。

## 范围

- 实现 `toUniApp(project, pageId, options): CodeFile[]`。
- 生成一个 uni-app 页面 `.vue`（template + script + style）。
- template 用 uni-app 兼容标签（`view` / `text` / `image` / `button` 等，而非 `div` / `p` / `img`）。
- 事件用 uni-app 语法（`@tap` 而非 `@click`，`uni.navigateTo` 而非 `window.location`）。
- 生成 `pages.json` 片段建议（page path + style），供用户手动合并到工程。
- token 输出为 CSS 变量（uni-app 支持）。
- 响应式：uni-app 主要面向移动端，MVP 只输出移动端样式（不生成 media query）。
- 代码视图加 "uni-app" tab。

## 不做什么

- 不生成完整 uni-app 工程（manifest.json / App.vue / main.js / pages.json 完整文件）。
- 不做小程序多端差异适配（微信/支付宝/字节）的完整覆盖，MVP 只保证微信小程序兼容。
- 不做 `uni-app x` / `uvue` 语法。
- 不做 nvue 原生渲染。
- 不做 ConditionSlot / 子组件拆分。
- 不生成 `static/` 资源处理（用户手动处理图片）。

## 前置依赖

- 需要完成 [16-P5-React导出器.md](./16-P5-React导出器.md)（复用 style 生成逻辑）。

## 实现要点

### 1. 导出器接口

```ts
// src/exporters/uniAppExporter.ts
export interface UniAppExportOptions {
  /** 页面路径，如 pages/index/index */
  pagePath: string
  /** 导航栏标题 */
  navigationBarTitleText?: string
  /** 是否生成 pages.json 片段 */
  withPagesJson: boolean
}

export function toUniApp(project: Project, pageId: string, options: UniAppExportOptions): CodeFile[]
```

### 2. 标签映射

| Node type | HTML 标签 | uni-app 标签 |
|---|---|---|
| PageRoot | `<main>` | `<view class="pf-page">` |
| Container / Card | `<div>` | `<view>` |
| Heading | `<h1>`-`<h6>` | `<text class="pf-h1">` |
| Text | `<p>` | `<text>` |
| Button | `<button>` | `<button @tap="...">` |
| Image | `<img>` | `<image :src="..." mode="..." />` |
| Input | `<input>` | `<input :type="..." placeholder="..." />` |
| Divider | `<hr>` | `<view class="pf-divider" />` |

注意：
- 小程序无 `<h1>`-`<h6>`，用 `<text>` + class 模拟。
- 小程序无 `<hr>`，用 `<view>` + 样式模拟。
- `<image>` 的 `mode` 对应 `object-fit`（cover/contain 等）。

### 3. 事件映射

| 事件 action | HTML/Vue | uni-app |
|---|---|---|
| `click → openUrl` | `window.open(url)` | `uni.navigateTo({ url })` 或 `#ifdef H5` 分支 |
| `click → navigate` | `window.location.href = to` | `uni.navigateTo({ url: to })` |

MVP 简化：所有 navigate/openUrl 都用 `uni.navigateTo`（小程序内页面跳转），外部 URL 用 `#ifdef H5` 条件编译注释提示。

### 4. script 生成

```vue
<script>
export default {
  methods: {
    handleB1Tap() {
      uni.navigateTo({ url: '/pages/about/about' })
    }
  }
}
</script>
```

- 用 Options API（uni-app 兼容性最好）。
- 不用 `setup`（uni-app 对 script setup 支持因平台而异，MVP 求稳）。

### 5. style 生成

- class 名用 `pf-n-{id}`。
- token 输出为 CSS 变量，定义在 `page` 根样式。
- 小程序对 CSS 变量支持有限，MVP 仍输出变量（H5/App 端可用，小程序端降级）。
- 不输出 media query（移动端单端）。
- 单位：MVP 保持 `px`（uni-app 会自动转 rpx 的工程配置由用户处理）。

### 6. pages.json 片段

```json
{
  "path": "pages/index/index",
  "style": {
    "navigationBarTitleText": "首页"
  }
}
```

作为单独文件 `pages.json.fragment` 输出，提示用户手动合并到工程 `pages.json`。

### 7. 代码视图

- 加 "uni-app" tab。

## 验收标准

- 当前页面可导出为 uni-app 页面 `.vue` + `pages.json.fragment`。
- 生成的 `.vue` 在一个最小 uni-app 工程（HBuilderX 或 vue-cli 模板）里能作为页面加载，样式基本正确。
- 事件（tap → navigate）在 uni-app 里可用。
- 标签全部用 uni-app 兼容标签，无 `<div>` / `<p>` / `<img>` / `<h1>`。
- 代码视图 uni-app tab 内容与导出一致。
- 隐藏节点默认不导出。

## 测试建议

- 标签映射测试：每种组件类型对应 uni-app 标签。
- 事件映射测试：navigate/openUrl → uni.navigateTo。
- script 生成测试：Options API、methods。
- style 生成测试：class 命名、token 变量、无 media query。
- pages.json 片段测试。
- 端到端：生成的页面在临时 uni-app 工程能编译（手动验证）。

## PR Checklist

- [ ] 导出器只读 Node Tree。
- [ ] 标签全部 uni-app 兼容。
- [ ] 事件用 uni-app API。
- [ ] 代码视图 uni-app tab 可用。
- [ ] 测试覆盖标签/事件/script/style 生成。
- [ ] 文档更新：uni-app 导出说明 + pages.json 合并提示。
