import type { JsonSchema } from './jsonSchema.js'

/**
 * 允许出现在 style 字段中的 CSS 属性白名单（与 docs/01 §4.1 一致）。
 * 校验时强制约束 node.style 的 keys 必须在此集合内。
 */
export const ALLOWED_STYLE_KEYS = [
  // 布局
  'display',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'gap',
  'flexWrap',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'padding',
  'margin',
  'boxSizing',
  // 视觉
  'color',
  'backgroundColor',
  'backgroundImage',
  'border',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'opacity',
  'objectFit',
  'outline',
  // 文字
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'textAlign',
  'letterSpacing',
  'textDecoration',
  // 定位
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  // 其他
  'overflow',
  'cursor'
] as const

export type AllowedStyleKey = (typeof ALLOWED_STYLE_KEYS)[number]

/**
 * StyleMap 的 JSON Schema 描述。
 * 用 additionalProperties: false 严格限制允许的 key。
 */
export const styleMapSchema: JsonSchema = {
  type: 'object',
  description: 'CSS-in-JS 形式的样式表，key 必须是允许的 CSS 属性',
  additionalProperties: false,
  properties: Object.fromEntries(
    ALLOWED_STYLE_KEYS.map((k) => [
      k,
      { type: ['string', 'number'], description: `CSS ${k}` }
    ])
  )
}
