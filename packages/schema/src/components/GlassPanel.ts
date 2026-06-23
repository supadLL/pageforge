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
  gap: '16px',
  width: '360px',
  minHeight: '220px',
  padding: '24px',
  backgroundColor: 'rgba(255, 255, 255, 0.72)',
  border: '1px solid rgba(255, 255, 255, 0.72)',
  borderRadius: '24px',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.18)',
  boxSizing: 'border-box'
}

export const GlassPanelDefinition: ComponentDefinition = {
  type: 'GlassPanel',
  label: '玻璃面板',
  category: 'layout',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
