import type { Node } from '@pageforge/schema'
import {
  addNodeToTree,
  removeNodeFromTree,
  updateNodeInTree,
  moveNodeInTree,
  findNode,
  findParent
} from '../treeOps'
import type { EditorCommand } from './types'
import {
  isAddCmd,
  isRemoveCmd,
  isMoveCmd,
  isReorderCmd,
  isUpdatePropsCmd,
  isUpdateStyleCmd,
  isUpdateResponsiveStyleCmd,
  isRenameCmd,
  isSetNodeStateCmd,
  isReplacePageRootCmd,
  isApplyPatchCmd
} from './types'
import { applyPatches } from '@pageforge/schema'

/**
 * 命令应用器：纯函数，输入 root + command，返回新 root。
 * 同时被 apply（执行）和 revert（撤销）复用——通过 invert 参数控制方向。
 */
export function applyCommand(root: Node, cmd: EditorCommand, invert = false): Node {
  if (invert) {
    return revertCommand(root, cmd)
  }
  return execCommand(root, cmd)
}

function execCommand(root: Node, cmd: EditorCommand): Node {
  if (isAddCmd(cmd)) {
    const { parentId, index, node } = cmd.payload
    return addNodeToTree(root, parentId, node, index)
  }
  if (isRemoveCmd(cmd)) {
    return removeNodeFromTree(root, cmd.payload.nodeId)
  }
  if (isMoveCmd(cmd)) {
    return moveNodeInTree(root, cmd.payload.nodeId, cmd.payload.toParentId, cmd.payload.toIndex)
  }
  if (isReorderCmd(cmd)) {
    // reorder 等价于在同一父容器内 move
    const { parentId, fromIndex, toIndex } = cmd.payload
    const parent = findNode(root, parentId)
    if (!parent || !parent.children) return root
    const node = parent.children[fromIndex]
    if (!node) return root
    return moveNodeInTree(root, node.id, parentId, toIndex)
  }
  if (isUpdatePropsCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      props: { ...n.props, ...cmd.payload.after }
    }))
  }
  if (isUpdateStyleCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      style: { ...n.style, ...cmd.payload.after }
    }))
  }
  if (isUpdateResponsiveStyleCmd(cmd)) {
    const { nodeId, breakpoint, after } = cmd.payload
    return updateNodeInTree(root, nodeId, (n) => {
      const responsive = { ...(n.responsive ?? {}) }
      const override = { ...(responsive[breakpoint] ?? {}) }
      override.style = { ...(override.style ?? {}), ...after }
      responsive[breakpoint] = override
      return { ...n, responsive }
    })
  }
  if (isRenameCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      name: cmd.payload.after
    }))
  }
  if (isSetNodeStateCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      state: { ...(n.state ?? {}), ...cmd.payload.after }
    }))
  }
  if (isReplacePageRootCmd(cmd)) {
    // 整页替换：直接返回 after（root 节点本身被替换）
    return cmd.payload.after
  }
  if (isApplyPatchCmd(cmd)) {
    return applyPatches(root, cmd.payload.patches)
  }
  return root
}

function revertCommand(root: Node, cmd: EditorCommand): Node {
  if (isAddCmd(cmd)) {
    // add 的逆 = remove
    return removeNodeFromTree(root, cmd.payload.node.id)
  }
  if (isRemoveCmd(cmd)) {
    // remove 的逆 = 把快照插回原位置
    const { snapshot, parentId, index } = cmd.payload
    return addNodeToTree(root, parentId, snapshot, index)
  }
  if (isMoveCmd(cmd)) {
    const { nodeId, fromParentId, fromIndex } = cmd.payload
    return moveNodeInTree(root, nodeId, fromParentId, fromIndex)
  }
  if (isReorderCmd(cmd)) {
    const { parentId, fromIndex, toIndex } = cmd.payload
    const parent = findNode(root, parentId)
    if (!parent || !parent.children) return root
    // 撤销：把 toIndex 位置的节点移回 fromIndex
    const node = parent.children[toIndex]
    if (!node) return root
    return moveNodeInTree(root, node.id, parentId, fromIndex)
  }
  if (isUpdatePropsCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      props: { ...n.props, ...cmd.payload.before }
    }))
  }
  if (isUpdateStyleCmd(cmd)) {
    // 撤销样式：把 before 中的字段写回（覆盖 after 写入的值）
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      style: { ...n.style, ...cmd.payload.before }
    }))
  }
  if (isUpdateResponsiveStyleCmd(cmd)) {
    const { nodeId, breakpoint, before } = cmd.payload
    return updateNodeInTree(root, nodeId, (n) => {
      const responsive = { ...(n.responsive ?? {}) }
      const override = { ...(responsive[breakpoint] ?? {}) }
      override.style = { ...(override.style ?? {}), ...before }
      responsive[breakpoint] = override
      return { ...n, responsive }
    })
  }
  if (isRenameCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      name: cmd.payload.before
    }))
  }
  if (isSetNodeStateCmd(cmd)) {
    return updateNodeInTree(root, cmd.payload.nodeId, (n) => ({
      ...n,
      state: { ...(n.state ?? {}), ...cmd.payload.before }
    }))
  }
  if (isReplacePageRootCmd(cmd)) {
    return cmd.payload.before
  }
  if (isApplyPatchCmd(cmd)) {
    // revert 用 before 快照
    return cmd.payload.before
  }
  return root
}

/**
 * 辅助：在调用 remove 命令前，收集被删除子树的快照、parentId、index。
 */
export function collectRemoveSnapshot(root: Node, nodeId: string): {
  snapshot: Node
  parentId: string
  index: number
} | null {
  const node = findNode(root, nodeId)
  if (!node) return null
  const parent = findParent(root, nodeId)
  if (!parent || !parent.children) return null
  const index = parent.children.findIndex((c) => c.id === nodeId)
  if (index < 0) return null
  return { snapshot: node, parentId: parent.id, index }
}
