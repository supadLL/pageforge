import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const containerProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
}

const containerStyle: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '$spacing.4',
  padding: '$spacing.4',
  backgroundColor: 'transparent',
  boxSizing: 'border-box'
}

export const ContainerDefinition: ComponentDefinition = {
  type: 'Container',
  label: '容器',
  category: 'layout',
  defaultProps: {},
  defaultStyle: containerStyle,
  propSchema: containerProps,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
