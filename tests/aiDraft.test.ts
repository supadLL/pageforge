import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  validateGeneratedDraft,
  normalizeGeneratedDraft,
  extractJsonFromContent,
  DEFAULT_TOKENS,
  createPageRoot,
  createNode,
  type GeneratedPageDraft,
  type Node
} from '@pageforge/schema'
import { IMAGE_TO_PAGE_SYSTEM_PROMPT, buildImageToPageMessages } from '@electron/services/ai/imageToPagePrompt'
import { makeReplacePageRootCommand } from '@/editor/commands/types'
import { applyCommand } from '@/editor/commands/executor'

describe('P3 draft - validateGeneratedDraft', () => {
  it('合法 draft 通过', () => {
    const d: GeneratedPageDraft = {
      summary: 'Hero',
      root: { type: 'PageRoot', children: [] }
    }
    expect(validateGeneratedDraft(d).valid).toBe(true)
  })

  it('缺 summary 失败', () => {
    expect(validateGeneratedDraft({ root: { type: 'PageRoot' } }).valid).toBe(false)
  })

  it('root 非对象失败', () => {
    expect(validateGeneratedDraft({ summary: 'x', root: null }).valid).toBe(false)
  })

  it('非对象失败', () => {
    expect(validateGeneratedDraft(null).valid).toBe(false)
    expect(validateGeneratedDraft('x').valid).toBe(false)
  })
})

describe('P3 draft - normalizeGeneratedDraft', () => {
  it('合法 PageRoot 草稿归一化为合法 Node', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: {
        type: 'PageRoot',
        children: [
          { type: 'Heading', props: { text: 'Hi', level: 2 } },
          { type: 'Button', props: { text: 'Go' } }
        ]
      } as any
    }
    const r = normalizeGeneratedDraft(d)
    expect(r.root.type).toBe('PageRoot')
    expect(r.root.children).toHaveLength(2)
    expect(r.root.children![0].type).toBe('Heading')
    expect(r.root.children![0].props.text).toBe('Hi')
    expect(r.root.children![1].type).toBe('Button')
    // 每个节点有 id
    expect(r.root.children![0].id).toBeTruthy()
  })

  it('补默认 props（Heading 缺 level）', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: { type: 'PageRoot', children: [{ type: 'Heading', props: { text: 'T' } }] } as any
    }
    const r = normalizeGeneratedDraft(d)
    expect(r.root.children![0].props.level).toBe(2) // 默认
  })

  it('未知 type 跳过并记 warning', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: {
        type: 'PageRoot',
        children: [{ type: 'Banana', props: {} } as any]
      }
    }
    const r = normalizeGeneratedDraft(d)
    expect(r.root.children).toHaveLength(0)
    expect(r.warnings.length).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.includes('Banana'))).toBe(true)
  })

  it('非 PageRoot root 被包一层 PageRoot', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: { type: 'Container', children: [] }
    }
    const r = normalizeGeneratedDraft(d)
    expect(r.root.type).toBe('PageRoot')
    expect(r.root.children).toHaveLength(1)
    expect(r.root.children![0].type).toBe('Container')
  })

  it('非容器组件丢弃 children', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: {
        type: 'PageRoot',
        children: [{ type: 'Text', props: { text: 'x' }, children: [{ type: 'Text', props: { text: 'inner' } }] }]
      } as any
    }
    const r = normalizeGeneratedDraft(d)
    expect(r.root.children![0].children).toBeUndefined()
  })

  it('tokens 合并到 base（不覆盖已有 key）', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: { type: 'PageRoot' },
      tokens: { colors: { primary: '#ff0000', newColor: '#00ff00' } }
    }
    const r = normalizeGeneratedDraft(d, DEFAULT_TOKENS)
    expect(r.tokens?.colors.primary).toBe('#ff0000') // 覆盖
    expect(r.tokens?.colors.newColor).toBe('#00ff00') // 新增
    expect(r.tokens?.colors.text).toBe(DEFAULT_TOKENS.colors.text) // 保留 base
  })

  it('深度嵌套递归处理', () => {
    const d: GeneratedPageDraft = {
      summary: 'x',
      root: {
        type: 'PageRoot',
        children: [
          {
            type: 'Container',
            children: [
              { type: 'Card', children: [{ type: 'Text', props: { text: 'deep' } }] }
            ]
          }
        ]
      } as any
    }
    const r = normalizeGeneratedDraft(d)
    const container = r.root.children![0]
    const card = container.children![0]
    expect(card.type).toBe('Card')
    expect(card.children![0].props.text).toBe('deep')
  })

  it('draft.root 无效时返回空 PageRoot', () => {
    const d = { summary: 'x', root: null } as any
    const r = normalizeGeneratedDraft(d)
    expect(r.root.type).toBe('PageRoot')
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe('P3 draft - extractJsonFromContent', () => {
  it('纯 JSON', () => {
    expect(extractJsonFromContent('{"a":1}')).toEqual({ a: 1 })
  })

  it('```json 围栏', () => {
    const s = 'Here is the result:\n```json\n{"a":1}\n```\nDone.'
    expect(extractJsonFromContent(s)).toEqual({ a: 1 })
  })

  it('``` 围栏无 json 标记', () => {
    const s = '```\n{"a":1}\n```'
    expect(extractJsonFromContent(s)).toEqual({ a: 1 })
  })

  it('前后有文字的裸 JSON 子串', () => {
    const s = 'The answer is {"a":1} thanks'
    expect(extractJsonFromContent(s)).toEqual({ a: 1 })
  })

  it('无法解析返回 null', () => {
    expect(extractJsonFromContent('no json here')).toBeNull()
  })
})

describe('P3 imageToPage prompt', () => {
  it('system prompt 包含组件类型枚举', () => {
    expect(IMAGE_TO_PAGE_SYSTEM_PROMPT).toContain('PageRoot')
    expect(IMAGE_TO_PAGE_SYSTEM_PROMPT).toContain('Heading')
    expect(IMAGE_TO_PAGE_SYSTEM_PROMPT).toContain('Button')
  })

  it('system prompt 包含 style key 白名单', () => {
    expect(IMAGE_TO_PAGE_SYSTEM_PROMPT).toContain('backgroundColor')
    expect(IMAGE_TO_PAGE_SYSTEM_PROMPT).toContain('flexDirection')
  })

  it('buildImageToPageMessages 生成 system + user(图片)', () => {
    const msgs = buildImageToPageMessages('data:image/png;base64,xxx', '识别此卡片')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
    const content = msgs[1].content as any[]
    expect(content[0].type).toBe('text')
    expect(content[0].text).toBe('识别此卡片')
    expect(content[1].type).toBe('image_url')
    expect(content[1].image_url.url).toContain('base64')
  })
})

describe('P3 replacePageRoot command', () => {
  it('apply 替换整个 root', () => {
    const before = createPageRoot()
    const after = createPageRoot()
    after.children = [createNode('Heading')]
    const cmd = makeReplacePageRootCommand(before, after)
    const r = applyCommand(before, cmd)
    expect(r).toBe(after)
    expect(r.children).toHaveLength(1)
  })

  it('revert 恢复旧 root', () => {
    const before = createPageRoot()
    before.children = [createNode('Text')]
    const after = createPageRoot()
    const cmd = makeReplacePageRootCommand(before, after)
    const r1 = applyCommand(before, cmd)
    expect(r1.children).toHaveLength(0)
    const r2 = applyCommand(r1, cmd, true)
    expect(r2.children).toHaveLength(1)
  })
})

describe('P3 store - loadGeneratedDraft', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('replace 模式替换当前 root', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    s.addNode('Text') // 原 root 有 1 个子节点
    expect(s.getCurrentRoot().children).toHaveLength(1)
    const newRoot = createPageRoot()
    newRoot.children = [createNode('Heading'), createNode('Button')]
    s.loadGeneratedDraft(newRoot, 'replace')
    expect(s.getCurrentRoot().children).toHaveLength(2)
    expect(s.getCurrentRoot().children![0].type).toBe('Heading')
  })

  it('append 模式追加到当前 root', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    s.addNode('Text')
    const newRoot = createPageRoot()
    newRoot.children = [createNode('Heading')]
    s.loadGeneratedDraft(newRoot, 'append')
    expect(s.getCurrentRoot().children).toHaveLength(2)
    expect(s.getCurrentRoot().children![0].type).toBe('Text')
    expect(s.getCurrentRoot().children![1].type).toBe('Heading')
  })

  it('replace 模式可撤销', async () => {
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    s.addNode('Text')
    const before = s.getCurrentRoot()
    const newRoot = createPageRoot()
    newRoot.children = [createNode('Heading')]
    s.loadGeneratedDraft(newRoot, 'replace')
    s.undo()
    expect(s.getCurrentRoot().children!.map((n: Node) => n.type)).toEqual(['Text'])
  })
})
