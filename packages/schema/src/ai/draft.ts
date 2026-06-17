/**
 * AI 图生页面草稿协议（docs/steps/13）
 */
import type { Node } from '../types/node.js'
import type { DesignTokens } from '../types/tokens.js'
import { createNode } from '../factories/node.js'
import { genNodeId } from '../factories/node.js'
import { hasDefinition } from '../components/registry.js'
import { validateNode } from '../validation/index.js'
import type { ValidationResult } from '../validation/ajv.js'

export interface GeneratedPageDraft {
  summary: string
  tokens?: Partial<DesignTokens>
  root: Partial<Node>
  warnings?: string[]
}

/**
 * 校验 draft 的最外层结构（不深度校验 node，深度校验在 normalize 里做）。
 */
export function validateGeneratedDraft(input: unknown): ValidationResult<GeneratedPageDraft> {
  if (!input || typeof input !== 'object') {
    return { valid: false, issues: [{ path: '<root>', message: 'draft must be object', keyword: 'type' }] }
  }
  const d = input as Record<string, unknown>
  const issues: { path: string; message: string; keyword: string }[] = []
  if (typeof d.summary !== 'string') {
    issues.push({ path: 'summary', message: 'summary must be string', keyword: 'type' })
  }
  if (!d.root || typeof d.root !== 'object') {
    issues.push({ path: 'root', message: 'root must be object', keyword: 'type' })
  }
  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, data: d as unknown as GeneratedPageDraft, issues: [] }
}

/**
 * 把草稿归一化为合法 Node Tree。
 * 流程：
 *  1. 递归遍历 draft.root
 *  2. type 不在注册表 -> warning + 跳过（返回 null）
 *  3. 用 createNode(type) 取默认值，再用 draft 值覆盖 props/style
 *  4. 补 id
 *  5. 非容器丢弃 children
 *  6. 若 root.type 不是 PageRoot，包一层 PageRoot
 *  7. 合并 tokens 到给定 base（不覆盖已有 key）
 */
export function normalizeGeneratedDraft(
  draft: GeneratedPageDraft,
  baseTokens?: DesignTokens
): { root: Node; warnings: string[]; tokens: DesignTokens | null } {
  const warnings: string[] = []
  const normalized = normalizeNode(draft.root, '', warnings)

  let root: Node
  if (!normalized) {
    warnings.push('draft.root 无效，使用空 PageRoot')
    root = createPageRootEmpty()
  } else if (normalized.type !== 'PageRoot') {
    // 包一层 PageRoot
    root = createPageRootEmpty()
    root.children = [normalized]
  } else {
    root = normalized
  }

  // 合并 tokens
  let tokens: DesignTokens | null = null
  if (draft.tokens && baseTokens) {
    tokens = mergeTokens(baseTokens, draft.tokens)
  } else if (draft.tokens) {
    // 没有 base 也返回部分（调用方决定是否用）
    tokens = draft.tokens as DesignTokens
  }

  if (warnings.length > 0 && !draft.warnings?.length) {
    // 保留 AI 自带的 warnings
  }
  return { root, warnings, tokens }
}

function normalizeNode(
  partial: Partial<Node> | undefined,
  path: string,
  warnings: string[]
): Node | null {
  if (!partial || typeof partial !== 'object') {
    if (path) warnings.push(`${path}: 节点无效`)
    return null
  }
  const type = (partial as { type?: unknown }).type
  if (typeof type !== 'string' || !hasDefinition(type)) {
    warnings.push(`${path || 'root'}: 未知组件类型 ${String(type)}，跳过`)
    return null
  }

  // 用 createNode 取默认 props/style，再用 draft 值覆盖
  const node = createNode(type as any, {
    id: typeof partial.id === 'string' ? partial.id : genNodeId(type.toLowerCase().slice(0, 3)),
    name: typeof partial.name === 'string' ? partial.name : undefined,
    props: partial.props && typeof partial.props === 'object' ? (partial.props as Record<string, unknown>) : undefined,
    style: partial.style && typeof partial.style === 'object' ? (partial.style as any) : undefined
  })

  // 容器递归 children
  if (node.children !== undefined) {
    const rawChildren = (partial as { children?: unknown }).children
    if (Array.isArray(rawChildren)) {
      const kids: Node[] = []
      rawChildren.forEach((c, i) => {
        const kid = normalizeNode(c as Partial<Node>, `${path ? path + '.' : ''}children[${i}]`, warnings)
        if (kid) kids.push(kid)
      })
      node.children = kids
    }
  }

  // 校验单个节点
  const v = validateNode(node)
  if (!v.valid) {
    warnings.push(`${path || node.id}: 节点校验失败 ${v.issues.map((i) => i.message).join('; ')}`)
    // 仍返回，但带 warning；调用方决定是否丢弃
  }

  return node
}

function createPageRootEmpty(): Node {
  return createNode('PageRoot')
}

function mergeTokens(base: DesignTokens, override: Partial<DesignTokens>): DesignTokens {
  const out: DesignTokens = { ...base }
  for (const group of Object.keys(override) as (keyof DesignTokens)[]) {
    const ov = override[group]
    if (ov && typeof ov === 'object') {
      out[group] = { ...(base[group] ?? {}), ...(ov as Record<string, string>) }
    }
  }
  return out
}

/**
 * 从 AI 返回的 content 中提取 JSON。
 * 兼容：
 *  - 纯 JSON
 *  - ```json ... ``` 围栏
 *  - 前后有解释文字
 */
export function extractJsonFromContent(content: string): unknown | null {
  // 1. 尝试直接 parse
  try {
    return JSON.parse(content)
  } catch {
    /* continue */
  }
  // 2. 尝试提取 ```json ... ``` 或 ``` ... ```
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      /* continue */
    }
  }
  // 3. 尝试找到第一个 { 到最后一个 } 的子串
  const first = content.indexOf('{')
  const last = content.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(content.slice(first, last + 1))
    } catch {
      /* continue */
    }
  }
  return null
}
