import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createPageRoot, createNode } from '@pageforge/schema'
import {
  makeAddCommand,
  makeRemoveCommand,
  makeUpdatePropsCommand,
  makeUpdateStyleCommand,
  makeRenameCommand,
  makeSetNodeStateCommand,
  makeMoveCommand,
  makeReorderCommand,
  makeUpdateResponsiveStyleCommand
} from '@/editor/commands/types'
import { applyCommand, collectRemoveSnapshot } from '@/editor/commands/executor'
import { findNode } from '@/editor/treeOps'
import type { Node } from '@pageforge/schema'

function makeTree(): Node {
  const root = createPageRoot()
  const c = createNode('Container', { id: 'c' })
  const t1 = createNode('Text', { id: 't1' })
  const t2 = createNode('Text', { id: 't2' })
  let r = applyCommand(root, makeAddCommand(root.id, c))
  r = applyCommand(r, makeAddCommand('c', t1))
  r = applyCommand(r, makeAddCommand('c', t2))
  return r
}

describe('P1 command executor - addNode / removeNode', () => {
  it('addNode 后能查到节点', () => {
    const root = createPageRoot()
    const t = createNode('Text', { id: 't' })
    const r = applyCommand(root, makeAddCommand(root.id, t))
    expect(findNode(r, 't')?.id).toBe('t')
  })

  it('addNode 的逆（revert）= removeNode', () => {
    const root = createPageRoot()
    const t = createNode('Text', { id: 't' })
    const cmd = makeAddCommand(root.id, t)
    const r1 = applyCommand(root, cmd)
    expect(findNode(r1, 't')).not.toBeNull()
    const r2 = applyCommand(r1, cmd, true)
    expect(findNode(r2, 't')).toBeNull()
  })

  it('removeNode 的逆 = 恢复子树到原位置', () => {
    let r = makeTree()
    const snap = collectRemoveSnapshot(r, 't1')!
    const cmd = makeRemoveCommand('t1', snap.snapshot, snap.parentId, snap.index)
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')).toBeNull()
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')?.id).toBe('t1')
  })
})

describe('P1 command executor - updateProps', () => {
  it('apply 更新 props', () => {
    let r = makeTree()
    const cmd = makeUpdatePropsCommand('t1', { text: 'old' }, { text: 'new' })
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')!.props.text).toBe('new')
  })

  it('revert 恢复原值', () => {
    let r = makeTree()
    const cmd = makeUpdatePropsCommand('t1', { text: 'old' }, { text: 'new' })
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')!.props.text).toBe('old')
  })
})

describe('P1 command executor - updateStyle', () => {
  it('apply 更新基础样式', () => {
    let r = makeTree()
    const cmd = makeUpdateStyleCommand('t1', { color: 'black' }, { color: 'red' })
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')!.style.color).toBe('red')
  })

  it('revert 恢复样式', () => {
    let r = makeTree()
    const cmd = makeUpdateStyleCommand('t1', { color: 'black' }, { color: 'red' })
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')!.style.color).toBe('black')
  })
})

describe('P1 command executor - updateResponsiveStyle', () => {
  it('apply 写入断点覆盖', () => {
    let r = makeTree()
    const cmd = makeUpdateResponsiveStyleCommand('t1', 'mobile', { width: '100%' }, { width: '50%' })
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')!.responsive?.mobile?.style?.width).toBe('50%')
  })

  it('revert 恢复断点覆盖', () => {
    let r = makeTree()
    const cmd = makeUpdateResponsiveStyleCommand('t1', 'mobile', { width: '100%' }, { width: '50%' })
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')!.responsive?.mobile?.style?.width).toBe('100%')
  })
})

describe('P1 command executor - renameNode', () => {
  it('apply 设置 name', () => {
    let r = makeTree()
    const cmd = makeRenameCommand('t1', 'Old', 'New')
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')!.name).toBe('New')
  })

  it('revert 恢复 name', () => {
    let r = makeTree()
    const cmd = makeRenameCommand('t1', 'Old', 'New')
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')!.name).toBe('Old')
  })
})

describe('P1 command executor - setNodeState', () => {
  it('apply 设置 hidden', () => {
    let r = makeTree()
    const cmd = makeSetNodeStateCommand('t1', { hidden: false }, { hidden: true })
    r = applyCommand(r, cmd)
    expect(findNode(r, 't1')!.state?.hidden).toBe(true)
  })

  it('revert 取消 hidden', () => {
    let r = makeTree()
    const cmd = makeSetNodeStateCommand('t1', { hidden: false }, { hidden: true })
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 't1')!.state?.hidden).toBe(false)
  })
})

describe('P1 command executor - moveNode / reorderNode', () => {
  it('moveNode 跨容器移动', () => {
    let r = makeTree()
    // c 下有 [t1, t2]，把 t1 移到 root（root 下加一个 Container 之前已加 c）
    // 先在 root 下加另一个容器 c2
    const c2 = createNode('Container', { id: 'c2' })
    r = applyCommand(r, makeAddCommand(r.id, c2))
    const cmd = makeMoveCommand('t1', 'c', 0, 'c2', 0)
    r = applyCommand(r, cmd)
    expect(findNode(r, 'c2')!.children).toHaveLength(1)
    expect(findNode(r, 'c2')!.children![0].id).toBe('t1')
    expect(findNode(r, 'c')!.children).toHaveLength(1)
  })

  it('moveNode revert 恢复位置', () => {
    let r = makeTree()
    const c2 = createNode('Container', { id: 'c2' })
    r = applyCommand(r, makeAddCommand(r.id, c2))
    const cmd = makeMoveCommand('t1', 'c', 0, 'c2', 0)
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 'c')!.children!.map((n) => n.id)).toEqual(['t1', 't2'])
    expect(findNode(r, 'c2')!.children).toHaveLength(0)
  })

  it('reorderNode 同容器重排', () => {
    let r = makeTree() // c: [t1, t2]
    const cmd = makeReorderCommand('c', 0, 1) // t1 从 0 移到 1
    r = applyCommand(r, cmd)
    expect(findNode(r, 'c')!.children!.map((n) => n.id)).toEqual(['t2', 't1'])
  })

  it('reorderNode revert', () => {
    let r = makeTree()
    const cmd = makeReorderCommand('c', 0, 1)
    r = applyCommand(r, cmd)
    r = applyCommand(r, cmd, true)
    expect(findNode(r, 'c')!.children!.map((n) => n.id)).toEqual(['t1', 't2'])
  })
})

describe('P1 history store - 撤销重做栈', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始无 undo/redo', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
  })

  it('push 后可 undo，redo 栈为空', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeRenameCommand('x', 'a', 'b'))
    expect(h.canUndo).toBe(true)
    expect(h.canRedo).toBe(false)
    expect(h.dirty).toBe(true)
  })

  it('popUndo 后命令进入 redo 栈', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeRenameCommand('x', 'a', 'b'))
    const cmd = h.popUndo()
    expect(cmd).not.toBeNull()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(true)
  })

  it('push 新命令后清空 redo 栈', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeRenameCommand('x', 'a', 'b'))
    h.popUndo()
    expect(h.canRedo).toBe(true)
    h.push(makeRenameCommand('y', 'a', 'b'))
    expect(h.canRedo).toBe(false)
  })

  it('markSaved 清 dirty', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeRenameCommand('x', 'a', 'b'))
    expect(h.dirty).toBe(true)
    h.markSaved()
    expect(h.dirty).toBe(false)
  })

  it('合并：同 nodeId 同字段在时间窗内合并', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeUpdatePropsCommand('n1', { text: 'a' }, { text: 'b' }), {
      nodeId: 'n1',
      type: 'updateProps',
      field: 'text'
    })
    h.push(makeUpdatePropsCommand('n1', { text: 'b' }, { text: 'c' }), {
      nodeId: 'n1',
      type: 'updateProps',
      field: 'text'
    })
    expect(h.undoCount).toBe(1)
    // 合并后 after 应为最后一次的 after
    const top = h.lastCommand!
    expect((top.payload as any).after.text).toBe('c')
    expect((top.payload as any).before.text).toBe('a')
  })

  it('不合并：不同 nodeId', async () => {
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const h = useHistoryStore()
    h.push(makeUpdatePropsCommand('n1', { text: 'a' }, { text: 'b' }), {
      nodeId: 'n1',
      type: 'updateProps',
      field: 'text'
    })
    h.push(makeUpdatePropsCommand('n2', { text: 'a' }, { text: 'b' }), {
      nodeId: 'n2',
      type: 'updateProps',
      field: 'text'
    })
    expect(h.undoCount).toBe(2)
  })
})

describe('P1 project store - undo/redo 集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('addNode 后 undo 恢复', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Heading')
    expect(s.getCurrentRoot().children).toHaveLength(1)
    s.undo()
    expect(s.getCurrentRoot().children).toHaveLength(0)
  })

  it('undo 后 redo 恢复', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    s.addNode('Heading')
    s.undo()
    s.redo()
    expect(s.getCurrentRoot().children).toHaveLength(1)
  })

  it('updateProps 可 undo', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.updateNodeProps(n.id, { text: 'X' })
    expect(s.findNodeById(n.id)!.props.text).toBe('X')
    s.undo()
    expect(s.findNodeById(n.id)!.props.text).toBe('Heading')
  })

  it('updateStyle 可 undo', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Text')
    // Text 默认 style.color = '$colors.text'
    const before = s.findNodeById(n.id)!.style.color
    s.updateNodeStyle(n.id, { color: 'red' })
    expect(s.findNodeById(n.id)!.style.color).toBe('red')
    s.undo()
    expect(s.findNodeById(n.id)!.style.color).toBe(before)
  })

  it('renameNode 可 undo', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.renameNode(n.id, 'Foo')
    expect(s.findNodeById(n.id)!.name).toBe('Foo')
    s.undo()
    expect(s.findNodeById(n.id)!.name).toBeUndefined()
  })

  it('setNodeState 可 undo', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Text')
    s.setNodeState(n.id, { hidden: true })
    expect(s.findNodeById(n.id)!.state?.hidden).toBe(true)
    s.undo()
    expect(s.findNodeById(n.id)!.state?.hidden).toBeFalsy()
  })

  it('removeNode 可 undo', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const n = s.addNode('Heading')
    s.removeNode(n.id)
    expect(s.getCurrentRoot().children).toHaveLength(0)
    s.undo()
    expect(s.getCurrentRoot().children).toHaveLength(1)
    expect(s.getCurrentRoot().children![0].id).toBe(n.id)
  })

  it('连续 updateProps 在时间窗内合并为一条历史', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const { useHistoryStore } = await import('@/editor/commands/historyStore')
    const s = useProjectStore()
    const h = useHistoryStore()
    const n = s.addNode('Heading')
    s.updateNodeProps(n.id, { text: 'a' })
    s.updateNodeProps(n.id, { text: 'b' })
    s.updateNodeProps(n.id, { text: 'c' })
    // addNode 算 1 条，合并后的 updateProps 算 1 条
    expect(h.undoCount).toBe(2)
    s.undo() // 撤销最后一次 updateProps 合并
    expect(s.findNodeById(n.id)!.props.text).toBe('Heading')
  })
})
