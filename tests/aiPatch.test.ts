import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  validateAiPatchSet,
  normalizeAiPatchSet,
  applyPatches,
  createPageRoot,
  createNode,
  type AiPatchSet,
  type AiPatch,
  type Node
} from '@pageforge/schema'
import { EDIT_BY_PROMPT_SYSTEM_PROMPT, buildEditByPromptMessages } from '@electron/services/ai/editByPromptPrompt'
import { makeApplyPatchCommand } from '@/editor/commands/types'
import { applyCommand } from '@/editor/commands/executor'

function makeTree(): Node {
  const root = createPageRoot()
  const c = createNode('Container', { id: 'c' })
  const t1 = createNode('Text', { id: 't1', props: { text: 'Hello' } })
  const b1 = createNode('Button', { id: 'b1', props: { text: 'Click' } })
  let r = applyPatches(root, [
    { op: 'addNode', parentId: root.id, node: c },
    { op: 'addNode', parentId: 'c', node: t1 },
    { op: 'addNode', parentId: 'c', node: b1 }
  ])
  return r
}

describe('P4 AiPatchSet - validate', () => {
  it('合法 patchSet 通过', () => {
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [{ op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } }]
    }
    expect(validateAiPatchSet(ps).valid).toBe(true)
  })

  it('缺 summary 失败', () => {
    expect(validateAiPatchSet({ patches: [] }).valid).toBe(false)
  })

  it('patches 非数组失败', () => {
    expect(validateAiPatchSet({ summary: 'x', patches: 'no' }).valid).toBe(false)
  })

  it('非法 op 失败', () => {
    expect(
      validateAiPatchSet({ summary: 'x', patches: [{ op: 'fly' as any, nodeId: 'x' }] }).valid
    ).toBe(false)
  })
})

describe('P4 AiPatchSet - normalize', () => {
  it('丢弃引用不存在 nodeId 的 patch', () => {
    const root = makeTree()
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [
        { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } },
        { op: 'updateStyle', nodeId: 'nonexistent', style: { color: 'blue' } }
      ]
    }
    const r = normalizeAiPatchSet(ps, root)
    expect(r.patches).toHaveLength(1)
    expect(r.patches[0].nodeId).toBe('b1')
    expect(r.warnings.some((w) => w.includes('nonexistent'))).toBe(true)
  })

  it('addNode 补默认 id/props/style', () => {
    const root = makeTree()
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [
        { op: 'addNode', parentId: 'c', node: { type: 'Heading', props: { text: 'New' } } }
      ]
    }
    const r = normalizeAiPatchSet(ps, root)
    expect(r.patches).toHaveLength(1)
    const node = r.patches[0].node!
    expect(node.id).toBeTruthy()
    expect(node.props!.level).toBe(2) // 默认
    expect(node.style).toBeDefined()
  })

  it('addNode 未知 type 丢弃', () => {
    const root = makeTree()
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [{ op: 'addNode', parentId: 'c', node: { type: 'Banana' as any } }]
    }
    const r = normalizeAiPatchSet(ps, root)
    expect(r.patches).toHaveLength(0)
    expect(r.warnings.some((w) => w.includes('Banana'))).toBe(true)
  })

  it('updateStyle 非法 key 被移除', () => {
    const root = makeTree()
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [
        {
          op: 'updateStyle',
          nodeId: 'b1',
          style: { color: 'red', evilKey: 'x' } as any
        }
      ]
    }
    const r = normalizeAiPatchSet(ps, root)
    expect((r.patches[0].style as any).evilKey).toBeUndefined()
    expect(r.patches[0].style!.color).toBe('red')
    expect(r.warnings.some((w) => w.includes('evilKey'))).toBe(true)
  })

  it('scope 限定：只保留 scope 子树内的 patch', () => {
    const root = makeTree()
    // scope = 'c'，包含 t1 和 b1；root 直接子节点不在 scope
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [
        { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } }, // 在 scope
        { op: 'updateStyle', nodeId: 't1', style: { color: 'blue' } } // 在 scope
      ]
    }
    const r = normalizeAiPatchSet(ps, root, 'c')
    expect(r.patches).toHaveLength(2)
  })

  it('scope 限定：scope 外的 patch 被丢弃', () => {
    const root = makeTree()
    // 在 root 下加一个 scope 外的 Text
    const outer = createNode('Text', { id: 'outer' })
    const rootWithOuter = applyPatches(root, [{ op: 'addNode', parentId: root.id, node: outer }])
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [
        { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } }, // scope=c 内
        { op: 'updateStyle', nodeId: 'outer', style: { color: 'blue' } } // scope 外
      ]
    }
    const r = normalizeAiPatchSet(ps, rootWithOuter, 'c')
    expect(r.patches).toHaveLength(1)
    expect(r.patches[0].nodeId).toBe('b1')
    expect(r.warnings.some((w) => w.includes('outer'))).toBe(true)
  })

  it('缺 nodeId 的 patch 丢弃', () => {
    const root = makeTree()
    const ps: AiPatchSet = {
      summary: 'x',
      patches: [{ op: 'removeNode' } as any]
    }
    const r = normalizeAiPatchSet(ps, root)
    expect(r.patches).toHaveLength(0)
  })
})

describe('P4 applyPatches', () => {
  it('updateStyle 应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [
      { op: 'updateStyle', nodeId: 'b1', style: { backgroundColor: '#ff0000' } }
    ])
    const b1 = findNodeLocal(r, 'b1')!
    expect(b1.style.backgroundColor).toBe('#ff0000')
  })

  it('updateProps 应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [
      { op: 'updateProps', nodeId: 'b1', props: { text: 'New Text' } }
    ])
    expect(findNodeLocal(r, 'b1')!.props.text).toBe('New Text')
  })

  it('addNode 应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [
      { op: 'addNode', parentId: 'c', node: createNode('Heading', { id: 'h1' }) }
    ])
    expect(findNodeLocal(r, 'c')!.children).toHaveLength(3)
  })

  it('removeNode 应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [{ op: 'removeNode', nodeId: 't1' }])
    expect(findNodeLocal(r, 'c')!.children).toHaveLength(1)
  })

  it('renameNode 应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [{ op: 'renameNode', nodeId: 'b1', name: 'My Button' }])
    expect(findNodeLocal(r, 'b1')!.name).toBe('My Button')
  })

  it('多 patch 顺序应用', () => {
    const root = makeTree()
    const r = applyPatches(root, [
      { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } },
      { op: 'updateProps', nodeId: 'b1', props: { text: 'X' } },
      { op: 'renameNode', nodeId: 'b1', name: 'Y' }
    ])
    const b1 = findNodeLocal(r, 'b1')!
    expect(b1.style.color).toBe('red')
    expect(b1.props.text).toBe('X')
    expect(b1.name).toBe('Y')
  })

  it('updateStyle 带 breakpoint 写入 responsive', () => {
    const root = makeTree()
    const r = applyPatches(root, [
      { op: 'updateStyle', nodeId: 'b1', style: { width: '50%' }, breakpoint: 'mobile' }
    ])
    expect(findNodeLocal(r, 'b1')!.responsive?.mobile?.style?.width).toBe('50%')
  })
})

describe('P4 editByPrompt prompt', () => {
  it('system prompt 包含 op 枚举', () => {
    expect(EDIT_BY_PROMPT_SYSTEM_PROMPT).toContain('addNode')
    expect(EDIT_BY_PROMPT_SYSTEM_PROMPT).toContain('updateStyle')
    expect(EDIT_BY_PROMPT_SYSTEM_PROMPT).toContain('removeNode')
  })

  it('system prompt 包含 style 白名单', () => {
    expect(EDIT_BY_PROMPT_SYSTEM_PROMPT).toContain('backgroundColor')
  })

  it('buildEditByPromptMessages 包含树和指令', () => {
    const root = makeTree()
    const msgs = buildEditByPromptMessages(root, '把按钮改红')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
    const content = msgs[1].content as string
    expect(content).toContain('把按钮改红')
    expect(content).toContain('b1') // 树序列化包含节点 id
  })

  it('scope 模式附加 scope 提示', () => {
    const root = makeTree()
    const msgs = buildEditByPromptMessages(root, '改', 'c')
    const content = msgs[1].content as string
    expect(content).toContain('c')
    expect(content).toContain('只修改')
  })

  it('序列化去掉 events/responsive（紧凑）', () => {
    const root = createPageRoot()
    root.children = [createNode('Button', { id: 'b', events: [{ type: 'click', action: { kind: 'navigate', to: '/x' } }] })]
    const msgs = buildEditByPromptMessages(root, 'x')
    const content = msgs[1].content as string
    expect(content).not.toContain('navigate')
    expect(content).not.toContain('responsive')
    expect(content).toContain('b')
  })
})

describe('P4 applyPatchCommand', () => {
  it('apply 应用所有 patch', () => {
    const root = makeTree()
    const patches: AiPatch[] = [
      { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } },
      { op: 'updateProps', nodeId: 'b1', props: { text: 'New' } }
    ]
    const cmd = makeApplyPatchCommand(patches, root)
    const r = applyCommand(root, cmd)
    const b1 = findNodeLocal(r, 'b1')!
    expect(b1.style.color).toBe('red')
    expect(b1.props.text).toBe('New')
  })

  it('revert 用 before 快照恢复', () => {
    const root = makeTree()
    const beforeB1 = findNodeLocal(root, 'b1')!
    const patches: AiPatch[] = [
      { op: 'updateStyle', nodeId: 'b1', style: { color: 'red' } }
    ]
    const cmd = makeApplyPatchCommand(patches, root)
    const r1 = applyCommand(root, cmd)
    expect(findNodeLocal(r1, 'b1')!.style.color).toBe('red')
    const r2 = applyCommand(r1, cmd, true)
    expect(findNodeLocal(r2, 'b1')!.style.color).toBe(beforeB1.style.color)
  })
})

describe('P4 store - editByPrompt / applyAiPatches', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('applyAiPatches 走 command 可撤销', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const b = s.addNode('Button')
    const beforeColor = s.findNodeById(b.id)!.style.color
    s.applyAiPatches([
      { op: 'updateStyle', nodeId: b.id, style: { color: 'red' } }
    ])
    expect(s.findNodeById(b.id)!.style.color).toBe('red')
    s.undo()
    expect(s.findNodeById(b.id)!.style.color).toBe(beforeColor)
  })

  it('editByPrompt 无 API 时返回 applied=false', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    delete (globalThis as any).window
    const r = await s.editByPrompt('把按钮改红')
    expect(r.applied).toBe(false)
  })

  it('editByPrompt mock API 应用 patch', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const b = s.addNode('Button')
    ;(globalThis as any).window = {
      pageforge: {
        ai: {
          editByPrompt: async () => ({
            summary: '改红',
            patches: [{ op: 'updateStyle', nodeId: b.id, style: { color: 'red' } }],
            warnings: []
          })
        }
      }
    }
    const r = await s.editByPrompt('把按钮改红')
    expect(r.applied).toBe(true)
    expect(s.findNodeById(b.id)!.style.color).toBe('red')
  })

  it('editByPrompt 返回空 patches 不应用', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const b = s.addNode('Button')
    const beforeColor = s.findNodeById(b.id)!.style.color
    ;(globalThis as any).window = {
      pageforge: {
        ai: {
          editByPrompt: async () => ({
            summary: '无操作',
            patches: [],
            warnings: ['无法理解']
          })
        }
      }
    }
    const r = await s.editByPrompt('xxx')
    expect(r.applied).toBe(false)
    expect(s.findNodeById(b.id)!.style.color).toBe(beforeColor)
  })
})

function findNodeLocal(root: Node, id: string): Node | null {
  if (root.id === id) return root
  if (!root.children) return null
  for (const c of root.children) {
    const r = findNodeLocal(c, id)
    if (r) return r
  }
  return null
}
