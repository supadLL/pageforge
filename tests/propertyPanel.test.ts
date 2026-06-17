import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { findNode } from '@/editor/treeOps'

describe('P1 project store - updateNodeProps', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('更新 Heading 文本', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.updateNodeProps(n.id, { text: 'New Title' })
    expect(findNode(s.getCurrentRoot(), n.id)!.props.text).toBe('New Title')
  })

  it('合并保留其他 props', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.updateNodeProps(n.id, { text: 'X' })
    expect(findNode(s.getCurrentRoot(), n.id)!.props.level).toBe(2)
  })

  it('更新 Button variant', () => {
    const s = useProjectStore()
    const n = s.addNode('Button')
    s.updateNodeProps(n.id, { variant: 'ghost' })
    expect(findNode(s.getCurrentRoot(), n.id)!.props.variant).toBe('ghost')
  })
})

describe('P1 project store - updateNodeStyle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('更新基础样式', () => {
    const s = useProjectStore()
    const n = s.addNode('Button')
    s.updateNodeStyle(n.id, { backgroundColor: '#ff0000' })
    expect(findNode(s.getCurrentRoot(), n.id)!.style.backgroundColor).toBe('#ff0000')
  })

  it('基础样式合并保留默认 color', () => {
    const s = useProjectStore()
    const n = s.addNode('Button')
    s.updateNodeStyle(n.id, { backgroundColor: '#000' })
    expect(findNode(s.getCurrentRoot(), n.id)!.style.color).toBe('#FFFFFF')
  })

  it('断点覆盖不破坏基础样式', () => {
    const s = useProjectStore()
    const n = s.addNode('Container')
    s.updateNodeStyle(n.id, { width: '100%' })
    s.updateNodeStyle(n.id, { width: '50%' }, 'mobile')
    const updated = findNode(s.getCurrentRoot(), n.id)!
    expect(updated.style.width).toBe('100%')
    expect(updated.responsive?.mobile?.style?.width).toBe('50%')
  })

  it('断点覆盖可叠加多个字段', () => {
    const s = useProjectStore()
    const n = s.addNode('Container')
    s.updateNodeStyle(n.id, { width: '50%' }, 'mobile')
    s.updateNodeStyle(n.id, { height: '200px' }, 'mobile')
    const updated = findNode(s.getCurrentRoot(), n.id)!
    expect(updated.responsive?.mobile?.style?.width).toBe('50%')
    expect(updated.responsive?.mobile?.style?.height).toBe('200px')
  })
})

describe('P1 project store - renameNode / setNodeState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renameNode 设置 name', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.renameNode(n.id, 'My Paragraph')
    expect(findNode(s.getCurrentRoot(), n.id)!.name).toBe('My Paragraph')
  })

  it('setNodeState hidden', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { hidden: true })
    expect(findNode(s.getCurrentRoot(), n.id)!.state?.hidden).toBe(true)
  })

  it('setNodeState locked', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { locked: true })
    expect(findNode(s.getCurrentRoot(), n.id)!.state?.locked).toBe(true)
  })

  it('setNodeState 合并不覆盖', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { hidden: true })
    s.setNodeState(n.id, { locked: true })
    const st = findNode(s.getCurrentRoot(), n.id)!.state
    expect(st?.hidden).toBe(true)
    expect(st?.locked).toBe(true)
  })
})
