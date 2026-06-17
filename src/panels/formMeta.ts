import type { JsonSchema } from '@pageforge/schema'
import type { AllowedStyleKey } from '@pageforge/schema'

export interface FieldMeta {
  key: string
  label: string
  control: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'asset'
  options?: { label: string; value: string | number }[]
  placeholder?: string
  /** 控件分组，用于面板布局 */
  group: 'props' | 'layout' | 'visual' | 'text' | 'spacing'
}

/**
 * 把 propSchema 的 properties 转成表单 FieldMeta 列表。
 * 控件映射规则参见 docs/steps/05 §2 表。
 */
export function schemaToFields(schema: JsonSchema): FieldMeta[] {
  const props = schema.properties
  if (!props) return []
  const result: FieldMeta[] = []
  for (const [key, sub] of Object.entries(props)) {
    result.push(propToField(key, sub))
  }
  return result
}

function propToField(key: string, sub: JsonSchema): FieldMeta {
  const label = sub.title ?? prettyLabel(key)
  if (sub['x-asset']) {
    return { key, label, control: 'asset', group: 'props' }
  }
  if (sub.enum) {
    return {
      key,
      label,
      control: 'select',
      group: 'props',
      options: sub.enum.map((v) => ({ label: String(v), value: v as string | number }))
    }
  }
  if (sub.type === 'boolean') {
    return { key, label, control: 'boolean', group: 'props' }
  }
  if (sub.type === 'integer' || sub.type === 'number') {
    return { key, label, control: 'number', group: 'props' }
  }
  // 默认 string
  return { key, label, control: 'text', group: 'props', placeholder: sub.description }
}

/**
 * 通用 style 字段元数据。
 * 集中维护"哪些 style 字段在面板里出现"，便于 Step 06+ 扩展。
 */
export const STYLE_FIELDS: { key: AllowedStyleKey; label: string; control: FieldMeta['control']; group: FieldMeta['group']; options?: FieldMeta['options'] }[] = [
  // 布局
  { key: 'display', label: 'display', control: 'select', group: 'layout', options: ['flex', 'block', 'inline-flex', 'inline-block', 'none'].map((v) => ({ label: v, value: v })) },
  { key: 'flexDirection', label: 'flex-direction', control: 'select', group: 'layout', options: ['column', 'row', 'column-reverse', 'row-reverse'].map((v) => ({ label: v, value: v })) },
  { key: 'alignItems', label: 'align-items', control: 'select', group: 'layout', options: ['stretch', 'flex-start', 'center', 'flex-end'].map((v) => ({ label: v, value: v })) },
  { key: 'justifyContent', label: 'justify-content', control: 'select', group: 'layout', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'].map((v) => ({ label: v, value: v })) },
  { key: 'gap', label: 'gap', control: 'text', group: 'layout' },
  { key: 'flexWrap', label: 'flex-wrap', control: 'select', group: 'layout', options: ['nowrap', 'wrap', 'wrap-reverse'].map((v) => ({ label: v, value: v })) },
  { key: 'width', label: 'width', control: 'text', group: 'layout' },
  { key: 'height', label: 'height', control: 'text', group: 'layout' },
  { key: 'minWidth', label: 'min-width', control: 'text', group: 'layout' },
  { key: 'minHeight', label: 'min-height', control: 'text', group: 'layout' },
  { key: 'maxWidth', label: 'max-width', control: 'text', group: 'layout' },
  { key: 'maxHeight', label: 'max-height', control: 'text', group: 'layout' },
  // 视觉
  { key: 'color', label: '文字颜色', control: 'color', group: 'visual' },
  { key: 'backgroundColor', label: '背景颜色', control: 'color', group: 'visual' },
  { key: 'border', label: 'border', control: 'text', group: 'visual' },
  { key: 'borderColor', label: 'border-color', control: 'color', group: 'visual' },
  { key: 'borderRadius', label: '圆角', control: 'text', group: 'visual' },
  { key: 'boxShadow', label: '阴影', control: 'text', group: 'visual' },
  { key: 'opacity', label: 'opacity', control: 'number', group: 'visual' },
  // 文字
  { key: 'fontSize', label: '字号', control: 'text', group: 'text' },
  { key: 'fontWeight', label: '字重', control: 'text', group: 'text' },
  { key: 'lineHeight', label: '行高', control: 'text', group: 'text' },
  { key: 'textAlign', label: '对齐', control: 'select', group: 'text', options: ['left', 'center', 'right', 'justify'].map((v) => ({ label: v, value: v })) },
  { key: 'letterSpacing', label: '字距', control: 'text', group: 'text' },
  { key: 'textDecoration', label: 'text-decoration', control: 'text', group: 'text' },
  // 间距
  { key: 'padding', label: 'padding', control: 'text', group: 'spacing' },
  { key: 'margin', label: 'margin', control: 'text', group: 'spacing' }
]

function prettyLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}
