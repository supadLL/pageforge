import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', title: '标题', description: '侧边栏标题', default: 'Menu' }
  }
}

const style: StyleMap = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  width: '240px',
  height: '560px',
  padding: '20px',
  color: '#e5e7eb',
  backgroundColor: '#111827',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
  boxSizing: 'border-box'
}

export const SidebarDefinition: ComponentDefinition = {
  type: 'Sidebar',
  label: '侧边栏',
  category: 'navigation',
  defaultProps: { title: 'Menu' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'aside' }
}
