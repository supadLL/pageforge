import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'number', title: '进度', description: '0-100 的进度值' }
  }
}

const style: StyleMap = {
  display: 'block',
  width: '320px',
  height: '12px',
  backgroundColor: '#e5e7eb',
  borderRadius: '999px',
  overflow: 'hidden',
  boxSizing: 'border-box'
}

export const ProgressBarDefinition: ComponentDefinition = {
  type: 'ProgressBar',
  label: '进度条',
  category: 'data',
  defaultProps: { value: 64 },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
