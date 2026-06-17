import type { ComponentType } from './component.js'
import type { StyleMap } from './style.js'
import type { NodeEvent } from './events.js'
import type { ResponsiveOverride, BreakpointName } from './breakpoint.js'

/**
 * 编辑器节点状态（不影响导出默认行为）
 * hidden: 导出默认不包含
 * locked: 画布上不可被选中/拖拽
 */
export interface NodeState {
  hidden?: boolean
  locked?: boolean
}

export interface Node {
  id: string
  type: ComponentType
  name?: string
  props: Record<string, unknown>
  style: StyleMap
  children?: Node[]
  events?: NodeEvent[]
  responsive?: Partial<Record<BreakpointName, ResponsiveOverride>>
  state?: NodeState
}
