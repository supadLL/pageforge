import { describe, it, expect } from 'vitest'
import {
  createNode,
  getComponentDefinition,
  listComponentDefinitions,
  isContainer,
  hasDefinition,
  validateNode,
  MVP_COMPONENT_TYPES
} from '@pageforge/schema'

describe('P0 组件注册表', () => {
  it('9 个 MVP 组件全部注册', () => {
    expect(listComponentDefinitions()).toHaveLength(MVP_COMPONENT_TYPES.length)
  })

  it('每个组件类型都能查到定义', () => {
    for (const t of MVP_COMPONENT_TYPES) {
      const def = getComponentDefinition(t)
      expect(def.type).toBe(t)
      expect(def.label).toBeTruthy()
      expect(def.category).toBeTruthy()
    }
  })

  it('hasDefinition 正确判断已知/未知类型', () => {
    expect(hasDefinition('Button')).toBe(true)
    expect(hasDefinition('Banana')).toBe(false)
  })

  it('isContainer 仅 PageRoot/Container/Card 为真', () => {
    expect(isContainer('PageRoot')).toBe(true)
    expect(isContainer('Container')).toBe(true)
    expect(isContainer('Card')).toBe(true)
    expect(isContainer('BackgroundPanel')).toBe(true)
    expect(isContainer('HeroBlock')).toBe(true)
    expect(isContainer('Sidebar')).toBe(true)
    expect(isContainer('Heading')).toBe(false)
    expect(isContainer('Text')).toBe(false)
    expect(isContainer('Button')).toBe(false)
    expect(isContainer('Image')).toBe(false)
    expect(isContainer('Input')).toBe(false)
    expect(isContainer('Divider')).toBe(false)
    expect(isContainer('SearchBox')).toBe(false)
    expect(isContainer('ProgressBar')).toBe(false)
  })

  it('未知组件类型抛错', () => {
    expect(() => getComponentDefinition('Banana' as any)).toThrow(/Unknown component type/)
  })
})

describe('P0 createNode - 容器组件', () => {
  it('PageRoot 创建带空 children', () => {
    const n = createNode('PageRoot')
    expect(n.type).toBe('PageRoot')
    expect(n.children).toEqual([])
  })

  it('Container 创建带空 children', () => {
    const n = createNode('Container')
    expect(n.type).toBe('Container')
    expect(n.children).toEqual([])
  })

  it('Card 创建带空 children', () => {
    const n = createNode('Card')
    expect(n.children).toEqual([])
  })

  it('Container 可携带初始 children', () => {
    const child = createNode('Text')
    const n = createNode('Container', { children: [child] })
    expect(n.children).toEqual([child])
  })
})

describe('P0 createNode - 非容器组件', () => {
  it('Heading 不带 children', () => {
    const n = createNode('Heading')
    expect(n.type).toBe('Heading')
    expect(n.children).toBeUndefined()
  })

  it('Text 不带 children', () => {
    const n = createNode('Text')
    expect(n.children).toBeUndefined()
  })

  it('Button 不带 children', () => {
    const n = createNode('Button')
    expect(n.children).toBeUndefined()
  })

  it('Image 不带 children', () => {
    const n = createNode('Image')
    expect(n.children).toBeUndefined()
  })

  it('Input 不带 children', () => {
    const n = createNode('Input')
    expect(n.children).toBeUndefined()
  })

  it('Divider 不带 children', () => {
    const n = createNode('Divider')
    expect(n.children).toBeUndefined()
  })
})

describe('P0 createNode - 默认值', () => {
  it('Heading 默认 props 包含 text 和 level', () => {
    const n = createNode('Heading')
    expect(n.props.text).toBe('Heading')
    expect(n.props.level).toBe(2)
  })

  it('Text 默认 props.text 存在', () => {
    expect(createNode('Text').props.text).toBe('Text content')
  })

  it('Button 默认 variant=primary', () => {
    expect(createNode('Button').props.variant).toBe('primary')
  })

  it('Button 默认 backgroundColor 来自 token', () => {
    expect(createNode('Button').style.backgroundColor).toBe('$colors.primary')
  })

  it('Image 默认 fit=cover', () => {
    expect(createNode('Image').props.fit).toBe('cover')
  })

  it('Divider 默认 orientation=horizontal', () => {
    expect(createNode('Divider').props.orientation).toBe('horizontal')
  })
})

describe('P0 createNode - overrides 合并', () => {
  it('覆盖 props 不会丢失 default', () => {
    const n = createNode('Button', { props: { text: 'Buy now' } })
    expect(n.props.text).toBe('Buy now')
    expect(n.props.variant).toBe('primary') // 来自 default
  })

  it('覆盖 style 不会丢失 default', () => {
    const n = createNode('Button', { style: { backgroundColor: '#000000' } })
    expect(n.style.backgroundColor).toBe('#000000')
    expect(n.style.color).toBe('#FFFFFF') // 来自 default
  })

  it('覆盖 name', () => {
    const n = createNode('Heading', { name: 'My Title' })
    expect(n.name).toBe('My Title')
  })

  it('覆盖 id', () => {
    const n = createNode('Text', { id: 'my-text-1' })
    expect(n.id).toBe('my-text-1')
  })

  it('events 透传', () => {
    const ev = [{ type: 'click' as const, action: { kind: 'navigate' as const, to: '/x' } }]
    const n = createNode('Button', { events: ev })
    expect(n.events).toEqual(ev)
  })
})

describe('P0 createNode 产物能通过 node 校验', () => {
  for (const t of MVP_COMPONENT_TYPES) {
    it(`${t} 校验通过`, () => {
      const n = createNode(t)
      const r = validateNode(n)
      expect(r.valid).toBe(true)
    })
  }
})

describe('P0 createNode 非法类型', () => {
  it('抛错', () => {
    expect(() => createNode('Banana' as any)).toThrow(/Unknown component type/)
  })
})
