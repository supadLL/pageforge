import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { findNode, findParent } from '@/editor/treeOps'
import { createPageRoot, createNode } from '@pageforge/schema'

describe('P1 图层面板 - 树遍历', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('findParent 找直接父节点', () => {
    const s = useProjectStore()
    const c = s.addNode('Container')
    const t = s.addNode('Text', c.id)
    const root = s.getCurrentRoot()
    expect(findParent(root, t.id)?.id).toBe(c.id)
  })

  it('findParent 对 root 返回 null', () => {
    const s = useProjectStore()
    expect(findParent(s.getCurrentRoot(), s.getCurrentRoot().id)).toBeNull()
  })
})

describe('P1 图层面板 - 选中同步', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('画布选中变化能反映到 editor store', () => {
    const s = useProjectStore()
    const e = useEditorStore()
    const n = s.addNode('Heading')
    e.selectNode(n.id)
    expect(e.selectedNodeId).toBe(n.id)
  })

  it('图层面板选中后画布节点可定位', () => {
    const s = useProjectStore()
    const e = useEditorStore()
    const n = s.addNode('Text')
    e.selectNode(n.id)
    expect(s.findNodeById(e.selectedNodeId!)?.id).toBe(n.id)
  })
})

describe('P1 图层面板 - 节点状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hidden 状态写入 node.state', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { hidden: true })
    expect(findNode(s.getCurrentRoot(), n.id)!.state?.hidden).toBe(true)
  })

  it('locked 状态写入 node.state', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { locked: true })
    expect(findNode(s.getCurrentRoot(), n.id)!.state?.locked).toBe(true)
  })

  it('切换状态（取消 hidden）', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { hidden: true })
    s.setNodeState(n.id, { hidden: false })
    expect(findNode(s.getCurrentRoot(), n.id)!.state?.hidden).toBe(false)
  })
})

describe('P1 图层面板 - 删除节点', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('删除普通节点', () => {
    const s = useProjectStore()
    const n = s.addNode('Text')
    expect(s.getCurrentRoot().children).toHaveLength(1)
    s.removeNode(n.id)
    expect(s.getCurrentRoot().children).toHaveLength(0)
  })

  it('删除节点同时删除子节点', () => {
    const s = useProjectStore()
    const c = s.addNode('Container')
    s.addNode('Text', c.id)
    s.addNode('Heading', c.id)
    s.removeNode(c.id)
    expect(s.getCurrentRoot().children).toHaveLength(0)
  })

  it('删除选中节点后选中其父节点', () => {
    const s = useProjectStore()
    const e = useEditorStore()
    const c = s.addNode('Container')
    const t = s.addNode('Text', c.id)
    e.selectNode(t.id)
    // 模拟图层面板删除逻辑
    const parent = findParent(s.getCurrentRoot(), t.id)
    if (e.selectedNodeId === t.id) {
      e.selectNode(parent?.id ?? null)
    }
    s.removeNode(t.id)
    expect(e.selectedNodeId).toBe(c.id)
  })

  it('PageRoot 删除被保护（store 不阻止，但 UI 层阻止）', () => {
    // treeOps.removeNodeFromTree 在删除 root 自身 id 时，root.id 不在 children 里，
    // 会原样返回 root（同一引用）。这里验证 root 仍然存在且类型仍为 PageRoot。
    const s = useProjectStore()
    s.addNode('Text')
    const rootBefore = s.getCurrentRoot()
    s.removeNode(rootBefore.id) // root.id 不在子节点中，原样返回
    const rootAfter = s.getCurrentRoot()
    expect(rootAfter.type).toBe('PageRoot')
    expect(rootAfter.id).toBe(rootBefore.id)
    // 子节点应仍然存在（root 自身没被删）
    expect(rootAfter.children).toHaveLength(1)
  })
})

describe('P1 图层面板 - 重命名', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renameNode 设置 name', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.renameNode(n.id, 'Hero Title')
    expect(findNode(s.getCurrentRoot(), n.id)!.name).toBe('Hero Title')
  })

  it('renameNode 不影响 props', () => {
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.renameNode(n.id, 'X')
    expect(findNode(s.getCurrentRoot(), n.id)!.props.text).toBe('Heading')
  })
})
