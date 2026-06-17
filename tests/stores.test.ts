import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../src/stores/project'
import { useEditorStore } from '../src/stores/editor'
import { findNode } from '../src/editor/treeOps'
import {
  DEFAULT_TOKENS,
  type Node,
  type ComponentType
} from '@pageforge/schema'

describe('P0 project store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始包含 1 个 Home 页面', () => {
    const s = useProjectStore()
    expect(s.project.pages).toHaveLength(1)
    expect(s.currentPage.name).toBe('Home')
  })

  it('addNode 写到 PageRoot', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    const root = s.getCurrentRoot()
    expect(root.children).toHaveLength(1)
    expect(root.children![0].id).toBe(n.id)
  })

  it('addNode 写入选中容器', () => {
    const s = useProjectStore()
    const c = s.addNode('Container')
    const s2 = useProjectStore()
    s2.addNode('Heading', c.id)
    const root = s2.getCurrentRoot()
    const container = findNode(root, c.id)!
    expect(container.children).toHaveLength(1)
    expect(container.children![0].type).toBe('Heading')
  })

  it('addNode 选中非容器时找最近可承载父', () => {
    const s = useProjectStore()
    const c = s.addNode('Container') // 选中为 Container
    const t = s.addNode('Text', c.id) // 在 c 里加 Text，选中变为 t
    // 现在选中 t（非容器），再加 Button 应该回到 c
    s.addNode('Button', t.id)
    const root = s.getCurrentRoot()
    const container = findNode(root, c.id)!
    expect(container.children!.map((n: Node) => n.type)).toEqual(['Text', 'Button'])
  })

  it('removeNode 从树中移除', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    expect(s.getCurrentRoot().children).toHaveLength(1)
    s.removeNode(n.id)
    expect(s.getCurrentRoot().children).toHaveLength(0)
  })

  it('findNodeById 找节点', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    expect(s.findNodeById(n.id)?.id).toBe(n.id)
  })

  it('findNodeById 不存在返回 null', () => {
    const s = useProjectStore()
    expect(s.findNodeById('missing')).toBeNull()
  })
})

describe('P0 editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始未选中', () => {
    const e = useEditorStore()
    expect(e.selectedNodeId).toBeNull()
  })

  it('selectNode 设置选中', () => {
    const e = useEditorStore()
    e.selectNode('abc')
    expect(e.selectedNodeId).toBe('abc')
  })

  it('setBreakpoint 切换断点', () => {
    const e = useEditorStore()
    e.setBreakpoint('mobile')
    expect(e.currentBreakpoint).toBe('mobile')
  })
})

describe('P0 store 联动', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addNode 后 project.tokens 仍是默认值', () => {
    const s = useProjectStore()
    s.addNode('Text')
    expect(s.project.tokens.colors.primary).toBe(DEFAULT_TOKENS.colors.primary)
  })

  it('setTokens 替换令牌', () => {
    const s = useProjectStore()
    const next = structuredClone(DEFAULT_TOKENS)
    next.colors.primary = '#ff0000'
    s.setTokens(next)
    expect(s.project.tokens.colors.primary).toBe('#ff0000')
  })

  it('9 种 MVP 组件类型都能 addNode', () => {
    const s = useProjectStore()
    const types: ComponentType[] = [
      'Container', 'Card', 'Heading', 'Text', 'Button', 'Image', 'Input', 'Divider'
    ]
    for (const t of types) {
      s.addNode(t)
    }
    expect(s.getCurrentRoot().children).toHaveLength(8)
  })
})
