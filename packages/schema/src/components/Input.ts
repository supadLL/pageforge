import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const inputProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    placeholder: { type: 'string', default: '', description: '占位文本' },
    value: { type: 'string', default: '', description: '当前值' },
    inputType: {
      type: 'string',
      enum: ['text', 'password', 'email', 'number', 'tel', 'url'],
      default: 'text',
      description: 'input type'
    },
    disabled: { type: 'boolean', default: false }
  }
}

const inputStyle: StyleMap = {
  display: 'block',
  width: '100%',
  padding: '$spacing.2 $spacing.3',
  fontSize: '$fontSize.md',
  color: '$colors.text',
  backgroundColor: '#FFFFFF',
  border: '1px solid $colors.border',
  borderRadius: '$radius.md',
  boxSizing: 'border-box',
  outline: 'none'
}

export const InputDefinition: ComponentDefinition = {
  type: 'Input',
  label: '输入框',
  category: 'form',
  defaultProps: { placeholder: 'Enter text', value: '', inputType: 'text', disabled: false },
  defaultStyle: inputStyle,
  propSchema: inputProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'input', selfClosing: true }
}
