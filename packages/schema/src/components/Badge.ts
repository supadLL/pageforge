import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string', title: '文本', description: '标签文字' }
  }
}

const style: StyleMap = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '32px',
  padding: '0 14px',
  color: '#075985',
  backgroundColor: '#e0f2fe',
  border: '1px solid rgba(14, 165, 233, 0.24)',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 700,
  boxSizing: 'border-box'
}

export const BadgeDefinition: ComponentDefinition = {
  type: 'Badge',
  label: '徽章',
  category: 'basic',
  defaultProps: { text: 'New' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'span' }
}
