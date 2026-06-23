import type { ComponentDefinition } from '../types/component.js'
import type { StyleMap } from '../types/style.js'
import type { JsonSchema } from '../validation/jsonSchema.js'

const props: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    placeholder: { type: 'string', title: '占位文本', description: '搜索框提示文案' },
    value: { type: 'string', title: '默认值', description: '输入框默认内容' },
    disabled: { type: 'boolean', title: '禁用', default: false }
  }
}

const style: StyleMap = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '320px',
  height: '48px',
  padding: '0 16px',
  color: '#475569',
  backgroundColor: '#ffffff',
  border: '1px solid rgba(15, 23, 42, 0.1)',
  borderRadius: '16px',
  boxShadow: '0 12px 34px rgba(15, 23, 42, 0.09)',
  boxSizing: 'border-box'
}

export const SearchBoxDefinition: ComponentDefinition = {
  type: 'SearchBox',
  label: '搜索框',
  category: 'form',
  defaultProps: { placeholder: 'Search anything', value: '', disabled: false },
  defaultStyle: style,
  propSchema: props,
  acceptsChildren: false,
  render: { kind: 'vue' },
  exportHints: { tag: 'div' }
}
