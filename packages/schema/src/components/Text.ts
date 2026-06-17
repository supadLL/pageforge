import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const textProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: { type: 'string', description: '文本内容' }
  }
}

const textStyle: StyleMap = {
  fontSize: '$fontSize.md',
  fontWeight: '400',
  lineHeight: '1.6',
  color: '$colors.text',
  margin: '0'
}

export const TextDefinition: ComponentDefinition = {
  type: 'Text',
  label: '文本',
  category: 'basic',
  defaultProps: { text: 'Text content' },
  defaultStyle: textStyle,
  propSchema: textProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'p' }
}
