import type { Node } from '../types/node.js'
import type { ComponentType } from '../types/component.js'
import { getComponentDefinition } from '../components/registry.js'

let nodeIdCounter = 0

/**
 * 生成本地节点 id。本步用单调递增 + 时间戳；
 * 后续若需要更强唯一性可换 nanoid/uuid。
 */
export function genNodeId(prefix = 'n'): string {
  nodeIdCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${nodeIdCounter.toString(36)}`
}

/**
 * 重置计数器（仅用于测试）。
 */
export function _resetNodeIdCounterForTests(): void {
  nodeIdCounter = 0
}

/**
 * 创建 PageRoot 节点 —— 页面根节点。
 * 默认带 flex column 布局和最小高度。
 */
export function createPageRoot(): Node {
  return {
    id: genNodeId('root'),
    type: 'PageRoot',
    name: 'Page',
    props: {},
    style: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '$colors.background',
      color: '$colors.text',
      fontFamily: '$fontFamily.sans'
    },
    children: []
  }
}

/**
 * 创建任意类型的节点。
 * 流程：
 *  1. 从组件注册表读取 defaultProps / defaultStyle
 *  2. 合并 overrides.props / overrides.style
 *  3. 根据 acceptsChildren 决定是否初始化 children
 *  4. 应用 overrides.id / name（如有）
 *
 * 非法组件类型会抛错。
 */
export function createNode(type: ComponentType, overrides?: Partial<Node>): Node {
  const def = getComponentDefinition(type)
  const node: Node = {
    id: overrides?.id ?? genNodeId(type.toLowerCase().slice(0, 3)),
    type,
    props: { ...def.defaultProps, ...(overrides?.props ?? {}) },
    style: { ...def.defaultStyle, ...(overrides?.style ?? {}) }
  }
  if (overrides?.name !== undefined) node.name = overrides.name
  if (def.acceptsChildren) {
    node.children = overrides?.children ?? []
  }
  if (overrides?.events) node.events = overrides.events
  if (overrides?.responsive) node.responsive = overrides.responsive
  if (overrides?.state) node.state = overrides.state
  return node
}
