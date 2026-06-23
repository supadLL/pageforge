import type { Project, Node, DesignTokens } from '@pageforge/schema'
import { getComponentDefinition } from '@pageforge/schema'
import {
  styleToCssDecls,
  declsToString,
  tokensToCssText,
  collectVisibleNodes,
  escapeText,
  escapeAttr,
  nodeClassName
} from './exporterUtils'

/**
 * uni-app 导出器（docs/steps/17）
 * Node Tree → uni-app 页面 .vue（view/text/image/button 标签）
 */

export interface UniAppExportOptions {
  pagePath: string
  navigationBarTitleText?: string
  withPagesJson: boolean
  includeHidden?: boolean
}

export const DEFAULT_UNIAPP_OPTIONS: UniAppExportOptions = {
  pagePath: 'pages/index/index',
  navigationBarTitleText: '首页',
  withPagesJson: true,
  includeHidden: false
}

export interface CodeFile {
  path: string
  content: string
}

export function toUniApp(project: Project, pageId: string, options?: Partial<UniAppExportOptions>): CodeFile[] {
  const opts = { ...DEFAULT_UNIAPP_OPTIONS, ...options }
  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]
  if (!page) throw new Error(`page not found: ${pageId}`)

  const nodes = collectVisibleNodes(page.root, opts.includeHidden ?? false)
  const classMap = new Map<string, string>()
  for (const n of nodes) classMap.set(n.id, nodeClassName(n.id))

  const template = renderTemplate(page.root, classMap, opts.includeHidden ?? false, '')
  const script = renderScript(page.root, classMap, opts.includeHidden ?? false)
  const style = renderStyle(nodes, classMap, project.tokens)

  // 文件名取 pagePath 末段
  const fileName = opts.pagePath.split('/').pop() || 'index'
  const files: CodeFile[] = [{ path: `${fileName}.vue`, content: buildSfc(template, script, style) }]

  if (opts.withPagesJson) {
    files.push({
      path: 'pages.json.fragment',
      content: JSON.stringify(
        {
          path: opts.pagePath,
          style: { navigationBarTitleText: opts.navigationBarTitleText ?? '首页' }
        },
        null,
        2
      )
    })
  }
  return files
}

function renderTemplate(
  node: Node,
  classMap: Map<string, string>,
  includeHidden: boolean,
  indent: string
): string {
  if (!includeHidden && node.state?.hidden) return ''
  const cls = classMap.get(node.id) ?? ''

  switch (node.type) {
    case 'PageRoot': {
      const inner = renderChildren(node, classMap, includeHidden, indent + '  ')
      return `${indent}<view class="${cls}">\n${inner}\n${indent}</view>`
    }
    case 'Container':
    case 'Card':
    case 'BackgroundPanel':
    case 'GlassPanel':
    case 'GradientCard':
    case 'Navbar':
    case 'HeroBlock':
    case 'StatsCard':
    case 'FeatureTile':
    case 'Tabs':
    case 'Sidebar':
    case 'PricingCard': {
      const inner = renderChildren(node, classMap, includeHidden, indent + '  ')
      return `${indent}<view class="${cls}">\n${inner}\n${indent}</view>`
    }
    case 'Heading': {
      const level = Math.max(1, Math.min(6, Number(node.props.level ?? 2)))
      return `${indent}<text class="${cls} pf-h${level}">${escapeText(String(node.props.text ?? ''))}</text>`
    }
    case 'Text':
      return `${indent}<text class="${cls}">${escapeText(String(node.props.text ?? ''))}</text>`
    case 'Badge':
    case 'Avatar':
      return `${indent}<text class="${cls}">${escapeText(String(node.props.text ?? ''))}</text>`
    case 'Button': {
      const tap = hasClickEvent(node) ? ` @tap="handle${handlerName(node.id)}Tap"` : ''
      const disabled = node.props.disabled ? ' disabled' : ''
      return `${indent}<button class="${cls}"${tap}${disabled}>${escapeText(String(node.props.text ?? ''))}</button>`
    }
    case 'SearchBox': {
      const disabled = node.props.disabled ? ' disabled' : ''
      return `${indent}<view class="${cls}"><text>Search</text><input type="text" placeholder="${escapeAttr(String(node.props.placeholder ?? ''))}" value="${escapeAttr(String(node.props.value ?? ''))}"${disabled} /></view>`
    }
    case 'ProgressBar': {
      const value = Math.max(0, Math.min(100, Number(node.props.value ?? 0)))
      return `${indent}<view class="${cls}"><view style="width:${value}%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#06b6d4);"></view></view>`
    }
    case 'Image': {
      const mode = mapFit(node.props.fit)
      return `${indent}<image class="${cls}" src="${escapeAttr(String(node.props.src ?? ''))}" mode="${mode}" />`
    }
    case 'Input':
      return `${indent}<input class="${cls}" type="${escapeAttr(String(node.props.inputType ?? 'text'))}" placeholder="${escapeAttr(String(node.props.placeholder ?? ''))}" />`
    case 'Divider':
      return `${indent}<view class="${cls} pf-divider"></view>`
    default:
      return `${indent}<view class="${cls}"></view>`
  }
}

function renderChildren(
  node: Node,
  classMap: Map<string, string>,
  includeHidden: boolean,
  indent: string
): string {
  if (!node.children || node.children.length === 0) return ''
  return node.children
    .map((c) => renderTemplate(c, classMap, includeHidden, indent))
    .filter(Boolean)
    .join('\n')
}

function mapFit(fit: unknown): string {
  switch (fit) {
    case 'cover':
      return 'aspectFill'
    case 'contain':
      return 'aspectFit'
    case 'fill':
      return 'scaleToFill'
    case 'none':
      return 'center'
    default:
      return 'aspectFill'
  }
}

function hasClickEvent(node: Node): boolean {
  return !!node.events?.some((e) => e.type === 'click')
}
function handlerName(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9]/g, '_')
}

function renderScript(root: Node, _classMap: Map<string, string>, includeHidden: boolean): string {
  const events = collectClickEvents(root, includeHidden)
  const methods: string[] = []
  for (const { node, action } of events) {
    const fnName = `handle${handlerName(node.id)}Tap`
    if (action.kind === 'openUrl' || action.kind === 'navigate') {
      const url = action.kind === 'openUrl' ? action.url : action.to
      methods.push(`    ${fnName}() {`)
      methods.push(`      uni.navigateTo({ url: ${JSON.stringify(url)} })`)
      methods.push(`    }`)
    }
  }
  const methodsBlock =
    methods.length > 0
      ? `,\n  methods: {\n${methods.join(',\n')}\n  }`
      : ''
  return `<script>\nexport default {${methodsBlock}\n}\n</script>`
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

function renderStyle(
  nodes: Node[],
  classMap: Map<string, string>,
  tokens: DesignTokens
): string {
  const blocks: string[] = []
  blocks.push(`page {\n${tokensToCssText(tokens)}\n}`)
  for (const n of nodes) {
    const cls = classMap.get(n.id) ?? ''
    const decls = styleToCssDecls(n.style, tokens)
    if (Object.keys(decls).length > 0) {
      blocks.push(`.${cls} { ${declsToString(decls)} }`)
    }
  }
  // divider 默认样式
  blocks.push('.pf-divider { width: 100%; height: 1px; background-color: #e5e7eb; }')
  return blocks.join('\n\n')
}

function buildSfc(template: string, script: string, style: string): string {
  return `<template>\n${template}\n</template>\n\n${script}\n\n<style>\n${style}\n</style>\n`
}
