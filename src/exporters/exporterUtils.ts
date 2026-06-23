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

/**
 * 生成容器组件的 props 文本内容（HTML 片段）。
 * 用于 Navbar/HeroBlock/StatsCard/FeatureTile/PricingCard/Sidebar
 * 这些"带固定文案槽位的容器"在导出时把 props 文本渲染出来。
 *
 * 返回 null 表示该组件不需要 props 文本（纯容器或已由调用方处理）。
 */
export function renderPropsContent(node: Node, indent: string): string | null {
  const esc = escapeText
  switch (node.type) {
    case 'Navbar': {
      const t = esc(String(node.props.title ?? 'Brand'))
      return `${indent}  <span style="font-weight:700;font-size:18px">${t}</span>`
    }
    case 'HeroBlock': {
      const lines: string[] = []
      if (node.props.title) lines.push(`${indent}  <h1 style="font-size:36px;font-weight:800;margin:0">${esc(String(node.props.title))}</h1>`)
      if (node.props.subtitle) lines.push(`${indent}  <p style="font-size:18px;opacity:0.85;margin:0">${esc(String(node.props.subtitle))}</p>`)
      return lines.length > 0 ? lines.join('\n') : null
    }
    case 'StatsCard': {
      return `${indent}  <span style="font-size:13px;opacity:0.7">${esc(String(node.props.label ?? ''))}</span>\n${indent}  <span style="font-size:28px;font-weight:800">${esc(String(node.props.value ?? ''))}</span>`
    }
    case 'FeatureTile': {
      const lines: string[] = []
      if (node.props.title) lines.push(`${indent}  <h3 style="font-size:18px;font-weight:700;margin:0">${esc(String(node.props.title))}</h3>`)
      if (node.props.description) lines.push(`${indent}  <p style="font-size:14px;opacity:0.75;margin:0">${esc(String(node.props.description))}</p>`)
      return lines.length > 0 ? lines.join('\n') : null
    }
    case 'PricingCard': {
      const lines: string[] = []
      if (node.props.plan) lines.push(`${indent}  <span style="font-size:16px;font-weight:700">${esc(String(node.props.plan))}</span>`)
      if (node.props.price) lines.push(`${indent}  <span style="font-size:28px;font-weight:800">${esc(String(node.props.price))}</span>`)
      if (node.props.featured) lines.push(`${indent}  <span style="font-size:11px;color:#f97316;font-weight:700">★ 推荐</span>`)
      return lines.length > 0 ? lines.join('\n') : null
    }
    case 'Sidebar': {
      if (!node.props.title) return null
      return `${indent}  <span style="font-size:14px;font-weight:700;opacity:0.6;text-transform:uppercase">${esc(String(node.props.title))}</span>`
    }
    default:
      return null
  }
}

