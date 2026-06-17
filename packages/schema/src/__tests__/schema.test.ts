import { describe, it, expect } from 'vitest'
import {
  createProject,
  createPage,
  createPageRoot,
  CURRENT_SCHEMA_VERSION,
  validateProject,
  validatePage,
  validateNode,
  validateAsset,
  MVP_COMPONENT_TYPES,
  isTokenRef,
  parseTokenRef,
  tokenRefToCssVar,
  resolveToken,
  DEFAULT_TOKENS
} from '@pageforge/schema'

describe('P0 Schema 基础常量', () => {
  it('当前 schemaVersion 为 1', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1)
  })

  it('MVP 组件类型集合固定 9 个', () => {
    expect(MVP_COMPONENT_TYPES).toHaveLength(9)
    expect(MVP_COMPONENT_TYPES).toContain('PageRoot')
    expect(MVP_COMPONENT_TYPES).toContain('Container')
    expect(MVP_COMPONENT_TYPES).toContain('Heading')
  })
})

describe('P0 Token 引用解析', () => {
  it('合法 token 引用识别', () => {
    expect(isTokenRef('$colors.primary')).toBe(true)
    expect(isTokenRef('$spacing.4')).toBe(true)
    expect(isTokenRef('$radius.md')).toBe(true)
  })

  it('非法引用拒绝', () => {
    expect(isTokenRef('colors.primary')).toBe(false) // 缺少 $
    expect(isTokenRef('$Primary')).toBe(false) // 大写开头不允许
    expect(isTokenRef('$colors')).toBe(false) // 必须两级
    expect(isTokenRef(123)).toBe(false)
    expect(isTokenRef(null)).toBe(false)
  })

  it('parseTokenRef 拆分路径', () => {
    expect(parseTokenRef('$colors.primary')).toEqual(['colors', 'primary'])
    expect(parseTokenRef('bad')).toBeNull()
  })

  it('tokenRefToCssVar 转 CSS 变量', () => {
    expect(tokenRefToCssVar('$colors.primary')).toBe('var(--pf-colors-primary)')
    expect(tokenRefToCssVar('$spacing.4')).toBe('var(--pf-spacing-4)')
  })

  it('resolveToken 在默认 tokens 中能查到', () => {
    expect(resolveToken(DEFAULT_TOKENS as any, '$colors.primary')).toBe('#E0321C')
    expect(resolveToken(DEFAULT_TOKENS as any, '$missing.key')).toBeNull()
  })
})

describe('P0 createPageRoot', () => {
  it('返回合法 PageRoot 节点', () => {
    const root = createPageRoot()
    expect(root.type).toBe('PageRoot')
    expect(root.children).toEqual([])
    expect(root.id).toMatch(/^root_/)
    expect(root.style.display).toBe('flex')
  })
})

describe('P0 createPage', () => {
  it('默认页面 route 以 / 开头', () => {
    const page = createPage()
    expect(page.route).toBe('/')
    expect(page.root.type).toBe('PageRoot')
  })

  it('可覆盖 name/route/root', () => {
    const customRoot = createPageRoot()
    const page = createPage({ name: 'Landing', route: '/landing', root: customRoot })
    expect(page.name).toBe('Landing')
    expect(page.route).toBe('/landing')
    expect(page.root).toBe(customRoot)
  })
})

describe('P0 createProject', () => {
  it('默认 Project 通过校验', () => {
    const p = createProject()
    const r = validateProject(p)
    expect(r.valid).toBe(true)
    expect(r.issues).toEqual([])
  })

  it('默认 Project 包含一个 Home 页面', () => {
    const p = createProject()
    expect(p.pages).toHaveLength(1)
    expect(p.pages[0].name).toBe('Home')
    expect(p.pages[0].route).toBe('/')
    expect(p.schemaVersion).toBe(1)
  })

  it('默认 Project 的 settings.defaultPageId 指向 Home', () => {
    const p = createProject()
    expect(p.settings.defaultPageId).toBe(p.pages[0].id)
    expect(p.settings.defaultBreakpoint).toBe('desktop')
  })
})

describe('P0 validateProject 失败路径', () => {
  it('缺少 schemaVersion 报错', () => {
    const p = createProject() as any
    delete p.schemaVersion
    const r = validateProject(p)
    expect(r.valid).toBe(false)
    expect(r.issues.some((i) => i.path.includes('schemaVersion'))).toBe(true)
  })

  it('缺少 pages 报错', () => {
    const p = createProject() as any
    delete p.pages
    const r = validateProject(p)
    expect(r.valid).toBe(false)
  })

  it('page.root.type 不是 PageRoot 时业务校验失败', () => {
    const p = createProject()
    p.pages[0].root.type = 'Button' as any
    const r = validateProject(p)
    expect(r.valid).toBe(false)
    expect(r.issues.some((i) => i.path.includes('root.type'))).toBe(true)
  })

  it('route 非 / 开头报错', () => {
    const p = createProject()
    p.pages[0].route = 'home' as any
    const r = validateProject(p)
    expect(r.valid).toBe(false)
  })

  it('重复 route 业务校验失败', () => {
    const p = createProject()
    p.pages.push({ ...p.pages[0], id: 'pg_2', route: '/' })
    const r = validateProject(p)
    expect(r.valid).toBe(false)
    expect(r.issues.some((i) => i.keyword === 'uniqueRoute')).toBe(true)
  })

  it('非法 style key 报错', () => {
    const p = createProject()
    ;(p.pages[0].root.style as any).evil = 'red'
    const r = validateProject(p)
    expect(r.valid).toBe(false)
    expect(r.issues.some((i) => i.keyword === 'additionalProperties')).toBe(true)
  })
})

describe('P0 validateNode', () => {
  it('createPageRoot() 通过 node 校验', () => {
    const r = validateNode(createPageRoot())
    expect(r.valid).toBe(true)
  })

  it('缺 id 报错', () => {
    const r = validateNode({ type: 'Text', props: {}, style: {} })
    expect(r.valid).toBe(false)
  })

  it('非法 type 报错', () => {
    const r = validateNode({ id: 'n1', type: 'Banana', props: {}, style: {} })
    expect(r.valid).toBe(false)
  })
})

describe('P0 validateAsset', () => {
  it('合法 asset 通过', () => {
    const r = validateAsset({
      id: 'a1',
      type: 'image',
      name: 'hero.png',
      path: 'assets/hero.png',
      mime: 'image/png',
      size: 1024,
      createdAt: new Date().toISOString()
    })
    expect(r.valid).toBe(true)
  })

  it('path 不在 assets/ 下报错', () => {
    const r = validateAsset({
      id: 'a1',
      type: 'image',
      name: 'hero.png',
      path: 'evil/hero.png',
      mime: 'image/png',
      size: 1024,
      createdAt: new Date().toISOString()
    })
    expect(r.valid).toBe(false)
  })
})

describe('P0 validatePage', () => {
  it('createPage() 通过 page 校验', () => {
    const r = validatePage(createPage())
    expect(r.valid).toBe(true)
  })
})
