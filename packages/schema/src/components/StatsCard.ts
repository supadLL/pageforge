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
  justifyContent: 'space-between',
  gap: '12px',
  width: '240px',
  height: '150px',
  padding: '22px',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  borderRadius: '20px',
  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.12)',
  boxSizing: 'border-box'
}

export const StatsCardDefinition: ComponentDefinition = {
  type: 'StatsCard',
  label: '数据卡',
  category: 'data',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
