import type { Node } from '@pageforge/schema'
import { isContainer } from '@pageforge/schema'

/**
 * 拖拽辅助：根据鼠标位置计算 drop target 与 insert index。
 * 策略（docs/steps/08 §3）：
 *  - 纵向容器：按 Y 坐标判断
 *  - 横向容器：按 X 坐标判断
 *  - 鼠标落在非容器上：用其父容器作为 drop target，按相对位置算前后插入
 */

export type DropTargetKind = 'before' | 'after' | 'inside'

export interface DropTarget {
  /** 真正的放置容器 */
  parentId: string
  /** 插入位置 index */
  index: number
  /** 用于 UI 反馈：参考的兄弟节点 id（before/after）或容器 id（inside） */
  refId: string
  kind: DropTargetKind
}

/**
 * 计算鼠标落在一个节点上的 drop target。
 *
 * @param root 当前页面根节点
 * @param hoverId 鼠标当前 hover 的节点 id
 * @param mousePos 鼠标相对该节点矩形的位置（offsetX, offsetY），以及该节点的宽高
 */
export function computeDropTarget(
  root: Node,
  hoverId: string,
  rect: { offsetX: number; offsetY: number; width: number; height: number }
): DropTarget | null {
  const hover = findNodeLocal(root, hoverId)
  if (!hover) return null

  // 如果 hover 的是容器，且鼠标位于"中段"，则 inside
  if (isContainer(hover.type)) {
    const isHorizontal = computedFlexDirection(hover) === 'row'
    const ratio = isHorizontal ? rect.offsetX / rect.width : rect.offsetY / rect.height
    if (ratio > 0.25 && ratio < 0.75) {
      // inside：插到末尾
      return {
        parentId: hover.id,
        index: hover.children?.length ?? 0,
        refId: hover.id,
        kind: 'inside'
      }
    }
  }

  // 否则用 hover 的父容器，按相对位置算 before/after
  const parent = findParentLocal(root, hoverId)
  if (!parent || !parent.children) {
    // hover 是 root 且不是容器（理论上不会发生，PageRoot 是容器）
    return null
  }
  const siblings = parent.children
  const hoverIdx = siblings.findIndex((c) => c.id === hoverId)
  if (hoverIdx < 0) return null

  const isHorizontal = computedFlexDirection(parent) === 'row'
  const ratio = isHorizontal ? rect.offsetX / rect.width : rect.offsetY / rect.height
  // 上/左 半部 -> before；下/右 半部 -> after
  if (ratio < 0.5) {
    return { parentId: parent.id, index: hoverIdx, refId: hover.id, kind: 'before' }
  }
  return { parentId: parent.id, index: hoverIdx + 1, refId: hover.id, kind: 'after' }
}

function computedFlexDirection(n: Node): string {
  const v = n.style.flexDirection
  return typeof v === 'string' ? v : 'column'
}

function findNodeLocal(root: Node, id: string): Node | null {
  if (root.id === id) return root
  if (!root.children) return null
  for (const c of root.children) {
    const r = findNodeLocal(c, id)
    if (r) return r
  }
  return null
}

function findParentLocal(root: Node, id: string): Node | null {
  if (!root.children) return null
  for (const c of root.children) {
    if (c.id === id) return root
    const r = findParentLocal(c, id)
    if (r) return r
  }
  return null
}

/**
 * 校验：source 节点能否拖到 drop target。
 * 用于禁止"把父节点拖到自己后代内"。
 */
export function canDrop(root: Node, sourceId: string, target: DropTarget): boolean {
  if (sourceId === target.parentId) return false
  const source = findNodeLocal(root, sourceId)
  if (!source) return false
  if (source.type === 'PageRoot') return false
  // 防止拖到自己后代内
  if (containsNodeLocal(source, target.parentId)) return false
  // 目标父节点必须是容器
  const parent = findNodeLocal(root, target.parentId)
  if (!parent || !isContainer(parent.type)) return false
  return true
}

function containsNodeLocal(root: Node, id: string): boolean {
  if (root.id === id) return true
  if (!root.children) return false
  return root.children.some((c) => containsNodeLocal(c, id))
}
