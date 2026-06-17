import type { Node, StyleMap, DesignTokens } from '@pageforge/schema'
import { resolveToken, tokenRefToCssVar, isTokenRef } from '@pageforge/schema'

/**
 * 把 StyleMap 中的 token 引用解析为 CSS 变量值。
 * 非 token 引用原样返回。
 * 编辑器渲染使用内联 style 形式（参见 docs/02 §4.2）。
 */
export function resolveStyleMap(style: StyleMap, tokens: DesignTokens): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(style)) {
    if (v === undefined) continue
    if (typeof v === 'string' && isTokenRef(v)) {
      // 先尝试用 var() 让 CSS 自行解析；这样设计令牌修改后无需重新渲染
      const cssVar = tokenRefToCssVar(v)
      if (cssVar) {
        out[k] = cssVar
        continue
      }
    }
    out[k] = String(v)
  }
  return out
}

export function tokensToCssVars(tokens: DesignTokens): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [group, kv] of Object.entries(tokens)) {
    for (const [k, v] of Object.entries(kv)) {
      out[`--pf-${group}-${k}`] = String(v)
    }
  }
  return out
}

/**
 * 判断一个 node 是否为容器组件（用于渲染 children 槽位）。
 */
export function isContainerNode(node: Node): boolean {
  return Array.isArray(node.children)
}
