export type NodeEventType = 'click' | 'submit' | 'change'

/**
 * MVP 仅实现 navigate / openUrl；
 * toggleVisibility / customCode 在后续步骤扩展。
 */
export type NodeAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'openUrl'; url: string; target?: '_blank' | '_self' }
  | { kind: 'toggleVisibility'; nodeId: string }
  | { kind: 'customCode'; code: string }

export interface NodeEvent {
  type: NodeEventType
  action: NodeAction
}
