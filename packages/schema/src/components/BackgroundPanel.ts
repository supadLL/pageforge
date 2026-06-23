import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
}

const style: StyleMap = {
  display: 'block',
  width: '960px',
  height: '560px',
  backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #2563eb 52%, #f97316 100%)',
  borderRadius: '28px',
  boxShadow: '0 32px 90px rgba(15, 23, 42, 0.28)',
  overflow: 'hidden',
  boxSizing: 'border-box'
}

export const BackgroundPanelDefinition: ComponentDefinition = {
  type: 'BackgroundPanel',
  label: '背景板',
  category: 'layout',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'section' }
}
