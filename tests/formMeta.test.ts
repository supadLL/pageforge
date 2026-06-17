import { describe, it, expect } from 'vitest'
import { getComponentDefinition } from '@pageforge/schema'
import { schemaToFields, STYLE_FIELDS } from '@/panels/formMeta'

describe('P1 schemaToFields - 控件映射', () => {
  it('Heading 包含 text/level', () => {
    const def = getComponentDefinition('Heading')
    const fields = schemaToFields(def.propSchema)
    const text = fields.find((f) => f.key === 'text')
    expect(text?.control).toBe('text')
    const level = fields.find((f) => f.key === 'level')
    expect(level?.control).toBe('select')
    expect(level?.options).toHaveLength(6)
  })

  it('Button variant 映射为 select', () => {
    const def = getComponentDefinition('Button')
    const fields = schemaToFields(def.propSchema)
    const variant = fields.find((f) => f.key === 'variant')
    expect(variant?.control).toBe('select')
    expect(variant?.options?.map((o) => o.value)).toEqual(['primary', 'secondary', 'ghost'])
  })

  it('Button disabled 映射为 boolean', () => {
    const def = getComponentDefinition('Button')
    const fields = schemaToFields(def.propSchema)
    expect(fields.find((f) => f.key === 'disabled')?.control).toBe('boolean')
  })

  it('Image src 标记为 asset', () => {
    const def = getComponentDefinition('Image')
    const fields = schemaToFields(def.propSchema)
    expect(fields.find((f) => f.key === 'src')?.control).toBe('asset')
  })

  it('Image fit 映射为 select', () => {
    const def = getComponentDefinition('Image')
    const fields = schemaToFields(def.propSchema)
    expect(fields.find((f) => f.key === 'fit')?.control).toBe('select')
  })

  it('Container 无 props 字段', () => {
    const def = getComponentDefinition('Container')
    expect(schemaToFields(def.propSchema)).toEqual([])
  })

  it('PageRoot 包含 title 字段', () => {
    const def = getComponentDefinition('PageRoot')
    const fields = schemaToFields(def.propSchema)
    expect(fields.find((f) => f.key === 'title')?.control).toBe('text')
  })
})

describe('P1 STYLE_FIELDS', () => {
  it('覆盖布局/视觉/文字/间距四组', () => {
    const groups = new Set(STYLE_FIELDS.map((f) => f.group))
    expect(groups.has('layout')).toBe(true)
    expect(groups.has('visual')).toBe(true)
    expect(groups.has('text')).toBe(true)
    expect(groups.has('spacing')).toBe(true)
  })

  it('display 是 select 且 4+ 选项', () => {
    const d = STYLE_FIELDS.find((f) => f.key === 'display')!
    expect(d.control).toBe('select')
    expect(d.options!.length).toBeGreaterThanOrEqual(4)
  })

  it('color / backgroundColor 映射为 color 控件', () => {
    expect(STYLE_FIELDS.find((f) => f.key === 'color')?.control).toBe('color')
    expect(STYLE_FIELDS.find((f) => f.key === 'backgroundColor')?.control).toBe('color')
  })

  it('padding / margin 在 spacing 组', () => {
    expect(STYLE_FIELDS.find((f) => f.key === 'padding')?.group).toBe('spacing')
    expect(STYLE_FIELDS.find((f) => f.key === 'margin')?.group).toBe('spacing')
  })
})
