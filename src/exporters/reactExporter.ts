import type { Project, Node, DesignTokens } from '@pageforge/schema'
import { getComponentDefinition } from '@pageforge/schema'
import {
  styleToCssDecls,
  declsToString,
  tokensToCssText,
  collectVisibleNodes,
  BREAKPOINT_WIDTH,
  escapeText,
  escapeAttr
} from './exporterUtils'

/**
 * React 导出器（docs/steps/16）
 * Node Tree → Page.tsx + Page.module.css（CSS Modules）
 */

export interface ReactExportOptions {
  styleMode: 'css-modules'
  componentName?: string
  typescript: boolean
  includeHidden?: boolean
}

export const DEFAULT_REACT_OPTIONS: ReactExportOptions = {
  styleMode: 'css-modules',
  componentName: 'Page',
  typescript: true,
  includeHidden: false
}

export interface CodeFile {
  path: string
  content: string
}

export function toReact(project: Project, pageId: string, options?: Partial<ReactExportOptions>): CodeFile[] {
  const opts = { ...DEFAULT_REACT_OPTIONS, ...options }
  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]
  if (!page) throw new Error(`page not found: ${pageId}`)

  const nodes = collectVisibleNodes(page.root, opts.includeHidden ?? false)
  const classMap = new Map<string, string>()
  for (const n of nodes) classMap.set(n.id, cssModuleName(n.id))

  const tsx = renderTsx(page.root, classMap, opts)
  const css = renderCssModules(nodes, classMap, project.tokens)

  const ext = opts.typescript ? 'tsx' : 'jsx'
  return [
    { path: `${opts.componentName}.${ext}`, content: tsx },
    { path: `${opts.componentName}.module.css`, content: css }
  ]
}

function cssModuleName(nodeId: string): string {
  // camelCase 合法 JS 标识符
  const cleaned = nodeId.replace(/[^a-zA-Z0-9]/g, '_')
  return `pf_${cleaned}`
}

function renderTsx(
  root: Node,
  classMap: Map<string, string>,
  opts: ReactExportOptions
): string {
  const events = collectClickEvents(root, opts.includeHidden ?? false)
  const handlerLines: string[] = []
  for (const { node, action } of events) {
    const fnName = `handle${handlerName(node.id)}Click`
    if (action.kind === 'openUrl') {
      const target = action.target ?? '_blank'
      handlerLines.push(`  const ${fnName} = () => {`)
      handlerLines.push(`    window.open(${JSON.stringify(action.url)}, ${JSON.stringify(target)})`)
      handlerLines.push(`  }`)
    } else if (action.kind === 'navigate') {
      handlerLines.push(`  const ${fnName} = () => {`)
      handlerLines.push(`    window.location.href = ${JSON.stringify(action.to)}`)
      handlerLines.push(`  }`)
    }
  }

  const jsx = renderJsx(root, classMap, opts.includeHidden ?? false, '    ')
  const compName = opts.componentName ?? 'Page'

  const lines: string[] = []
  lines.push(`import styles from './${compName}.module.css'`)
  lines.push('')
  lines.push(`export default function ${compName}() {`)
  if (handlerLines.length > 0) {
    lines.push(...handlerLines)
    lines.push('')
  }
  lines.push(`  return (`)
  lines.push(jsx)
  lines.push(`  )`)
  lines.push(`}`)
  return lines.join('\n') + '\n'
}

function handlerName(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9]/g, '_')
}

function renderJsx(
  node: Node,
  classMap: Map<string, string>,
  includeHidden: boolean,
  indent: string
): string {
  if (!includeHidden && node.state?.hidden) return ''
  const cls = classMap.get(node.id) ?? ''
  const def = getComponentDefinition(node.type)
  const tag = def.exportHints?.tag ?? 'div'
  const selfClosing = def.exportHints?.selfClosing === true
  const className = `className={styles.${cls}}`

  if (selfClosing) {
    if (node.type === 'Image') {
      return `${indent}<${tag} ${className} src={${JSON.stringify(String(node.props.src ?? ''))}} alt={${JSON.stringify(String(node.props.alt ?? ''))}} />`
    }
    if (node.type === 'Input') {
      const extra = node.props.placeholder ? ` placeholder={${JSON.stringify(String(node.props.placeholder))}}` : ''
      return `${indent}<${tag} ${className} type={${JSON.stringify(String(node.props.inputType ?? 'text'))}}${extra} />`
    }
    return `${indent}<${tag} ${className} />`
  }

  if (node.type === 'Heading') {
    const level = Math.max(1, Math.min(6, Number(node.props.level ?? 2)))
    return `${indent}<h${level} ${className}>${escapeText(String(node.props.text ?? ''))}</h${level}>`
  }
  if (node.type === 'Text') {
    return `${indent}<p ${className}>${escapeText(String(node.props.text ?? ''))}</p>`
  }
  if (node.type === 'Button') {
    const clickHandler = hasClickEvent(node) ? ` onClick={handle${handlerName(node.id)}Click}` : ''
    const disabled = node.props.disabled ? ' disabled' : ''
    return `${indent}<button ${className}${clickHandler}${disabled}>${escapeText(String(node.props.text ?? ''))}</button>`
  }
  if (node.type === 'Badge') {
    return `${indent}<span ${className}>${escapeText(String(node.props.text ?? ''))}</span>`
  }
  if (node.type === 'Avatar') {
    return `${indent}<div ${className}>${escapeText(String(node.props.text ?? ''))}</div>`
  }
  if (node.type === 'SearchBox') {
    const disabled = node.props.disabled ? ' disabled' : ''
    return `${indent}<div ${className}><span>Search</span><input type="text" placeholder={${JSON.stringify(String(node.props.placeholder ?? ''))}} defaultValue={${JSON.stringify(String(node.props.value ?? ''))}}${disabled} /></div>`
  }
  if (node.type === 'ProgressBar') {
    const value = Math.max(0, Math.min(100, Number(node.props.value ?? 0)))
    return `${indent}<div ${className}><span style={{ display: 'block', width: '${value}%', height: '100%', borderRadius: 'inherit', background: 'linear-gradient(90deg,#2563eb,#06b6d4)' }} /></div>`
  }
  // 容器
  let inner = ''
  if (node.children && node.children.length > 0) {
    inner =
      '\n' +
      node.children
        .map((c) => renderJsx(c, classMap, includeHidden, indent + '  '))
        .filter(Boolean)
        .join('\n') +
      '\n' +
      indent
  }
  return `${indent}<${tag} ${className}>${inner}</${tag}>`
}

function hasClickEvent(node: Node): boolean {
  return !!node.events?.some((e) => e.type === 'click')
}

function collectClickEvents(
  root: Node,
  includeHidden: boolean
): Array<{ node: Node; action: any }> {
  const out: Array<{ node: Node; action: any }> = []
  function visit(n: Node) {
    if (!includeHidden && n.state?.hidden) return
    if (n.events) {
      for (const e of n.events) {
        if (e.type === 'click') out.push({ node: n, action: e.action })
      }
    }
    n.children?.forEach(visit)
  }
  visit(root)
  return out
}

function renderCssModules(
  nodes: Node[],
  classMap: Map<string, string>,
  tokens: DesignTokens
): string {
  const blocks: string[] = []
  blocks.push(`:root {\n${tokensToCssText(tokens)}\n}`)
  for (const n of nodes) {
    const cls = classMap.get(n.id) ?? ''
    const decls = styleToCssDecls(n.style, tokens)
    if (Object.keys(decls).length > 0) {
      blocks.push(`.${cls} { ${declsToString(decls)} }`)
    }
    if (n.responsive) {
      for (const [bp, override] of Object.entries(n.responsive)) {
        if (override?.style) {
          const d = styleToCssDecls(override.style, tokens)
          if (Object.keys(d).length > 0) {
            const w = BREAKPOINT_WIDTH[bp]
            blocks.push(`@media (max-width: ${w}px) { .${cls} { ${declsToString(d)} } }`)
          }
        }
      }
    }
  }
  return blocks.join('\n\n') + '\n'
}
