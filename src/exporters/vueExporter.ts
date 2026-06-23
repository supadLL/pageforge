import type { Project, Node, DesignTokens } from '@pageforge/schema'
import { isContainer, getComponentDefinition } from '@pageforge/schema'
import {
  styleToCssDecls,
  declsToString,
  tokensToCssText,
  nodeClassName,
  collectVisibleNodes,
  BREAKPOINT_WIDTH,
  escapeText,
  escapeAttr,
  camelToKebab,
  renderPropsContent
} from './exporterUtils'

/**
 * Vue 3 SFC 导出器（docs/steps/15）
 * Node Tree → .vue（template + script setup + style scoped）
 */

export interface VueExportOptions {
  tokensAsVars: boolean
  withScript: boolean
  componentName?: string
  includeHidden?: boolean
}

export const DEFAULT_VUE_OPTIONS: VueExportOptions = {
  tokensAsVars: true,
  withScript: true,
  componentName: 'PageForgePage',
  includeHidden: false
}

export interface CodeFile {
  path: string
  content: string
}

export function toVueSfc(project: Project, pageId: string, options?: Partial<VueExportOptions>): CodeFile[] {
  const opts = { ...DEFAULT_VUE_OPTIONS, ...options }
  const page = project.pages.find((p) => p.id === pageId) ?? project.pages[0]
  if (!page) throw new Error(`page not found: ${pageId}`)

  const nodes = collectVisibleNodes(page.root, opts.includeHidden ?? false)
  const classMap = new Map<string, string>()
  for (const n of nodes) classMap.set(n.id, nodeClassName(n.id))

  // template
  const template = renderTemplate(page.root, classMap, project.tokens, opts.includeHidden ?? false, '')

  // script setup
  const script = opts.withScript ? renderScript(page.root, classMap, opts.includeHidden ?? false) : ''

  // style scoped
  const style = renderStyle(nodes, classMap, project.tokens, opts)

  const sfc = buildSfc(page, template, script, style, opts)
  return [{ path: `${opts.componentName}.vue`, content: sfc }]
}

function renderTemplate(
  node: Node,
  classMap: Map<string, string>,
  tokens: DesignTokens,
  includeHidden: boolean,
  indent: string
): string {
  if (!includeHidden && node.state?.hidden) return ''
  const cls = classMap.get(node.id) ?? ''
  const def = getComponentDefinition(node.type)
  const tag = def.exportHints?.tag ?? 'div'
  const selfClosing = def.exportHints?.selfClosing === true

  if (selfClosing) {
    const attrs = [`class="${cls}"`]
    if (node.type === 'Image') {
      attrs.push(`:src="${JSON.stringify(String(node.props.src ?? ''))}"`)
      attrs.push(`alt="${escapeAttr(String(node.props.alt ?? ''))}"`)
    } else if (node.type === 'Input') {
      attrs.push(`:type="${JSON.stringify(String(node.props.inputType ?? 'text'))}"`)
      if (node.props.placeholder) attrs.push(`placeholder="${escapeAttr(String(node.props.placeholder))}"`)
    }
    return `${indent}<${tag} ${attrs.join(' ')} />`
  }

  if (node.type === 'Heading') {
    const level = Math.max(1, Math.min(6, Number(node.props.level ?? 2)))
    return `${indent}<h${level} class="${cls}">${escapeText(String(node.props.text ?? ''))}</h${level}>`
  }
  if (node.type === 'Text') {
    return `${indent}<p class="${cls}">${escapeText(String(node.props.text ?? ''))}</p>`
  }
  if (node.type === 'Button') {
    const disabled = node.props.disabled ? ' disabled' : ''
    const clickHandler = hasClickEvent(node) ? ` @click="handle${handlerName(node.id)}Click"` : ''
    return `${indent}<button class="${cls}"${clickHandler}${disabled}>${escapeText(String(node.props.text ?? ''))}</button>`
  }
  if (node.type === 'Badge') {
    return `${indent}<span class="${cls}">${escapeText(String(node.props.text ?? ''))}</span>`
  }
  if (node.type === 'Avatar') {
    return `${indent}<div class="${cls}">${escapeText(String(node.props.text ?? ''))}</div>`
  }
  if (node.type === 'SearchBox') {
    const placeholder = escapeAttr(String(node.props.placeholder ?? ''))
    const value = escapeAttr(String(node.props.value ?? ''))
    const disabled = node.props.disabled ? ' disabled' : ''
    return `${indent}<div class="${cls}"><span>Search</span><input type="text" placeholder="${placeholder}" value="${value}"${disabled} /></div>`
  }
  if (node.type === 'ProgressBar') {
    const value = Math.max(0, Math.min(100, Number(node.props.value ?? 0)))
    return `${indent}<div class="${cls}"><span style="display:block;width:${value}%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#06b6d4);"></span></div>`
  }
  // 容器
  let inner = ''
  const propsContent = renderPropsContent(node, indent) ?? ''
  if (node.children && node.children.length > 0) {
    inner =
      '\n' +
      (propsContent ? propsContent + '\n' : '') +
      node.children
        .map((c) => renderTemplate(c, classMap, tokens, includeHidden, indent + '  '))
        .filter(Boolean)
        .join('\n') +
      '\n' +
      indent
  } else if (propsContent) {
    inner = '\n' + propsContent + '\n' + indent
  }
  return `${indent}<${tag} class="${cls}">${inner}</${tag}>`
}

function hasClickEvent(node: Node): boolean {
  return !!node.events?.some((e) => e.type === 'click')
}

function handlerName(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9]/g, '_')
}

function renderScript(root: Node, classMap: Map<string, string>, includeHidden: boolean): string {
  const events = collectClickEvents(root, includeHidden)
  if (events.length === 0) {
    return `<script setup lang="ts">\n// 由 PageForge 生成，无事件\n</script>`
  }
  const lines = ['<script setup lang="ts">', '// 由 PageForge 生成']
  for (const { node, action } of events) {
    const fnName = `handle${handlerName(node.id)}Click`
    if (action.kind === 'openUrl') {
      const target = action.target ?? '_blank'
      lines.push(`function ${fnName}() {`)
      lines.push(`  window.open(${JSON.stringify(action.url)}, ${JSON.stringify(target)})`)
      lines.push(`}`)
    } else if (action.kind === 'navigate') {
      lines.push(`function ${fnName}() {`)
      lines.push(`  window.location.href = ${JSON.stringify(action.to)}`)
      lines.push(`}`)
    }
  }
  lines.push('</script>')
  return lines.join('\n')
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
  tokens: DesignTokens,
  opts: VueExportOptions
): string {
  const blocks: string[] = []
  if (opts.tokensAsVars) {
    blocks.push(`:root {\n${tokensToCssText(tokens)}\n}`)
  }
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
  return blocks.join('\n\n')
}

function buildSfc(
  page: any,
  template: string,
  script: string,
  style: string,
  opts: VueExportOptions
): string {
  const parts: string[] = []
  parts.push(`<template>\n${template}\n</template>`)
  if (script) parts.push(script)
  parts.push(`<style scoped>\n${style}\n</style>`)
  return parts.join('\n\n') + '\n'
}
