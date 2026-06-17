import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const dividerProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    orientation: {
      type: 'string',
      enum: ['horizontal', 'vertical'],
      default: 'horizontal'
    }
  }
}

const dividerStyle: StyleMap = {
  display: 'block',
  width: '100%',
  height: '1px',
  backgroundColor: '$colors.border',
  border: 'none',
  margin: '$spacing.3 0'
}

export const DividerDefinition: ComponentDefinition = {
  type: 'Divider',
  label: '分隔线',
  category: 'basic',
  defaultProps: { orientation: 'horizontal' },
  defaultStyle: dividerStyle,
  propSchema: dividerProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'hr', selfClosing: true }
}
