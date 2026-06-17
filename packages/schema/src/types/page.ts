import type { Node } from './node.js'
import type { BreakpointName } from './breakpoint.js'

export interface PageMeta {
  title?: string
  description?: string
}

export interface Page {
  id: string
  name: string
  route: string
  root: Node
  meta?: PageMeta
}
