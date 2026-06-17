import { describe, it, expect } from 'vitest'
import { createProject, createNode, type Project, type Node } from '@pageforge/schema'
import { applyCommand } from '@/editor/commands/executor'
import { makeAddCommand, makeUpdateStyleCommand } from '@/editor/commands/types'
import {
  exportSingleHtml,
  exportSplitHtml,
  htmlExporter,
  DEFAULT_EXPORT_OPTIONS
} from '@/exporters/htmlExporter'

function makeProjectWithNodes(): Project {
  const p = createProject({ name: 'Export Test' })
  // 在 page root 加 Heading + Text + Button + Container(内含 Text)
  const root = p.pages[0].root
  let r = applyCommand(root, makeAddCommand(root.id, createNode('Heading', { id: 'h1', props: { text: 'Hello', level: 1 } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Text', { id: 't1', props: { text: 'World' } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Button', { id: 'b1', props: { text: 'Click', variant: 'primary' }, events: [{ type: 'click', action: { kind: 'openUrl', url: 'https://example.com', target: '_blank' } }] })))
  const c = createNode('Container', { id: 'c1' })
  r = applyCommand(r, makeAddCommand(r.id, c))
  r = applyCommand(r, makeAddCommand('c1', createNode('Text', { id: 't2', props: { text: 'Inner' } })))
  p.pages[0].root = r
  return p
}

describe('P2 HTML exporter - 单文件', () => {
  it('生成 index.html 文件', () => {
    const p = makeProjectWithNodes()
    const files = exportSplitHtml(p, p.pages[0].id)
    const html = files.find((f) => f.path === 'index.html')!.content
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<p')
    expect(html).toContain('World')
    expect(html).toContain('<button')
    expect(html).toContain('Click')
    expect(html).toContain('Inner')
  })

  it('CSS 文件包含 token 变量', () => {
    const p = makeProjectWithNodes()
    const files = exportSplitHtml(p, p.pages[0].id)
    const css = files.find((f) => f.path === 'styles.css')!.content
    expect(css).toContain('--pf-colors-primary')
    expect(css).toContain('--pf-spacing-4')
    expect(css).toContain(':root')
  })

  it('CSS 文件包含 node class', () => {
    const p = makeProjectWithNodes()
    const files = exportSplitHtml(p, p.pages[0].id)
    const css = files.find((f) => f.path === 'styles.css')!.content
    expect(css).toContain('.pf-n-h1')
    expect(css).toContain('.pf-n-b1')
  })

  it('JS 文件包含事件绑定', () => {
    const p = makeProjectWithNodes()
    const files = exportSplitHtml(p, p.pages[0].id)
    const js = files.find((f) => f.path === 'script.js')!.content
    expect(js).toContain('addEventListener')
    expect(js).toContain('example.com')
    expect(js).toContain('window.open')
  })

  it('单文件模式内联 CSS 和 JS', () => {
    const p = makeProjectWithNodes()
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('<style>')
    expect(html).toContain('--pf-colors-primary')
    expect(html).toContain('<script>')
    expect(html).toContain('addEventListener')
    // 不应该有 <link> 或 <script src>
    expect(html).not.toContain('link rel="stylesheet"')
    expect(html).not.toContain('<script src=')
  })

  it('分离模式引用外部文件', () => {
    const p = makeProjectWithNodes()
    const files = exportSplitHtml(p, p.pages[0].id)
    const html = files.find((f) => f.path === 'index.html')!.content
    expect(html).toContain('link rel="stylesheet" href="styles.css"')
    expect(html).toContain('<script src="script.js">')
  })
})

describe('P2 HTML exporter - token 引用转 CSS var', () => {
  it('style 中 $colors.primary 输出为 var(--pf-colors-primary)', () => {
    const p = makeProjectWithNodes()
    // 给 Button 加 backgroundColor 引用
    p.pages[0].root = applyCommand(
      p.pages[0].root,
      makeUpdateStyleCommand('b1', {}, { backgroundColor: '$colors.primary' })
    )
    const files = exportSplitHtml(p, p.pages[0].id)
    const css = files.find((f) => f.path === 'styles.css')!.content
    expect(css).toContain('var(--pf-colors-primary)')
  })
})

describe('P2 HTML exporter - 响应式', () => {
  it('responsive 覆盖输出为 media query', () => {
    const p = makeProjectWithNodes()
    const node = findNodeLocal(p.pages[0].root, 'c1')!
    node.responsive = {
      mobile: { style: { width: '100%' } }
    }
    const files = exportSplitHtml(p, p.pages[0].id)
    const css = files.find((f) => f.path === 'styles.css')!.content
    expect(css).toContain('@media (max-width: 375px)')
    expect(css).toMatch(/pf-n-c1.*width: 100%/)
  })
})

describe('P2 HTML exporter - 隐藏节点', () => {
  it('默认不导出隐藏节点', () => {
    const p = makeProjectWithNodes()
    const node = findNodeLocal(p.pages[0].root, 't1')!
    node.state = { hidden: true }
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).not.toContain('World')
  })

  it('includeHidden=true 包含隐藏节点', async () => {
    const p = makeProjectWithNodes()
    const node = findNodeLocal(p.pages[0].root, 't1')!
    node.state = { hidden: true }
    const files = await htmlExporter.export(p, p.pages[0].id, {
      ...DEFAULT_EXPORT_OPTIONS,
      includeHidden: true
    })
    const html = files[0].content
    expect(html).toContain('World')
  })
})

describe('P2 HTML exporter - 自闭合标签', () => {
  it('Image 输出 <img />', () => {
    const p = createProject()
    p.pages[0].root = applyCommand(
      p.pages[0].root,
      makeAddCommand(p.pages[0].root.id, createNode('Image', { id: 'img1', props: { src: 'x.png', alt: 'X' } }))
    )
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('<img')
    expect(html).toContain('src="x.png"')
    expect(html).toContain('alt="X"')
  })

  it('Input 输出 <input />', () => {
    const p = createProject()
    p.pages[0].root = applyCommand(
      p.pages[0].root,
      makeAddCommand(p.pages[0].root.id, createNode('Input', { id: 'inp1' }))
    )
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('<input')
    expect(html).toContain('type="text"')
  })

  it('Divider 输出 <hr />', () => {
    const p = createProject()
    p.pages[0].root = applyCommand(
      p.pages[0].root,
      makeAddCommand(p.pages[0].root.id, createNode('Divider', { id: 'dv1' }))
    )
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('<hr')
  })
})

describe('P2 HTML exporter - 事件', () => {
  it('navigate 事件生成 window.location.href', () => {
    const p = createProject()
    const btn = createNode('Button', {
      id: 'b',
      props: { text: 'Go' },
      events: [{ type: 'click', action: { kind: 'navigate', to: '/about' } }]
    })
    p.pages[0].root = applyCommand(p.pages[0].root, makeAddCommand(p.pages[0].root.id, btn))
    const files = exportSplitHtml(p, p.pages[0].id)
    const js = files.find((f) => f.path === 'script.js')!.content
    expect(js).toContain("window.location.href")
    expect(js).toContain("/about")
  })

  it('无事件时 JS 文件仍可生成（注释占位）', () => {
    const p = createProject()
    const files = exportSplitHtml(p, p.pages[0].id)
    const js = files.find((f) => f.path === 'script.js')!.content
    expect(js).toContain('No events')
  })
})

describe('P2 HTML exporter - Heading 级别', () => {
  it('level=3 输出 <h3>', () => {
    const p = createProject()
    p.pages[0].root = applyCommand(
      p.pages[0].root,
      makeAddCommand(p.pages[0].root.id, createNode('Heading', { id: 'h', props: { text: 'X', level: 3 } }))
    )
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('<h3')
    expect(html).toContain('</h3>')
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
