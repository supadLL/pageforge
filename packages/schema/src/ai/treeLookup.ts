import type { Node } from '../types/node.js'

/** schema 包内的简易树查找（不依赖 src/editor/treeOps） */
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
