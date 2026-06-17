import type { Node, StyleMap, BreakpointName, ComponentType } from '@pageforge/schema'

/**
 * 可序列化命令（参见 docs/steps/07 §1）。
 * 不把函数放进历史栈，便于未来序列化和协同。
 */
export type CommandType =
  | 'addNode'
  | 'removeNode'
  | 'moveNode'
  | 'reorderNode'
  | 'updateProps'
  | 'updateStyle'
  | 'updateResponsiveStyle'
  | 'renameNode'
  | 'setNodeState'
  | 'applyPatch'
  | 'replacePageRoot'

export interface EditorCommand {
  id: string
  type: CommandType
  label: string
  createdAt: string
  payload: unknown
  /** 应用前快照（用于 revert） */
  before?: unknown
  /** 应用后快照（用于重做时的 sanity check，可选） */
  after?: unknown
}

// === payload 类型 ===

export interface AddNodePayload {
  parentId: string
  index?: number
  node: Node
}

export interface RemoveNodePayload {
  nodeId: string
  /** 被移除子树的快照（用于 revert 时恢复） */
  snapshot: Node
  parentId: string
  index: number
}

export interface MoveNodePayload {
  nodeId: string
  fromParentId: string
  fromIndex: number
  toParentId: string
  toIndex: number
}

export interface ReorderNodePayload {
  parentId: string
  fromIndex: number
  toIndex: number
}

export interface UpdatePropsPayload {
  nodeId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
}

export interface UpdateStylePayload {
  nodeId: string
  before: Partial<StyleMap>
  after: Partial<StyleMap>
}

export interface UpdateResponsiveStylePayload {
  nodeId: string
  breakpoint: BreakpointName
  before: Partial<StyleMap>
  after: Partial<StyleMap>
}

export interface RenameNodePayload {
  nodeId: string
  before: string | undefined
  after: string
}

export interface SetNodeStatePayload {
  nodeId: string
  before: { hidden?: boolean; locked?: boolean }
  after: { hidden?: boolean; locked?: boolean }
}

export interface ReplacePageRootPayload {
  before: Node
  after: Node
}

export interface ApplyPatchPayload {
  patches: import('@pageforge/schema').AiPatch[]
  before: Node
}

export function makeReplacePageRootCommand(before: Node, after: Node): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'replacePageRoot',
    label: '替换页面',
    createdAt: new Date().toISOString(),
    payload: { before, after } as ReplacePageRootPayload
  }
}

export function isReplacePageRootCmd(
  c: EditorCommand
): c is EditorCommand & { payload: ReplacePageRootPayload } {
  return c.type === 'replacePageRoot'
}

export function makeApplyPatchCommand(
  patches: import('@pageforge/schema').AiPatch[],
  before: Node
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'applyPatch',
    label: `AI 微调 (${patches.length} patches)`,
    createdAt: new Date().toISOString(),
    payload: { patches, before } as ApplyPatchPayload
  }
}

export function isApplyPatchCmd(
  c: EditorCommand
): c is EditorCommand & { payload: ApplyPatchPayload } {
  return c.type === 'applyPatch'
}

let cmdCounter = 0
export function makeCommandId(): string {
  cmdCounter += 1
  return `cmd_${Date.now().toString(36)}_${cmdCounter.toString(36)}`
}

export function _resetCmdCounterForTests(): void {
  cmdCounter = 0
}

// 构造各类型命令的辅助函数

export function makeAddCommand(parentId: string, node: Node, index?: number): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'addNode',
    label: `添加 ${node.type}`,
    createdAt: new Date().toISOString(),
    payload: { parentId, index, node } as AddNodePayload
  }
}

export function makeRemoveCommand(
  nodeId: string,
  snapshot: Node,
  parentId: string,
  index: number
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'removeNode',
    label: `删除 ${snapshot.type}`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, snapshot, parentId, index } as RemoveNodePayload
  }
}

export function makeMoveCommand(
  nodeId: string,
  fromParentId: string,
  fromIndex: number,
  toParentId: string,
  toIndex: number
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'moveNode',
    label: `移动节点`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, fromParentId, fromIndex, toParentId, toIndex } as MoveNodePayload
  }
}

export function makeReorderCommand(
  parentId: string,
  fromIndex: number,
  toIndex: number
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'reorderNode',
    label: `重排序`,
    createdAt: new Date().toISOString(),
    payload: { parentId, fromIndex, toIndex } as ReorderNodePayload
  }
}

export function makeUpdatePropsCommand(
  nodeId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'updateProps',
    label: `修改属性`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, before, after } as UpdatePropsPayload
  }
}

export function makeUpdateStyleCommand(
  nodeId: string,
  before: Partial<StyleMap>,
  after: Partial<StyleMap>
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'updateStyle',
    label: `修改样式`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, before, after } as UpdateStylePayload
  }
}

export function makeUpdateResponsiveStyleCommand(
  nodeId: string,
  breakpoint: BreakpointName,
  before: Partial<StyleMap>,
  after: Partial<StyleMap>
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'updateResponsiveStyle',
    label: `修改断点样式`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, breakpoint, before, after } as UpdateResponsiveStylePayload
  }
}

export function makeRenameCommand(nodeId: string, before: string | undefined, after: string): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'renameNode',
    label: `重命名`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, before, after } as RenameNodePayload
  }
}

export function makeSetNodeStateCommand(
  nodeId: string,
  before: { hidden?: boolean; locked?: boolean },
  after: { hidden?: boolean; locked?: boolean }
): EditorCommand {
  return {
    id: makeCommandId(),
    type: 'setNodeState',
    label: `修改节点状态`,
    createdAt: new Date().toISOString(),
    payload: { nodeId, before, after } as SetNodeStatePayload
  }
}

// 命令类型守卫
export function isAddCmd(c: EditorCommand): c is EditorCommand & { payload: AddNodePayload } {
  return c.type === 'addNode'
}
export function isRemoveCmd(c: EditorCommand): c is EditorCommand & { payload: RemoveNodePayload } {
  return c.type === 'removeNode'
}
export function isMoveCmd(c: EditorCommand): c is EditorCommand & { payload: MoveNodePayload } {
  return c.type === 'moveNode'
}
export function isReorderCmd(c: EditorCommand): c is EditorCommand & { payload: ReorderNodePayload } {
  return c.type === 'reorderNode'
}
export function isUpdatePropsCmd(c: EditorCommand): c is EditorCommand & { payload: UpdatePropsPayload } {
  return c.type === 'updateProps'
}
export function isUpdateStyleCmd(c: EditorCommand): c is EditorCommand & { payload: UpdateStylePayload } {
  return c.type === 'updateStyle'
}
export function isUpdateResponsiveStyleCmd(
  c: EditorCommand
): c is EditorCommand & { payload: UpdateResponsiveStylePayload } {
  return c.type === 'updateResponsiveStyle'
}
export function isRenameCmd(c: EditorCommand): c is EditorCommand & { payload: RenameNodePayload } {
  return c.type === 'renameNode'
}
export function isSetNodeStateCmd(c: EditorCommand): c is EditorCommand & { payload: SetNodeStatePayload } {
  return c.type === 'setNodeState'
}

// 用于在属性面板连续输入时合并命令的辅助
export type { ComponentType }
