import { describe, it, expect, beforeEach } from 'vitest'
import { createPageRoot, createNode } from '@pageforge/schema'
import { applyCommand } from '@/editor/commands/executor'
import { makeAddCommand } from '@/editor/commands/types'
import { computeDropTarget, canDrop } from '@/editor/dnd'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project'
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

describe('P1 dnd - computeDropTarget', () => {
  it('hover 容器中段 -> inside', () => {
    const root = makeTree()
    // hover 在 c 上，鼠标位于中段
    const target = computeDropTarget(root, 'c', {
      offsetX: 50,
      offsetY: 25,
      width: 100,
      height: 50
    })
    expect(target?.kind).toBe('inside')
    expect(target?.parentId).toBe('c')
    expect(target?.index).toBe(2) // c 已有 2 个子节点
  })

  it('hover 容器上段 -> 视为该容器内的 before（实际是 index 0）', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 'c', {
      offsetX: 50,
      offsetY: 5,
      width: 100,
      height: 50
    })
    // 上段：用 c 的父（root），但 c 在 root 的 index 0
    expect(target?.parentId).toBe(root.id)
    expect(target?.index).toBe(0)
    expect(target?.kind).toBe('before')
  })

  it('hover 非容器节点上半 -> before', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 't1', {
      offsetX: 50,
      offsetY: 5,
      width: 100,
      height: 30
    })
    expect(target?.parentId).toBe('c')
    expect(target?.index).toBe(0) // t1 在 c 的 index 0
    expect(target?.kind).toBe('before')
  })

  it('hover 非容器节点下半 -> after', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 't1', {
      offsetX: 50,
      offsetY: 25,
      width: 100,
      height: 30
    })
    expect(target?.parentId).toBe('c')
    expect(target?.index).toBe(1) // t1 后
    expect(target?.kind).toBe('after')
  })

  it('横向容器按 X 判断', () => {
    const root = createPageRoot()
    const row = createNode('Container', { id: 'row', style: { flexDirection: 'row' } as any })
    const a = createNode('Text', { id: 'a' })
    let r = applyCommand(root, makeAddCommand(root.id, row))
    r = applyCommand(r, makeAddCommand('row', a))
    // hover a 的右半部
    const target = computeDropTarget(r, 'a', { offsetX: 80, offsetY: 5, width: 100, height: 30 })
    expect(target?.kind).toBe('after')
    expect(target?.index).toBe(1)
  })
})

describe('P1 dnd - canDrop', () => {
  it('允许拖到其他容器', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 't1', {
      offsetX: 50,
      offsetY: 5,
      width: 100,
      height: 30
    })!
    expect(canDrop(root, 't2', target)).toBe(true)
  })

  it('禁止 source 当作自己的 parent（拖到自己内部）', () => {
    const root = makeTree()
    // target.parentId === sourceId 的场景：把 c 拖到 c 内部
    const target: any = { parentId: 'c', index: 0, refId: 'c', kind: 'inside' }
    expect(canDrop(root, 'c', target)).toBe(false)
  })

  it('允许 t2 拖到 t1 位置（普通重排）', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 't1', {
      offsetX: 50,
      offsetY: 5,
      width: 100,
      height: 30
    })!
    // t2 拖到 t1 before 位置：合法
    expect(canDrop(root, 't2', target)).toBe(true)
    // t1 拖到 t1 before 位置：sourceId !== target.parentId，但实际是"原地"——
    // 此处视为合法（moveNode 会判断无变化），canDrop 不阻止
  })

  it('禁止拖到自己后代', () => {
    // c 是 root 的子节点，把 c 拖到 c 内部
    const root = makeTree()
    const target: any = { parentId: 'c', index: 0, refId: 'c', kind: 'inside' }
    expect(canDrop(root, 'c', target)).toBe(false)
  })

  it('禁止拖动 PageRoot', () => {
    const root = makeTree()
    const target = computeDropTarget(root, 't1', {
      offsetX: 50,
      offsetY: 5,
      width: 100,
      height: 30
    })!
    expect(canDrop(root, root.id, target)).toBe(false)
  })
})

describe('P1 project store - moveNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('跨容器移动节点', () => {
    const s = useProjectStore()
    const c1 = s.addNode('Container')
    const c2 = s.addNode('Container')
    const t = s.addNode('Text', c1.id)
    s.moveNode(t.id, c2.id, 0)
    const root = s.getCurrentRoot()
    expect(root.children!.find((n) => n.id === c1.id)!.children).toHaveLength(0)
    expect(root.children!.find((n) => n.id === c2.id)!.children).toHaveLength(1)
  })

  it('moveNode 可撤销', () => {
    const s = useProjectStore()
    const c1 = s.addNode('Container')
    const c2 = s.addNode('Container')
    const t = s.addNode('Text', c1.id)
    s.moveNode(t.id, c2.id, 0)
    s.undo()
    const root = s.getCurrentRoot()
    expect(root.children!.find((n) => n.id === c1.id)!.children).toHaveLength(1)
    expect(root.children!.find((n) => n.id === c2.id)!.children).toHaveLength(0)
  })

  it('reorderNode 同容器重排', () => {
    const s = useProjectStore()
    const a = s.addNode('Text', undefined, 0)
    const b = s.addNode('Text', undefined, 1)
    s.reorderNode(s.getCurrentRoot().id, 0, 1)
    expect(s.getCurrentRoot().children!.map((n) => n.id)).toEqual([b.id, a.id])
  })
})
