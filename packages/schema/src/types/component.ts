/**
 * MVP 组件类型枚举（与 docs/01 §6 一致）
 * 后续扩展必须先加入组件注册表（Step 03），不能在渲染器里硬编码。
 */
export type ComponentType =
  | 'PageRoot'
  | 'Container'
  | 'Card'
  | 'Heading'
  | 'Text'
  | 'Button'
  | 'Image'
  | 'Input'
  | 'Divider'

export const MVP_COMPONENT_TYPES: readonly ComponentType[] = [
  'PageRoot',
  'Container',
  'Card',
  'Heading',
  'Text',
  'Button',
  'Image',
  'Input',
  'Divider'
] as const

export type ComponentCategory =
  | 'layout'
  | 'basic'
  | 'form'
  | 'data'
  | 'navigation'
  | 'feedback'

export interface ComponentRenderer {
  /** 渲染器类型，未来可能多种实现 */
  kind: 'vue' | 'html'
}

export interface ExportHints {
  /** 导出时使用的 HTML 标签（不写则按组件注册表的默认值） */
  tag?: string
  /** 是否自闭合（如 Image/Input/Divider） */
  selfClosing?: boolean
}

export interface ComponentDefinition {
  type: ComponentType
  label: string
  category: ComponentCategory
  icon?: string
  defaultProps: Record<string, unknown>
  defaultStyle: import('./style.js').StyleMap
  /** 组件 props 的 JSON Schema，用于属性面板自动生成表单 */
  propSchema: import('../validation/jsonSchema.js').JsonSchema
  acceptsChildren: boolean
  allowedChildren?: ComponentType[]
  render: ComponentRenderer
  exportHints?: ExportHints
}
