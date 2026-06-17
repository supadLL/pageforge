/**
 * AI 微调 Patch 协议（docs/steps/14，docs/01 §9 草案定稿）
 */
import type { Node } from '../types/node.js'
import type { StyleMap } from '../types/style.js'
import type { BreakpointName } from '../types/breakpoint.js'
import type { ValidationResult } from '../validation/ajv.js'
import { hasDefinition } from '../components/registry.js'
import { createNode, genNodeId } from '../factories/node.js'
import { findNode, findParent } from './treeLookup.js'
import { ALLOWED_STYLE_KEYS } from '../validation/styleMapSchema.js'

export type AiPatchOp =
  | 'addNode'
  | 'removeNode'
  | 'moveNode'
  | 'updateProps'
  | 'updateStyle'
  | 'renameNode'

export interface AiPatch {
  op: AiPatchOp
  // 通用字段
  nodeId?: string
  parentId?: string
  index?: number
  node?: Partial<Node>
  props?: Record<string, unknown>
  style?: Partial<StyleMap>
  breakpoint?: BreakpointName
  name?: string
}

export interface AiPatchSet {
  summary: string
  patches: AiPatch[]
}

export function validateAiPatchSet(input: unknown): ValidationResult<AiPatchSet> {
  if (!input || typeof input !== 'object') {
    return { valid: false, issues: [{ path: '<root>', message: 'patchSet must be object', keyword: 'type' }] }
  }
  const ps = input as Record<string, unknown>
  const issues: { path: string; message: string; keyword: string }[] = []
  if (typeof ps.summary !== 'string') {
    issues.push({ path: 'summary', message: 'summary must be string', keyword: 'type' })
  }
  if (!Array.isArray(ps.patches)) {
    issues.push({ path: 'patches', message: 'patches must be array', keyword: 'type' })
    return { valid: false, issues }
  }
  const validOps: AiPatchOp[] = ['addNode', 'removeNode', 'moveNode', 'updateProps', 'updateStyle', 'renameNode']
  ps.patches.forEach((p, i) => {
    if (!p || typeof p !== 'object') {
      issues.push({ path: `patches[${i}]`, message: 'patch must be object', keyword: 'type' })
      return
    }
    const patch = p as { op?: unknown }
    if (typeof patch.op !== 'string' || !validOps.includes(patch.op as AiPatchOp)) {
      issues.push({ path: `patches[${i}].op`, message: `invalid op: ${String(patch.op)}`, keyword: 'enum' })
    }
  })
  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, data: ps as unknown as AiPatchSet, issues: [] }
}

/**
 * 归一化 patch 列表：
 *  - 校验目标 nodeId/parentId 是否存在于树
 *  - addNode 的 node 补 id / 默认 props / style
 *  - updateStyle 的 style key 校验白名单
 *  - 限定 scope（若有）只保留 scope 子树内的 patch
 *  - 非法 patch 丢弃并记 warning
 */
export function normalizeAiPatchSet(
  set: AiPatchSet,
  root: Node,
  scopeNodeId?: string
): { patches: AiPatch[]; warnings: string[] } {
  const warnings: string[] = []
  const out: AiPatch[] = []

  // 计算 scope 允许的 nodeId 集合
  const allowedIds = new Set<string>()
  if (scopeNodeId) {
    const scopeNode = findNode(root, scopeNodeId)
    if (scopeNode) {
      collectIds(scopeNode, allowedIds)
    } else {
      warnings.push(`scope 节点 ${scopeNodeId} 不存在，忽略 scope 限制`)
    }
  }

  for (let i = 0; i < set.patches.length; i++) {
    const p = set.patches[i]
    const path = `patches[${i}]`
    const ok = normalizePatch(p, root, allowedIds, scopeNodeId, warnings, path)
    if (ok) out.push(ok)
  }
  return { patches: out, warnings }
}

function normalizePatch(
  p: AiPatch,
  root: Node,
  allowedIds: Set<string>,
  scopeNodeId: string | undefined,
  warnings: string[],
  path: string
): AiPatch | null {
  switch (p.op) {
    case 'addNode': {
      if (!p.parentId) {
        warnings.push(`${path}: addNode 缺 parentId`)
        return null
      }
      if (!findNode(root, p.parentId)) {
        warnings.push(`${path}: parentId ${p.parentId} 不存在`)
        return null
      }
      if (scopeNodeId && !allowedIds.has(p.parentId)) {
        warnings.push(`${path}: addNode 父节点 ${p.parentId} 不在 scope 内，丢弃`)
        return null
      }
      const type = p.node?.type
      if (typeof type !== 'string' || !hasDefinition(type)) {
        warnings.push(`${path}: addNode 未知 type ${String(type)}`)
        return null
      }
      // 用 createNode 补默认
      const newNode = createNode(type as any, {
        id: typeof p.node?.id === 'string' ? p.node.id : genNodeId(type.toLowerCase().slice(0, 3)),
        props: p.node?.props,
        style: p.node?.style
      })
      return { ...p, node: newNode }
    }
    case 'removeNode':
    case 'moveNode':
    case 'updateProps':
    case 'updateStyle':
    case 'renameNode': {
      if (!p.nodeId) {
        warnings.push(`${path}: ${p.op} 缺 nodeId`)
        return null
      }
      if (!findNode(root, p.nodeId)) {
        warnings.push(`${path}: nodeId ${p.nodeId} 不存在`)
        return null
      }
      if (scopeNodeId && !allowedIds.has(p.nodeId)) {
        warnings.push(`${path}: nodeId ${p.nodeId} 不在 scope 内，丢弃`)
        return null
      }
      // updateStyle 校验 style key
      if (p.op === 'updateStyle' && p.style) {
        for (const k of Object.keys(p.style)) {
          if (!(ALLOWED_STYLE_KEYS as readonly string[]).includes(k)) {
            warnings.push(`${path}: updateStyle 非法 style key ${k}，移除`)
            delete (p.style as Record<string, unknown>)[k]
          }
        }
      }
      return p
    }
    default:
      warnings.push(`${path}: 未知 op ${p.op}`)
      return null
  }
}

function collectIds(node: Node, out: Set<string>): void {
  out.add(node.id)
  node.children?.forEach((c) => collectIds(c, out))
}

/**
 * 把 patch 列表应用到 root，返回新 root。
 * 复用 treeOps 风格的不可变更新。
 */
export function applyPatches(root: Node, patches: AiPatch[]): Node {
  let cur = root
  for (const p of patches) {
    cur = applySinglePatch(cur, p)
  }
  return cur
}

function applySinglePatch(root: Node, p: AiPatch): Node {
  switch (p.op) {
    case 'addNode':
      if (!p.parentId || !p.node) return root
      return addNodeLocal(root, p.parentId, p.node as Node, p.index)
    case 'removeNode':
      if (!p.nodeId) return root
      return removeNodeLocal(root, p.nodeId)
    case 'moveNode':
      if (!p.nodeId || !p.parentId) return root
      return moveNodeLocal(root, p.nodeId, p.parentId, p.index ?? 0)
    case 'updateProps':
      if (!p.nodeId || !p.props) return root
      return updateNodeLocal(root, p.nodeId, (n) => ({ ...n, props: { ...n.props, ...p.props } }))
    case 'updateStyle':
      if (!p.nodeId || !p.style) return root
      return updateNodeLocal(root, p.nodeId, (n) => {
        if (p.breakpoint) {
          const responsive = { ...(n.responsive ?? {}) }
          const override = { ...(responsive[p.breakpoint] ?? {}) }
          override.style = { ...(override.style ?? {}), ...p.style }
          responsive[p.breakpoint] = override
          return { ...n, responsive }
        }
        return { ...n, style: { ...n.style, ...p.style } }
      })
    case 'renameNode':
      if (!p.nodeId || typeof p.name !== 'string') return root
      return updateNodeLocal(root, p.nodeId, (n) => ({ ...n, name: p.name }))
    default:
      return root
  }
}

// 内联 treeOps（避免循环依赖；与 src/editor/treeOps 行为一致）
function addNodeLocal(root: Node, parentId: string, newNode: Node, index?: number): Node {
  if (root.id === parentId) {
    const children = [...(root.children ?? [])]
    const i = index === undefined ? children.length : Math.max(0, Math.min(index, children.length))
    children.splice(i, 0, newNode)
    return { ...root, children }
  }
  if (!root.children) return root
  return { ...root, children: root.children.map((c) => addNodeLocal(c, parentId, newNode, index)) }
}
function removeNodeLocal(root: Node, id: string): Node {
  if (!root.children) return root
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => removeNodeLocal(c, id))
  }
}
function moveNodeLocal(root: Node, nodeId: string, newParentId: string, newIndex: number): Node {
  const node = findNode(root, nodeId)
  if (!node) return root
  const removed = removeNodeLocal(root, nodeId)
  return addNodeLocal(removed, newParentId, node, newIndex)
}
function updateNodeLocal(root: Node, id: string, updater: (n: Node) => Node): Node {
  if (root.id === id) return updater(root)
  if (!root.children) return root
  return { ...root, children: root.children.map((c) => updateNodeLocal(c, id, updater)) }
}
