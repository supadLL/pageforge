import type { Node } from '@pageforge/schema'
import { isContainer } from '@pageforge/schema'

/**
 * 纯函数：Node 树遍历与增删改查
 * 这些函数不修改入参，而是返回新的根节点（immutable）。
 * 实际 store 会用返回的新根替换 ref。
 */

export function findNode(root: Node, id: string): Node | null {
  if (root.id === id) return root
  if (!root.children) return null
  for (const c of root.children) {
    const r = findNode(c, id)
    if (r) return r
  }
  return null
}

export function findParent(root: Node, id: string): Node | null {
  if (!root.children) return null
  for (const c of root.children) {
    if (c.id === id) return root
    const r = findParent(c, id)
    if (r) return r
  }
  return null
}

export function findContainerAncestor(root: Node, id: string): Node | null {
  // 节点本身就是容器
  if (root.id === id && isContainer(root.type)) return root
  let parent = findParent(root, id)
  while (parent) {
    if (isContainer(parent.type)) return parent
    parent = findParent(root, parent.id)
  }
  return null
}

export function addNodeToTree(root: Node, parentId: string, newNode: Node, index?: number): Node {
  return addNodeInternal(root, parentId, newNode, index, true)
}

function addNodeInternal(
  root: Node,
  parentId: string,
  newNode: Node,
  index: number | undefined,
  isRoot: boolean
): Node {
  if (root.id === parentId) {
    if (!isContainer(root.type)) {
      throw new Error(`parent ${parentId} (${root.type}) is not a container`)
    }
    const children = [...(root.children ?? [])]
    const i = index === undefined ? children.length : Math.max(0, Math.min(index, children.length))
    children.splice(i, 0, newNode)
    return { ...root, children }
  }
  if (!root.children) return root
  // 仅在最外层（根调用）做存在性和容器校验，避免子节点递归时误报
  if (isRoot) {
    if (!containsNodeId(root, parentId)) {
      throw new Error(`parent ${parentId} not found`)
    }
    if (!isContainerNodeType(root, parentId)) {
      throw new Error(`parent ${parentId} is not a container`)
    }
  }
  return {
    ...root,
    children: root.children.map((c) => addNodeInternal(c, parentId, newNode, index, false))
  }
}

export function containsNodeId(root: Node, id: string): boolean {
  if (root.id === id) return true
  if (!root.children) return false
  return root.children.some((c) => containsNodeId(c, id))
}

function isContainerNodeType(root: Node, id: string): boolean {
  const n = findNode(root, id)
  return !!n && isContainer(n.type)
}

export function removeNodeFromTree(root: Node, id: string): Node {
  if (!root.children) return root
  // 快速判断：树中是否存在该 id；不存在则原样返回（immutable 引用稳定）
  if (!containsNodeId(root, id)) return root
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeNodeFromTree(c, id))
  }
}

export function updateNodeInTree(
  root: Node,
  id: string,
  updater: (n: Node) => Node
): Node {
  if (root.id === id) return updater(root)
  if (!root.children) return root
  return {
    ...root,
    children: root.children.map((c) => updateNodeInTree(c, id, updater))
  }
}

export function moveNodeInTree(
  root: Node,
  nodeId: string,
  newParentId: string,
  newIndex: number
): Node {
  const node = findNode(root, nodeId)
  if (!node) throw new Error(`node ${nodeId} not found`)
  if (node.type === 'PageRoot') throw new Error('cannot move PageRoot')

  // 先做后代检查：nodeId 是否是 newParentId 的祖先
  if (nodeId === newParentId) throw new Error('cannot move node into itself')
  if (containsNodeId(node, newParentId)) {
    throw new Error('cannot move node into its own descendant')
  }

  const newParent = findNode(root, newParentId)
  if (!newParent) throw new Error(`parent ${newParentId} not found`)
  if (!isContainer(newParent.type)) {
    throw new Error(`parent ${newParentId} (${newParent.type}) is not a container`)
  }

  const removed = removeNodeFromTree(root, nodeId)
  return addNodeToTree(removed, newParentId, node, newIndex)
}

export function walkNodes(root: Node, fn: (n: Node, depth: number) => void) {
  function visit(n: Node, depth: number) {
    fn(n, depth)
    n.children?.forEach((c) => visit(c, depth + 1))
  }
  visit(root, 0)
}

export function countNodes(root: Node): number {
  let count = 0
  walkNodes(root, () => count++)
  return count
}
