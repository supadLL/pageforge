import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const cardProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
}

const cardStyle: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '$spacing.3',
  padding: '$spacing.5',
  backgroundColor: '$colors.surface',
  borderRadius: '$radius.lg',
  boxShadow: '$shadow.sm',
  boxSizing: 'border-box'
}

export const CardDefinition: ComponentDefinition = {
  type: 'Card',
  label: '卡片',
  category: 'layout',
  defaultProps: {},
  defaultStyle: cardStyle,
  propSchema: cardProps,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
