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
  flexDirection: 'row',
  alignItems: 'center',
  gap: '8px',
  width: '360px',
  height: '52px',
  padding: '6px',
  color: '#334155',
  backgroundColor: '#e2e8f0',
  borderRadius: '16px',
  boxSizing: 'border-box'
}

export const TabsDefinition: ComponentDefinition = {
  type: 'Tabs',
  label: '标签页',
  category: 'navigation',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
