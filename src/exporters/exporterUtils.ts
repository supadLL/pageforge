import type { StyleMap, DesignTokens, Node } from '@pageforge/schema'
import { isTokenRef, tokenRefToCssVar, isContainer, getComponentDefinition } from '@pageforge/schema'

/**
 * 导出器共享工具（Vue / React / uni-app 复用）
 * HTML 导出器有自己的实现，不强制复用，避免改动已稳定代码。
 */

export function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase()
}

export function styleToCssDecls(style: StyleMap, tokens: DesignTokens): Record<string, string> {
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

export function declsToString(decls: Record<string, string>): string {
  return Object.entries(decls)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')
}

export function tokensToCssText(tokens: DesignTokens, indent = '  '): string {
  const lines: string[] = []
  for (const [group, kv] of Object.entries(tokens)) {
    for (const [k, v] of Object.entries(kv)) {
      lines.push(`${indent}--pf-${group}-${k}: ${v};`)
    }
  }
  return lines.join('\n')
}

export function nodeClassName(nodeId: string): string {
  return `pf-n-${nodeId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/** 收集所有可见节点（排除 hidden） */
export function collectVisibleNodes(root: Node, includeHidden: boolean): Node[] {
  const out: Node[] = []
  function visit(n: Node) {
    if (!includeHidden && n.state?.hidden) return
    out.push(n)
    n.children?.forEach(visit)
  }
  visit(root)
  return out
}

export const BREAKPOINT_WIDTH: Record<string, number> = {
  desktop: 1440,
  laptop: 1024,
  tablet: 768,
  mobile: 375
}

export function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
export function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;')
}

export { isContainer, getComponentDefinition }
