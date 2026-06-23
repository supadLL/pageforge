import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', title: '标题', description: '英雄区主标题', default: 'Build pages at the speed of thought' },
    subtitle: { type: 'string', title: '副标题', description: '英雄区副标题', default: 'AI-driven visual page builder' }
  }
}

const style: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '18px',
  width: '760px',
  height: '420px',
  padding: '48px',
  color: '#ffffff',
  backgroundImage: 'linear-gradient(135deg, #111827 0%, #155e75 52%, #f59e0b 100%)',
  borderRadius: '30px',
  boxShadow: '0 30px 90px rgba(15, 23, 42, 0.3)',
  overflow: 'hidden',
  boxSizing: 'border-box'
}

export const HeroBlockDefinition: ComponentDefinition = {
  type: 'HeroBlock',
  label: '英雄区',
  category: 'layout',
  defaultProps: { title: 'Build pages at the speed of thought', subtitle: 'AI-driven visual page builder' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'section' }
}
