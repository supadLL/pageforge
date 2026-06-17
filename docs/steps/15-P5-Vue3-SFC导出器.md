# P5-1 Vue 3 SFC 导出器

## 目标

把 Node Tree 确定性转译为 Vue 3 单文件组件（SFC），包含 `template` + `script setup` + `scoped style`，作为框架转译的第一个目标。

## 范围

- 实现 `toVueSfc(project, pageId, options): CodeFile[]`。
- `template`：从 Node Tree 递归生成 Vue 模板（kebab-case 标签、`:prop` 绑定、`v-for` 不需要——树是确定的）。
- `script setup`：导出页面级组件，把 tokens 作为 CSS 变量注入、把事件处理函数生成出来。
- `style scoped`：每个节点一个稳定 class，token 引用输出为 CSS 变量，响应式输出 media query。
- AI 增强：用 AI 给组件/变量命名、建议子组件拆分（可选，MVP 先做确定性生成，AI 命名作为可选增强）。
- 代码视图面板加 Vue tab。

## 不做什么

- 不做完整 Vue 工程脚手架（package.json / vite.config / main.ts），只生成页面级 SFC。
- 不做 Props/Emits 的完整类型推导（MVP 用简单绑定）。
- 不做 Composition API 的响应式拆分（MVP 直接渲染）。
- 不做 SSR 兼容。
- AI 命名/拆分建议是可选增强，不做也不阻塞验收。

## 前置依赖

- 需要完成 [14-P4-AI微调.md](./14-P4-AI微调.md)（复用 AI Provider 调用能力，若做 AI 命名增强）。
- HTML 导出器（Step 10）的 `styleToCss` / `tokensToCssText` / `camelToKebab` 可复用。

## 实现要点

### 1. 导出器接口

```ts
// src/exporters/vueExporter.ts
export interface VueExportOptions {
  /** 是否把 tokens 输出为 :root CSS 变量（true）或内联到每个 class（false） */
  tokensAsVars: boolean
  /** 是否生成 <script setup>（false 时只输出 template + style） */
  withScript: boolean
  /** 组件名 */
  componentName?: string
}

export function toVueSfc(project: Project, pageId: string, options: VueExportOptions): CodeFile[]
```

### 2. template 生成

- `PageRoot` → `<main class="pf-page">`
- `Container` / `Card` → `<div>`
- `Heading` → `<h1>`-`<h6>`（按 props.level）
- `Text` → `<p>`
- `Button` → `<button @click="...">`
- `Image` → `<img :src="..." :alt="..." />`
- `Input` → `<input :type="..." :placeholder="..." />`
- `Divider` → `<hr />`
- 每个节点带 `:class="pf-n-{id}"`，事件绑定 `@click="handleNodeIdClick"`。
- props 文本（Heading.text / Text.text / Button.text）用 `{{ }}` 插值或 `:prop` 绑定（MVP 用插值更直观）。

### 3. script setup 生成

```vue
<script setup lang="ts">
// 由 PageForge 生成
import { ref } from 'vue'

// 事件处理
function handleB1Click() {
  window.open('https://example.com', '_blank')
}
function handleB2Click() {
  window.location.href = '/about'
}
</script>
```

- 把每个有事件的节点生成一个 `handleNodeIdClick` 函数。
- MVP 不做 Props/Emits，组件自包含。

### 4. style scoped 生成

- 复用 HTML 导出器的 CSS 生成逻辑，但加 `scoped`。
- token 引用输出为 `var(--pf-colors-primary)`，并在 `:root` 块定义。
- 响应式覆盖输出为 `@media`。

### 5. AI 增强（可选）

若启用 AI 命名：
- 把 Node Tree 发给 AI，要求返回 `{ nodeId: { componentName, varName } }` 映射。
- 用映射结果给 class / 函数命名（如 `handleHeroCtaClick` 而非 `handleB1Click`）。
- 可选：建议把重复结构拆成子组件（MVP 不实现拆分，只生成单文件）。

### 6. 代码视图

- 代码视图面板加 "Vue" tab。
- 切换到 Vue tab 时调用 `toVueSfc`，展示生成的 SFC。
- 复制 / 导出按钮复用现有逻辑。

## 验收标准

- 当前页面可导出为单个 `.vue` 文件。
- 导出的 SFC 在一个最小 Vue 3 工程（vite + vue）里能直接渲染，样式正确。
- token 引用输出为 CSS 变量。
- 响应式覆盖输出为 media query。
- 事件（click → openUrl / navigate）在生成的 SFC 里可用。
- 代码视图 Vue tab 内容与导出一致。
- 隐藏节点默认不导出。

## 测试建议

- template 生成快照测试：每种组件类型对应标签。
- script setup 生成测试：事件函数命名、openUrl/navigate 逻辑。
- style 生成测试：token 变量、media query、scoped。
- 端到端：把生成的 SFC 写到临时 Vue 工程能编译（可选，手动验证）。
- AI 命名增强（若实现）：mock AI 返回映射，验证命名替换。

## PR Checklist

- [ ] 导出器只读 Node Tree，不读画布 DOM。
- [ ] 生成的 SFC 在独立 Vue 工程可运行。
- [ ] 代码视图 Vue tab 可用。
- [ ] token 与响应式输出正确。
- [ ] 测试覆盖 template / script / style 生成。
- [ ] 文档更新：Vue 导出说明。
