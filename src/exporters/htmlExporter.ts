import type {
  Project,
  Node,
  Page,
  StyleMap,
  DesignTokens,
  BreakpointName,
  NodeEvent
} from '@pageforge/schema'
import { getComponentDefinition, isContainer } from '@pageforge/schema'
import { isTokenRef, tokenRefToCssVar } from '@pageforge/schema'
import { renderPropsContent } from './exporterUtils'

/**
 * HTML Exporter（docs/steps/10）
 * 从 Node Tree 确定性生成 HTML/CSS/JS，不读画布 DOM。
 */

export interface ExportOptions {
  /** 单文件（内联 CSS/JS）或分离文件 */
  mode: 'single' | 'split'
  /** 图片资源处理方式 */
  assetMode: 'copy' | 'inline'
  /** 是否包含隐藏节点（node.state.hidden=true） */
  includeHidden: boolean
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  mode: 'single',
  assetMode: 'copy',
  includeHidden: false
}

export interface CodeFile {
  path: string
  content: string
}

export interface Exporter {
  target: 'html'
  export(project: Project, pageId: string, options: ExportOptions): Promise<CodeFile[]>
}

export const htmlExporter: Exporter = {
  target: 'html',
  export: (project, pageId, options) =>
    Promise.resolve(exportHtml(project, pageId, options))
}

function exportHtml(project: Project, pageId: string, options: ExportOptions): CodeFile[] {
  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]
  if (!page) throw new Error(`page not found: ${pageId}`)

  // 1. 收集 CSS：每个 node 一个稳定 class
  const cssBlocks: string[] = []
  const classMap = new Map<string, string>() // nodeId -> className
  const nodeById = new Map<string, Node>()
  collectNodes(page.root, nodeById, options.includeHidden)
  for (const node of nodeById.values()) {
    const cls = `pf-n-${node.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
    classMap.set(node.id, cls)
    const decls = styleToCss(node.style, project.tokens)
    if (Object.keys(decls).length > 0) {
      cssBlocks.push(`.${cls} { ${declsToString(decls)} }`)
    }
    // 响应式覆盖
    if (node.responsive) {
      for (const [bp, override] of Object.entries(node.responsive)) {
        if (override?.style) {
          const decls = styleToCss(override.style, project.tokens)
          if (Object.keys(decls).length > 0) {
            const maxWidth = BREAKPOINT_WIDTH[bp as BreakpointName]
            cssBlocks.push(
              `@media (max-width: ${maxWidth}px) { .${cls} { ${declsToString(decls)} } }`
            )
          }
        }
      }
    }
  }

  // 2. tokens -> CSS variables on :root
  const tokenVars = tokensToCssText(project.tokens)
  const css = `:root {\n${tokenVars}\n}\n\n* { box-sizing: border-box; }\nhtml, body { margin: 0; padding: 0; }\n\n${cssBlocks.join('\n\n')}\n`

  // 3. HTML body
  const htmlBody = renderHtml(page.root, classMap, project, options, '')

  // 4. JS 事件
  const events = collectEvents(page.root, options.includeHidden)
  const js = generateJs(events, classMap)

  const htmlDoc = buildHtmlDoc(page, htmlBody, css, js, options)

  if (options.mode === 'single') {
    return [{ path: 'index.html', content: htmlDoc }]
  }
  return [
    { path: 'index.html', content: buildHtmlDoc(page, htmlBody, null, null, { ...options, mode: 'split' }) },
    { path: 'styles.css', content: css },
    { path: 'script.js', content: js }
  ]
}

const BREAKPOINT_WIDTH: Record<BreakpointName, number> = {
  desktop: 1440,
  laptop: 1024,
  tablet: 768,
  mobile: 375
}

function collectNodes(root: Node, out: Map<string, Node>, includeHidden: boolean): void {
  if (!includeHidden && root.state?.hidden) return
  out.set(root.id, root)
  if (root.children) {
    for (const c of root.children) collectNodes(c, out, includeHidden)
  }
}

function styleToCss(style: StyleMap, tokens: DesignTokens): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(style)) {
    if (v === undefined || v === null) continue
    const cssKey = camelToKebab(k)
    let cssVal = String(v)
    if (typeof v === 'string' && isTokenRef(v)) {
      const cv = tokenRefToCssVar(v)
      if (cv) cssVal = cv
    }
    out[cssKey] = cssVal
  }
  return out
}

function declsToString(decls: Record<string, string>): string {
  return Object.entries(decls)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function tokensToCssText(tokens: DesignTokens): string {
  const lines: string[] = []
  for (const [group, kv] of Object.entries(tokens)) {
    for (const [k, v] of Object.entries(kv)) {
      lines.push(`  --pf-${group}-${k}: ${v};`)
    }
  }
  return lines.join('\n')
}

function renderHtml(
  node: Node,
  classMap: Map<string, string>,
  project: Project,
  options: ExportOptions,
  indent: string
): string {
  if (!options.includeHidden && node.state?.hidden) return ''
  const def = getComponentDefinition(node.type)
  const cls = classMap.get(node.id) ?? ''
  const tag = def.exportHints?.tag ?? 'div'
  const selfClosing = def.exportHints?.selfClosing === true
  const attrs: string[] = [`class="${cls}"`, `data-node-id="${node.id}"`]

  // 内联构造
  let inner = ''
  if (selfClosing) {
    // Image / Input / Divider / hr
    if (node.type === 'Image') {
      attrs.push(`src="${escapeAttr(resolveAsset(node, project, options))}"`)
      attrs.push(`alt="${escapeAttr(String(node.props.alt ?? ''))}"`)
    } else if (node.type === 'Input') {
      attrs.push(`type="${escapeAttr(String(node.props.inputType ?? 'text'))}"`)
      if (node.props.placeholder) attrs.push(`placeholder="${escapeAttr(String(node.props.placeholder))}"`)
      if (node.props.value) attrs.push(`value="${escapeAttr(String(node.props.value))}"`)
      if (node.props.disabled) attrs.push('disabled')
    }
    return `${indent}<${tag} ${attrs.join(' ')} />`
  }

  if (node.type === 'Heading') {
    const level = Math.max(1, Math.min(6, Number(node.props.level ?? 2)))
    const actualTag = `h${level}`
    return `${indent}<${actualTag} ${attrs.join(' ')}>${escapeText(String(node.props.text ?? ''))}</${actualTag}>`
  }
  if (node.type === 'Text') {
    return `${indent}<p ${attrs.join(' ')}>${escapeText(String(node.props.text ?? ''))}</p>`
  }
  if (node.type === 'Button') {
    const disabled = node.props.disabled ? ' disabled' : ''
    return `${indent}<button ${attrs.join(' ')}${disabled}>${escapeText(String(node.props.text ?? ''))}</button>`
  }
  if (node.type === 'Badge') {
    return `${indent}<span ${attrs.join(' ')}>${escapeText(String(node.props.text ?? ''))}</span>`
  }
  if (node.type === 'Avatar') {
    return `${indent}<div ${attrs.join(' ')}>${escapeText(String(node.props.text ?? ''))}</div>`
  }
  if (node.type === 'SearchBox') {
    const placeholder = escapeAttr(String(node.props.placeholder ?? ''))
    const value = escapeAttr(String(node.props.value ?? ''))
    const disabled = node.props.disabled ? ' disabled' : ''
    return `${indent}<div ${attrs.join(' ')}><span>Search</span><input type="text" placeholder="${placeholder}" value="${value}"${disabled} /></div>`
  }
  if (node.type === 'ProgressBar') {
    const value = Math.max(0, Math.min(100, Number(node.props.value ?? 0)))
    return `${indent}<div ${attrs.join(' ')}><span style="display:block;width:${value}%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#06b6d4);"></span></div>`
  }
  if (node.type === 'PageRoot' || isContainer(node.type)) {
    const propsContent = renderPropsContent(node, indent) ?? ''
    if (node.children && node.children.length > 0) {
      inner =
        '\n' +
        (propsContent ? propsContent + '\n' : '') +
        node.children
          .map((c) => renderHtml(c, classMap, project, options, indent + '  '))
          .filter(Boolean)
          .join('\n') +
        '\n' +
        indent
    } else if (propsContent) {
      inner = '\n' + propsContent + '\n' + indent
    }
    return `${indent}<${tag} ${attrs.join(' ')}>${inner}</${tag}>`
  }
  return `${indent}<${tag} ${attrs.join(' ')}>${inner}</${tag}>`
}

function resolveAsset(node: Node, _project: Project, _options: ExportOptions): string {
  // MVP：直接用 props.src（可能为空字符串或 URL）
  // 完整实现应查 project.assets 找 assetId 对应文件
  return String(node.props.src ?? '')
}

function collectEvents(root: Node, includeHidden: boolean): Array<{ node: Node; events: NodeEvent[] }> {
  const out: Array<{ node: Node; events: NodeEvent[] }> = []
  function visit(n: Node) {
    if (!includeHidden && n.state?.hidden) return
    if (n.events && n.events.length > 0) {
      out.push({ node: n, events: n.events })
    }
    n.children?.forEach(visit)
  }
  visit(root)
  return out
}

function generateJs(
  events: Array<{ node: Node; events: NodeEvent[] }>,
  classMap: Map<string, string>
): string {
  if (events.length === 0) return '// No events\n'
  const lines: string[] = ['// PageForge generated events', 'document.addEventListener("DOMContentLoaded", function () {']
  for (const item of events) {
    const cls = classMap.get(item.node.id)
    if (!cls) continue
    for (const ev of item.events) {
      if (ev.type === 'click') {
        if (ev.action.kind === 'navigate') {
          lines.push(`  var el = document.querySelector('.${cls}');`)
          lines.push(`  if (el) el.addEventListener('click', function () { window.location.href = ${JSON.stringify(ev.action.to)}; });`)
        } else if (ev.action.kind === 'openUrl') {
          const target = ev.action.target ?? '_blank'
          lines.push(`  var el = document.querySelector('.${cls}');`)
          lines.push(`  if (el) el.addEventListener('click', function () { window.open(${JSON.stringify(ev.action.url)}, ${JSON.stringify(target)}); });`)
        }
      }
    }
  }
  lines.push('});')
  return lines.join('\n')
}

function buildHtmlDoc(
  page: Page,
  body: string,
  css: string | null,
  js: string | null,
  options: ExportOptions
): string {
  const title = page.meta?.title ?? page.name
  const cssTag = css === null
    ? (options.mode === 'split' ? '<link rel="stylesheet" href="styles.css">' : '')
    : `<style>\n${css}\n</style>`
  const jsTag = js === null
    ? (options.mode === 'split' ? '<script src="script.js"></script>' : '')
    : `<script>\n${js}\n</script>`
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeText(title)}</title>
${cssTag}
</head>
<body>
${body}
${jsTag}
</body>
</html>`
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;')
}

/** 便捷入口：导出当前页面为单文件 HTML */
export function exportSingleHtml(project: Project, pageId: string): string {
  const files = exportHtml(project, pageId, { ...DEFAULT_EXPORT_OPTIONS, mode: 'single' })
  return files[0].content
}

/** 便捷入口：导出当前页面为分离文件 */
export function exportSplitHtml(project: Project, pageId: string): CodeFile[] {
  return exportHtml(project, pageId, { ...DEFAULT_EXPORT_OPTIONS, mode: 'split' })
}
