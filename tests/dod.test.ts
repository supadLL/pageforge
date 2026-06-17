import { describe, it, expect } from 'vitest'
import { createProject, createNode, type Project } from '@pageforge/schema'
import { applyCommand } from '@/editor/commands/executor'
import { makeAddCommand, makeUpdateStyleCommand } from '@/editor/commands/types'
import { exportSingleHtml, exportSplitHtml } from '@/exporters/htmlExporter'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Definition of Done 验收测试：
 * 1. 生成 examples/landing-demo.project.json
 * 2. 生成 examples/exported-html/index.html（单文件）
 * 3. 生成 examples/exported-html/split/{index.html,styles.css,script.js}
 * 4. 验证产物存在且内容合法
 */
function buildLandingPage(): Project {
  const p = createProject({ name: 'Landing Page Demo' })
  let r = p.pages[0].root
  r = applyCommand(r, makeAddCommand(r.id, createNode('Heading', { id: 'hero-title', props: { text: 'Build pages at the speed of thought', level: 1 } })))
  r = applyCommand(r, makeUpdateStyleCommand('hero-title', {}, { fontSize: '$fontSize.2xl' }))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Text', { id: 'hero-sub', props: { text: 'PageForge is a schema-first visual page builder with AI-powered design-to-code.' } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Button', {
    id: 'hero-cta',
    props: { text: 'Get Started', variant: 'primary' },
    events: [{ type: 'click', action: { kind: 'openUrl', url: 'https://pageforge.local', target: '_blank' } }]
  })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Divider', { id: 'div1' })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Container', { id: 'features', style: { flexDirection: 'row' } as any })))
  r = applyCommand(r, makeUpdateStyleCommand('features', {}, { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '$spacing.5' }))
  const features = [
    { id: 'f1', title: 'Schema-Driven', text: 'Node Tree is the single source of truth.' },
    { id: 'f2', title: 'AI-Ready', text: 'Image-to-page and prompt-to-patch protocols.' },
    { id: 'f3', title: 'Multi-Framework', text: 'Export to HTML, Vue, React, uni-app.' }
  ]
  for (const f of features) {
    r = applyCommand(r, makeAddCommand('features', createNode('Card', { id: f.id })))
    r = applyCommand(r, makeAddCommand(f.id, createNode('Heading', { id: `${f.id}-h`, props: { text: f.title, level: 3 } })))
    r = applyCommand(r, makeAddCommand(f.id, createNode('Text', { id: `${f.id}-t`, props: { text: f.text } })))
  }
  p.pages[0].root = r
  p.pages[0].meta = { title: 'PageForge — Landing Demo', description: '示例落地页' }
  return p
}

const projectRoot = resolve(__dirname, '..')

describe('Definition of Done - 示例项目与导出产物', () => {
  it('生成 examples/landing-demo.project.json', () => {
    const p = buildLandingPage()
    const examplesDir = join(projectRoot, 'examples')
    mkdirSync(examplesDir, { recursive: true })
    writeFileSync(join(examplesDir, 'landing-demo.project.json'), JSON.stringify(p, null, 2), 'utf-8')
    expect(existsSync(join(examplesDir, 'landing-demo.project.json'))).toBe(true)
  })

  it('生成 examples/exported-html/index.html（单文件）', () => {
    const p = buildLandingPage()
    const dir = join(projectRoot, 'examples', 'exported-html')
    mkdirSync(dir, { recursive: true })
    const html = exportSingleHtml(p, p.pages[0].id)
    writeFileSync(join(dir, 'index.html'), html, 'utf-8')
    expect(existsSync(join(dir, 'index.html'))).toBe(true)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Build pages at the speed of thought')
  })

  it('生成 examples/exported-html/split/ 分离文件', () => {
    const p = buildLandingPage()
    const dir = join(projectRoot, 'examples', 'exported-html', 'split')
    mkdirSync(dir, { recursive: true })
    const files = exportSplitHtml(p, p.pages[0].id)
    for (const f of files) {
      writeFileSync(join(dir, f.path), f.content, 'utf-8')
    }
    expect(existsSync(join(dir, 'index.html'))).toBe(true)
    expect(existsSync(join(dir, 'styles.css'))).toBe(true)
    expect(existsSync(join(dir, 'script.js'))).toBe(true)
  })

  it('示例项目能通过 validateProject', async () => {
    const { validateProject } = await import('@pageforge/schema')
    const p = buildLandingPage()
    const r = validateProject(p)
    expect(r.valid).toBe(true)
  })

  it('导出的单文件 HTML 包含 token CSS 变量与事件 JS', () => {
    const p = buildLandingPage()
    const html = exportSingleHtml(p, p.pages[0].id)
    expect(html).toContain('--pf-colors-primary')
    expect(html).toContain('addEventListener')
    expect(html).toContain('pageforge.local')
  })
})
