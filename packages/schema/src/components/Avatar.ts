import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    text: { type: 'string', title: '文本', description: '头像文字' }
  }
}

const style: StyleMap = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '56px',
  height: '56px',
  color: '#ffffff',
  backgroundImage: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
  borderRadius: '999px',
  fontSize: '18px',
  fontWeight: 800,
  boxShadow: '0 14px 34px rgba(236, 72, 153, 0.24)',
  boxSizing: 'border-box'
}

export const AvatarDefinition: ComponentDefinition = {
  type: 'Avatar',
  label: '头像',
  category: 'basic',
  defaultProps: { text: 'PF' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
