import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const buttonProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: { type: 'string', description: '按钮文案' },
    variant: {
      type: 'string',
      enum: ['primary', 'secondary', 'ghost'],
      default: 'primary',
      description: '按钮变体'
    },
    disabled: { type: 'boolean', default: false, description: '是否禁用' }
  }
}

const buttonStyle: StyleMap = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$spacing.2 $spacing.5',
  backgroundColor: '$colors.primary',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '$radius.md',
  fontSize: '$fontSize.md',
  fontWeight: '500',
  cursor: 'pointer',
  boxSizing: 'border-box',
  opacity: '1'
}

export const ButtonDefinition: ComponentDefinition = {
  type: 'Button',
  label: '按钮',
  category: 'basic',
  defaultProps: { text: 'Button', variant: 'primary', disabled: false },
  defaultStyle: buttonStyle,
  propSchema: buttonProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'button' }
}
