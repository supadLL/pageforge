import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', title: '品牌名', description: '导航栏左侧品牌名', default: 'Brand' }
  }
}

const style: StyleMap = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  width: '840px',
  height: '72px',
  padding: '0 24px',
  backgroundColor: '#111827',
  color: '#ffffff',
  borderRadius: '18px',
  boxShadow: '0 18px 44px rgba(15, 23, 42, 0.24)',
  boxSizing: 'border-box'
}

export const NavbarDefinition: ComponentDefinition = {
  type: 'Navbar',
  label: '导航条',
  category: 'navigation',
  defaultProps: { title: 'Brand' },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'nav' }
}
