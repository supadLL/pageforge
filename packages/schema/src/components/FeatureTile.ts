import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', title: '标题', default: 'Feature' },
    description: { type: 'string', title: '描述', default: 'A powerful feature description.' }
  }
}

const style: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '300px',
  minHeight: '190px',
  padding: '24px',
  color: '#102a43',
  backgroundColor: '#f8fafc',
  border: '1px solid rgba(14, 165, 233, 0.22)',
  borderRadius: '22px',
  boxShadow: '0 16px 44px rgba(8, 47, 73, 0.1)',
  boxSizing: 'border-box'
}

export const FeatureTileDefinition: ComponentDefinition = {
  type: 'FeatureTile',
  label: '功能块',
  category: 'basic',
  defaultProps: { title: 'Feature', description: 'A powerful feature description.' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
