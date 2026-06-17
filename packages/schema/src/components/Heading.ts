import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const headingProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: { type: 'string', description: '标题文本' },
    level: {
      type: 'integer',
      enum: [1, 2, 3, 4, 5, 6],
      default: 2,
      description: '标题级别（h1-h6）'
    }
  }
}

const headingStyle: StyleMap = {
  fontSize: '$fontSize.xl',
  fontWeight: '600',
  lineHeight: '1.3',
  color: '$colors.text',
  margin: '0'
}

export const HeadingDefinition: ComponentDefinition = {
  type: 'Heading',
  label: '标题',
  category: 'basic',
  defaultProps: { text: 'Heading', level: 2 },
  defaultStyle: headingStyle,
  propSchema: headingProps,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'h2' }
}
