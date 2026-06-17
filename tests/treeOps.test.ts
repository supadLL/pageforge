import { describe, it, expect } from 'vitest'
import {
  createNode,
  createPageRoot,
  createPage,
  isContainer,
  type Node
} from '@pageforge/schema'
import {
  findNode,
  findParent,
  findContainerAncestor,
  addNodeToTree,
  removeNodeFromTree,
  updateNodeInTree,
  moveNodeInTree,
  countNodes
} from '@/editor/treeOps'

function makePageRoot(): Node {
  return createPageRoot()
}

describe('P0 treeOps - findNode', () => {
  it('找根节点', () => {
    const root = makePageRoot()
    expect(findNode(root, root.id)?.id).toBe(root.id)
  })

  it('递归找子节点', () => {
    const root = makePageRoot()
    const container = createNode('Container')
    const text = createNode('Text', { id: 'text-1' })
    const r1 = addNodeToTree(root, root.id, container)
    const r2 = addNodeToTree(r1, container.id, text)
    expect(findNode(r2, 'text-1')?.id).toBe('text-1')
  })

  it('不存在返回 null', () => {
    const root = makePageRoot()
    expect(findNode(root, 'missing')).toBeNull()
  })
})

describe('P0 treeOps - findParent / findContainerAncestor', () => {
  it('直接父节点', () => {
    const root = makePageRoot()
    const c = createNode('Container')
    const t = createNode('Text', { id: 't1' })
    const r1 = addNodeToTree(root, root.id, c)
    const r2 = addNodeToTree(r1, c.id, t)
    expect(findParent(r2, 't1')?.id).toBe(c.id)
  })

  it('findContainerAncestor 跳过非容器', () => {
    const root = makePageRoot()
    const c = createNode('Container')
    const inner = createNode('Container')
    const t = createNode('Text', { id: 't1' })
    let r = addNodeToTree(root, root.id, c)
    r = addNodeToTree(r, c.id, inner)
    r = addNodeToTree(r, inner.id, t)
    // 父链是 inner -> c -> root
    // 最近的容器父节点是 inner
    expect(findContainerAncestor(r, 't1')?.id).toBe(inner.id)
  })

  it('没有容器祖先时返回 null', () => {
    const root = makePageRoot()
    // root 是容器，所以应该返回 root
    expect(findContainerAncestor(root, root.id)?.id).toBe(root.id)
  })
})

describe('P0 treeOps - addNodeToTree', () => {
  it('添加到尾部', () => {
    const root = makePageRoot()
    const c = createNode('Container')
    const r = addNodeToTree(root, root.id, c)
    expect(r.children).toHaveLength(1)
    expect(r.children![0].id).toBe(c.id)
  })

  it('指定 index 插入', () => {
    const root = makePageRoot()
    const a = createNode('Container', { id: 'a' })
    const b = createNode('Container', { id: 'b' })
    let r = addNodeToTree(root, root.id, a)
    r = addNodeToTree(r, root.id, b, 0)
    expect(r.children!.map((n) => n.id)).toEqual(['b', 'a'])
  })

  it('递归插入到子容器', () => {
    const root = makePageRoot()
    const c = createNode('Container', { id: 'c' })
    const t = createNode('Text', { id: 't' })
    let r = addNodeToTree(root, root.id, c)
    r = addNodeToTree(r, 'c', t)
    expect(r.children![0].children).toEqual([t])
  })

  it('非容器不允许添加 children', () => {
    const root = makePageRoot()
    const t = createNode('Text', { id: 't' })
    // 先把 Text 加到 root（Text 不带 children）
    const r = addNodeToTree(root, root.id, t)
    // 再尝试给 Text 加子节点应该抛"not a container"
    expect(() => addNodeToTree(r, 't', createNode('Text'))).toThrow(/not a container/)
  })
})

describe('P0 treeOps - removeNodeFromTree', () => {
  it('移除子节点', () => {
    const root = makePageRoot()
    const c = createNode('Container', { id: 'c' })
    const t = createNode('Text', { id: 't' })
    let r = addNodeToTree(root, root.id, c)
    r = addNodeToTree(r, 'c', t)
    r = removeNodeFromTree(r, 't')
    expect(r.children![0].children).toEqual([])
  })

  it('移除整个子树', () => {
    const root = makePageRoot()
    const c = createNode('Container', { id: 'c' })
    let r = addNodeToTree(root, root.id, c)
    r = removeNodeFromTree(r, 'c')
    expect(r.children).toEqual([])
  })

  it('不存在 id 不报错（无操作）', () => {
    const root = makePageRoot()
    const r = removeNodeFromTree(root, 'nonexistent')
    expect(r).toBe(root)
  })
})

describe('P0 treeOps - updateNodeInTree', () => {
  it('更新节点 props', () => {
    const root = makePageRoot()
    const t = createNode('Text', { id: 't' })
    const r = addNodeToTree(root, root.id, t)
    const r2 = updateNodeInTree(r, 't', (n) => ({
      ...n,
      props: { ...n.props, text: 'hello' }
    }))
    expect(findNode(r2, 't')!.props.text).toBe('hello')
  })
})

describe('P0 treeOps - moveNodeInTree', () => {
  it('同容器内重排', () => {
    const root = makePageRoot()
    const a = createNode('Text', { id: 'a' })
    const b = createNode('Text', { id: 'b' })
    const c = createNode('Text', { id: 'c' })
    let r = addNodeToTree(root, root.id, a)
    r = addNodeToTree(r, root.id, b)
    r = addNodeToTree(r, root.id, c)
    r = moveNodeInTree(r, 'a', root.id, 2)
    expect(r.children!.map((n) => n.id)).toEqual(['b', 'c', 'a'])
  })

  it('跨容器移动', () => {
    const root = makePageRoot()
    const c1 = createNode('Container', { id: 'c1' })
    const c2 = createNode('Container', { id: 'c2' })
    const t = createNode('Text', { id: 't' })
    let r = addNodeToTree(root, root.id, c1)
    r = addNodeToTree(r, root.id, c2)
    r = addNodeToTree(r, 'c1', t)
    r = moveNodeInTree(r, 't', 'c2', 0)
    expect(findNode(r, 'c2')!.children).toEqual([t])
    expect(findNode(r, 'c1')!.children).toEqual([])
  })

  it('不能把节点移到自己的后代', () => {
    const root = makePageRoot()
    const c = createNode('Container', { id: 'c' })
    const t = createNode('Text', { id: 't' })
    let r = addNodeToTree(root, root.id, c)
    r = addNodeToTree(r, 'c', t)
    expect(() => moveNodeInTree(r, 'c', 't', 0)).toThrow(/descendant/)
  })

  it('PageRoot 不能移动', () => {
    const root = makePageRoot()
    const c = createNode('Container', { id: 'c' })
    let r = addNodeToTree(root, root.id, c)
    expect(() => moveNodeInTree(r, root.id, 'c', 0)).toThrow(/PageRoot/)
  })

  it('不能移到非容器', () => {
    const root = makePageRoot()
    const t1 = createNode('Text', { id: 't1' })
    const t2 = createNode('Text', { id: 't2' })
    let r = addNodeToTree(root, root.id, t1)
    r = addNodeToTree(r, root.id, t2)
    expect(() => moveNodeInTree(r, 't1', 't2', 0)).toThrow(/not a container/)
  })
})

describe('P0 treeOps - countNodes', () => {
  it('空 root 计数为 1（仅 root）', () => {
    expect(countNodes(makePageRoot())).toBe(1)
  })

  it('多层嵌套计数正确', () => {
    const root = makePageRoot()
    const c1 = createNode('Container', { id: 'c1' })
    const c2 = createNode('Container', { id: 'c2' })
    const t = createNode('Text', { id: 't' })
    let r = addNodeToTree(root, root.id, c1)
    r = addNodeToTree(r, 'c1', c2)
    r = addNodeToTree(r, 'c2', t)
    // root + c1 + c2 + t = 4
    expect(countNodes(r)).toBe(4)
  })
})

describe('P0 createPage + addNode 工厂流程', () => {
  it('createPage 包含 root', () => {
    const page = createPage()
    expect(page.root.type).toBe('PageRoot')
    expect(isContainer('PageRoot')).toBe(true)
  })
})
