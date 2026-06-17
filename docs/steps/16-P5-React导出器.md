# P5-2 React 导出器

## 目标

把 Node Tree 确定性转译为 React 函数组件 + JSX + CSS Modules，作为框架转译的第二个目标。

## 范围

- 实现 `toReact(project, pageId, options): CodeFile[]`。
- 生成一个 `Page.tsx`（函数组件）+ 一个 `Page.module.css`（CSS Modules）。
- JSX：从 Node Tree 递归生成，className 引用 CSS Modules。
- 事件处理：在组件内生成 `handleNodeIdClick` 箭头函数。
- token 输出为 CSS 变量（`:root` 或 `:host`）。
- 响应式输出为 media query。
- 代码视图加 React tab。

## 不做什么

- 不做完整 React 工程脚手架（package.json / vite.config / main.tsx）。
- 不做 Hooks 拆分或状态管理（MVP 纯展示组件）。
- 不做 TypeScript Props/Emits 接口（MVP 自包含）。
- 不做 styled-components / Tailwind 等替代样式方案（MVP 只做 CSS Modules）。
- 不做 SSR / RSC 兼容。

## 前置依赖

- 需要完成 [15-P5-Vue3-SFC导出器.md](./15-P5-Vue3-SFC导出器.md)（复用 style 生成逻辑）。

## 实现要点

### 1. 导出器接口

```ts
// src/exporters/reactExporter.ts
export interface ReactExportOptions {
  /** 样式方案：CSS Modules（MVP 唯一支持） */
  styleMode: 'css-modules'
  /** 组件名 */
  componentName?: string
  /** 是否生成 TypeScript（.tsx） */
  typescript: boolean
}

export function toReact(project: Project, pageId: string, options: ReactExportOptions): CodeFile[]
```

### 2. JSX 生成

- `PageRoot` → `<main className={styles.pfPage}>`
- `Container` / `Card` → `<div>`
- `Heading` → `<h1>`-`<h6>`
- `Text` → `<p>`
- `Button` → `<button onClick={handleB1Click}>`
- `Image` → `<img src={...} alt={...} />`
- `Input` → `<input type={...} placeholder={...} />`
- `Divider` → `<hr />`
- className 用 `styles.pfNId` 形式（CSS Modules）。
- 文本内容用 `{}` 表达式或直接字符串。

### 3. 组件函数生成

```tsx
import styles from './Page.module.css'

export default function Page() {
  const handleB1Click = () => {
    window.open('https://example.com', '_blank')
  }
  const handleB2Click = () => {
    window.location.href = '/about'
  }
  return (
    <main className={styles.pfPage}>
      ...
    </main>
  )
}
```

### 4. CSS Modules 生成

- 复用 HTML 导出器的 CSS 生成，但 class 名转为 `pfNId`（camelCase，合法 JS 标识符）。
- token 输出为 `:root { --pf-colors-primary: ... }`。
- 响应式输出为 `@media`。

### 5. 代码视图

- 加 "React" tab，切换时调 `toReact`。

## 验收标准

- 当前页面可导出为 `Page.tsx` + `Page.module.css`。
- 在最小 React 工程（vite + react）里能直接渲染，样式正确。
- 事件可用。
- token 与响应式输出正确。
- 代码视图 React tab 内容与导出一致。
- 隐藏节点默认不导出。

## 测试建议

- JSX 生成快照测试：每种组件类型。
- 组件函数生成测试：事件处理、import。
- CSS Modules 生成测试：class 命名、token、media query。
- 端到端：生成的文件在临时 React 工程能编译（手动验证）。

## PR Checklist

- [ ] 导出器只读 Node Tree。
- [ ] 生成的 React 组件在独立工程可运行。
- [ ] 代码视图 React tab 可用。
- [ ] 测试覆盖 JSX / 组件 / CSS Modules 生成。
- [ ] 文档更新：React 导出说明。
