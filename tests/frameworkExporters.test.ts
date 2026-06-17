import { describe, it, expect } from 'vitest'
import { createProject, createNode, type Project } from '@pageforge/schema'
import { applyCommand } from '@/editor/commands/executor'
import { makeAddCommand, makeUpdateStyleCommand } from '@/editor/commands/types'
import { toVueSfc } from '@/exporters/vueExporter'
import { toReact } from '@/exporters/reactExporter'
import { toUniApp } from '@/exporters/uniAppExporter'

function makeProject(): Project {
  const p = createProject({ name: 'Export Test' })
  let r = p.pages[0].root
  r = applyCommand(r, makeAddCommand(r.id, createNode('Heading', { id: 'h1', props: { text: 'Title', level: 1 } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Text', { id: 't1', props: { text: 'Body' } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Button', {
    id: 'b1',
    props: { text: 'Go' },
    events: [{ type: 'click', action: { kind: 'openUrl', url: 'https://x.com', target: '_blank' } }]
  })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Image', { id: 'img1', props: { src: 'a.png', alt: 'A' } })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Input', { id: 'inp1' })))
  r = applyCommand(r, makeAddCommand(r.id, createNode('Divider', { id: 'dv1' })))
  const c = createNode('Container', { id: 'c1' })
  r = applyCommand(r, makeAddCommand(r.id, c))
  r = applyCommand(r, makeAddCommand('c1', createNode('Text', { id: 't2', props: { text: 'Inner' } })))
  // 加响应式覆盖
  r = applyCommand(r, makeUpdateStyleCommand('b1', {}, { backgroundColor: '$colors.primary' }))
  p.pages[0].root = r
  return p
}

// ===== Vue =====
describe('P5 Vue SFC 导出器', () => {
  it('生成 .vue 文件', () => {
    const p = makeProject()
    const files = toVueSfc(p, p.pages[0].id)
    expect(files).toHaveLength(1)
    expect(files[0].path.endsWith('.vue')).toBe(true)
  })

  it('包含 template / script setup / style scoped', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id)[0].content
    expect(sfc).toContain('<template>')
    expect(sfc).toContain('<script setup lang="ts">')
    expect(sfc).toContain('<style scoped>')
  })

  it('template 用对应标签', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id)[0].content
    expect(sfc).toContain('<h1') // Heading level=1
    expect(sfc).toContain('<p') // Text
    expect(sfc).toContain('<button') // Button
    expect(sfc).toContain('<img') // Image
    expect(sfc).toContain('<input') // Input
    expect(sfc).toContain('<hr') // Divider
    expect(sfc).toContain('<div') // Container
  })

  it('事件生成 handle 函数 + @click 绑定', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id)[0].content
    expect(sfc).toContain('@click=')
    expect(sfc).toContain('function handle')
    expect(sfc).toContain('window.open')
    expect(sfc).toContain('https://x.com')
  })

  it('style 包含 token CSS 变量', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id)[0].content
    expect(sfc).toContain('--pf-colors-primary')
    expect(sfc).toContain('var(--pf-colors-primary)')
  })

  it('文本内容正确转义', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id)[0].content
    expect(sfc).toContain('Title')
    expect(sfc).toContain('Body')
    expect(sfc).toContain('Go')
    expect(sfc).toContain('Inner')
  })

  it('withScript=false 不生成 script', () => {
    const p = makeProject()
    const sfc = toVueSfc(p, p.pages[0].id, { withScript: false })[0].content
    expect(sfc).not.toContain('<script setup')
  })
})

// ===== React =====
describe('P5 React 导出器', () => {
  it('生成 .tsx + .module.css', () => {
    const p = makeProject()
    const files = toReact(p, p.pages[0].id)
    expect(files).toHaveLength(2)
    expect(files.some((f) => f.path.endsWith('.tsx'))).toBe(true)
    expect(files.some((f) => f.path.endsWith('.module.css'))).toBe(true)
  })

  it('tsx 用 JSX 标签 + className={styles.xxx}', () => {
    const p = makeProject()
    const tsx = toReact(p, p.pages[0].id).find((f) => f.path.endsWith('.tsx'))!.content
    expect(tsx).toContain('<h1')
    expect(tsx).toContain('<button')
    expect(tsx).toContain('<img')
    expect(tsx).toContain('<input')
    expect(tsx).toContain('<hr')
    expect(tsx).toContain('className={styles.')
  })

  it('事件生成箭头函数 + onClick', () => {
    const p = makeProject()
    const tsx = toReact(p, p.pages[0].id).find((f) => f.path.endsWith('.tsx'))!.content
    expect(tsx).toContain('onClick=')
    expect(tsx).toContain('window.open')
  })

  it('CSS Modules 包含 token 变量', () => {
    const p = makeProject()
    const css = toReact(p, p.pages[0].id).find((f) => f.path.endsWith('.module.css'))!.content
    expect(css).toContain('--pf-colors-primary')
  })

  it('import styles 语句', () => {
    const p = makeProject()
    const tsx = toReact(p, p.pages[0].id).find((f) => f.path.endsWith('.tsx'))!.content
    expect(tsx).toContain("import styles from")
    expect(tsx).toContain('.module.css')
  })

  it('typescript=false 生成 .jsx', () => {
    const p = makeProject()
    const files = toReact(p, p.pages[0].id, { typescript: false })
    expect(files.some((f) => f.path.endsWith('.jsx'))).toBe(true)
  })
})

// ===== uni-app =====
describe('P5 uni-app 导出器', () => {
  it('生成 .vue + pages.json.fragment', () => {
    const p = makeProject()
    const files = toUniApp(p, p.pages[0].id)
    expect(files.some((f) => f.path.endsWith('.vue'))).toBe(true)
    expect(files.some((f) => f.path === 'pages.json.fragment')).toBe(true)
  })

  it('template 用 uni-app 标签（view/text/image/button）', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    expect(vue).toContain('<view') // PageRoot/Container
    expect(vue).toContain('<text') // Heading/Text
    expect(vue).toContain('<image') // Image（不是 img）
    expect(vue).toContain('<button') // Button
    expect(vue).toContain('<input') // Input
    expect(vue).toContain('pf-divider') // Divider（不是 hr）
  })

  it('不出现 div/p/img/hr 标签', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    // 模板部分不应有 <div <p <img <hr
    const templatePart = vue.split('<template>')[1].split('</template>')[0]
    expect(templatePart).not.toContain('<div')
    expect(templatePart).not.toContain('<p>')
    expect(templatePart).not.toContain('<img')
    expect(templatePart).not.toContain('<hr')
  })

  it('事件用 @tap + uni.navigateTo', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    expect(vue).toContain('@tap=')
    expect(vue).toContain('uni.navigateTo')
  })

  it('pages.json.fragment 包含 path 与 navigationBarTitleText', () => {
    const p = makeProject()
    const frag = toUniApp(p, p.pages[0].id).find((f) => f.path === 'pages.json.fragment')!.content
    const parsed = JSON.parse(frag)
    expect(parsed.path).toBe('pages/index/index')
    expect(parsed.style.navigationBarTitleText).toBe('首页')
  })

  it('Image mode 映射（cover→aspectFill）', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    expect(vue).toContain('mode="aspectFill"')
  })

  it('style 包含 token 变量（在 page 选择器）', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    expect(vue).toContain('page {')
    expect(vue).toContain('--pf-colors-primary')
  })

  it('withPagesJson=false 不生成 fragment', () => {
    const p = makeProject()
    const files = toUniApp(p, p.pages[0].id, { withPagesJson: false })
    expect(files.some((f) => f.path === 'pages.json.fragment')).toBe(false)
  })

  it('用 Options API 而非 script setup', () => {
    const p = makeProject()
    const vue = toUniApp(p, p.pages[0].id).find((f) => f.path.endsWith('.vue'))!.content
    expect(vue).toContain('<script>')
    expect(vue).not.toContain('<script setup')
    expect(vue).toContain('export default')
  })
})
