import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createProject, validateProject, type Project, type Asset } from '@pageforge/schema'
import { useProjectStore } from '@/stores/project'
import { useHistoryStore } from '@/editor/commands/historyStore'

let tempDir: string

beforeEach(() => {
  setActivePinia(createPinia())
  tempDir = mkdtempSync(join(tmpdir(), 'pf-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('P1 项目序列化', () => {
  it('Project 可被 JSON 序列化/反序列化', () => {
    const p = createProject()
    const json = JSON.stringify(p)
    const restored = JSON.parse(json) as Project
    const r = validateProject(restored)
    expect(r.valid).toBe(true)
    expect(r.data?.id).toBe(p.id)
  })

  it('修改后的 Project 仍通过校验', () => {
    const s = useProjectStore()
    s.addNode('Container')
    s.addNode('Heading')
    s.updateNodeProps(s.getCurrentRoot().children![0].id, { gap: '20px' } as any)
    const r = validateProject(s.project)
    expect(r.valid).toBe(true)
  })
})

describe('P1 Project Store - loadProject / markSaved', () => {
  it('loadProject 替换当前 project 并清空历史', () => {
    const s = useProjectStore()
    const h = useHistoryStore()
    s.addNode('Text') // 制造历史
    expect(h.undoCount).toBe(1)
    const newP = createProject({ name: 'Loaded' })
    s.loadProject(newP, '/some/dir.pageforge')
    expect(s.project.name).toBe('Loaded')
    expect(s.projectDir).toBe('/some/dir.pageforge')
    expect(h.undoCount).toBe(0)
  })

  it('loadProject 切换到第一个 page', () => {
    const s = useProjectStore()
    const newP = createProject()
    s.loadProject(newP, null)
    expect(s.currentPage.id).toBe(newP.pages[0].id)
  })
})

describe('P1 Project Store - save/open（mock window.pageforge）', () => {
  it('saveCurrentProject 在无 pageforge API 时返回 false', async () => {
    const s = useProjectStore()
    delete (globalThis as any).window
    const r = await s.saveCurrentProject()
    expect(r).toBe(false)
  })

  it('saveCurrentProject 调用 pageforge.project.save', async () => {
    const s = useProjectStore()
    let saved: { dir: string; project: Project } | null = null
    ;(globalThis as any).window = {
      pageforge: {
        project: {
          save: async (dir: string, project: Project) => {
            saved = { dir, project }
            return { ok: true }
          },
          create: async () => ({ projectDir: '/x.pageforge', project: createProject() })
        }
      }
    }
    s.projectDir = '/mock.pageforge'
    const r = await s.saveCurrentProject()
    expect(r).toBe(true)
    expect(saved).not.toBeNull()
    expect(saved!.dir).toBe('/mock.pageforge')
    // markSaved 后 dirty 应为 false
    expect(useHistoryStore().dirty).toBe(false)
  })

  it('saveCurrentProject 在无 projectDir 时走 newProject', async () => {
    const s = useProjectStore()
    let created = false
    ;(globalThis as any).window = {
      pageforge: {
        project: {
          create: async () => {
            created = true
            return { projectDir: '/new.pageforge', project: createProject({ name: 'NewOne' }) }
          },
          save: async () => ({ ok: true })
        }
      }
    }
    s.projectDir = null
    const r = await s.saveCurrentProject()
    expect(r).toBe(true)
    expect(created).toBe(true)
    expect(s.projectDir).toBe('/new.pageforge')
  })

  it('openProjectViaDialog 加载返回的 project', async () => {
    const s = useProjectStore()
    const target = createProject({ name: 'Opened' })
    ;(globalThis as any).window = {
      pageforge: {
        project: {
          open: async () => ({ projectDir: '/opened.pageforge', project: target })
        }
      }
    }
    const r = await s.openProjectViaDialog()
    expect(r).toBe(true)
    expect(s.project.name).toBe('Opened')
    expect(s.projectDir).toBe('/opened.pageforge')
  })

  it('openProjectViaDialog 用户取消返回 false', async () => {
    const s = useProjectStore()
    ;(globalThis as any).window = {
      pageforge: {
        project: { open: async () => null }
      }
    }
    const r = await s.openProjectViaDialog()
    expect(r).toBe(false)
  })
})

describe('P1 Asset 记录构造', () => {
  it('Asset 字段完整', () => {
    const a: Asset = {
      id: 'a1',
      type: 'image',
      name: 'hero.png',
      path: 'assets/hero.png',
      mime: 'image/png',
      size: 1024,
      hash: 'abc123',
      source: 'upload',
      createdAt: new Date().toISOString()
    }
    expect(a.path.startsWith('assets/')).toBe(true)
    expect(a.type).toBe('image')
  })
})

describe('P1 文件 IO 模拟（写读 project.json）', () => {
  it('写入后能读回相同内容并通过校验', () => {
    const p = createProject({ name: 'IO Test' })
    const dir = join(tempDir, 'proj.pageforge')
    mkdirSync(join(dir, 'assets'), { recursive: true })
    mkdirSync(join(dir, 'snapshots'), { recursive: true })
    writeFileSync(join(dir, 'project.json'), JSON.stringify(p, null, 2), 'utf-8')
    const raw = readFileSync(join(dir, 'project.json'), 'utf-8')
    const restored = JSON.parse(raw)
    const r = validateProject(restored)
    expect(r.valid).toBe(true)
    expect(r.data?.name).toBe('IO Test')
  })

  it('非法 project.json 通过校验失败', () => {
    const dir = join(tempDir, 'bad.pageforge')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'project.json'), JSON.stringify({ foo: 'bar' }), 'utf-8')
    const raw = readFileSync(join(dir, 'project.json'), 'utf-8')
    const r = validateProject(JSON.parse(raw))
    expect(r.valid).toBe(false)
  })
})
