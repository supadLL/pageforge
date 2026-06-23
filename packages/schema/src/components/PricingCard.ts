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
  width: '300px',
  minHeight: '360px',
  padding: '28px',
  color: '#18181b',
  backgroundColor: '#fff7ed',
  border: '1px solid rgba(249, 115, 22, 0.22)',
  borderRadius: '26px',
  boxShadow: '0 22px 64px rgba(154, 52, 18, 0.12)',
  boxSizing: 'border-box'
}

export const PricingCardDefinition: ComponentDefinition = {
  type: 'PricingCard',
  label: '价格卡',
  category: 'data',
  defaultProps: {},
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
