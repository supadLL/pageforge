export type BreakpointName = 'desktop' | 'laptop' | 'tablet' | 'mobile'

export interface Breakpoint {
  name: BreakpointName
  width: number
}

export const DEFAULT_BREAKPOINTS: readonly Breakpoint[] = [
  { name: 'desktop', width: 1440 },
  { name: 'laptop', width: 1024 },
  { name: 'tablet', width: 768 },
  { name: 'mobile', width: 375 }
] as const

import type { StyleMap } from './style.js'

/**
 * 节点在某个断点下的样式/props 覆盖。
 * 编辑器切换断点后默认编辑这里；空对象表示该断点无覆盖。
 */
export interface ResponsiveOverride {
  style?: Partial<StyleMap>
  props?: Record<string, unknown>
}
