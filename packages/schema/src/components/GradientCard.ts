import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
}

const style: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  width: '320px',
  minHeight: '180px',
  padding: '24px',
  color: '#ffffff',
  backgroundImage: 'linear-gradient(135deg, #111827 0%, #4f46e5 55%, #06b6d4 100%)',
  borderRadius: '22px',
  boxShadow: '0 22px 60px rgba(79, 70, 229, 0.28)',
  boxSizing: 'border-box'
}

export const GradientCardDefinition: ComponentDefinition = {
  type: 'GradientCard',
  label: '渐变卡片',
  category: 'layout',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
