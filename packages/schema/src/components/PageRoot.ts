import type { ComponentDefinition } from '../types/component.js'
import type { JsonSchema } from '../validation/jsonSchema.js'
import type { StyleMap } from '../types/style.js'

const pageRootProps: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: '页面标题（用于 <title>）' }
  }
}

const pageRootStyle: StyleMap = {
  display: 'block',
  position: 'relative',
  width: '100%',
  minHeight: '100%',
  backgroundColor: 'transparent',
  color: '$colors.text',
  fontFamily: '$fontFamily.sans',
  overflow: 'visible'
}

export const PageRootDefinition: ComponentDefinition = {
  type: 'PageRoot',
  label: '页面',
  category: 'layout',
  defaultProps: {},
  defaultStyle: pageRootStyle,
  propSchema: pageRootProps,
  acceptsChildren: true,
  render: { kind: 'vue' },
  exportHints: { tag: 'main' }
}
