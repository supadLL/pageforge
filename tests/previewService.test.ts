import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { createProject, createNode, type Project } from '@pageforge/schema'
import { applyCommand } from '@/editor/commands/executor'
import { makeAddCommand } from '@/editor/commands/types'
import { exportSingleHtml, exportSplitHtml } from '@/exporters/htmlExporter'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'pf-preview-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

function makeProject(): Project {
  const p = createProject({ name: 'Preview Test' })
  p.pages[0].root = applyCommand(
    p.pages[0].root,
    makeAddCommand(p.pages[0].root.id, createNode('Heading', { id: 'h1', props: { text: 'Preview', level: 1 } }))
  )
  return p
}

describe('P2 预览服务 - exporter 集成', () => {
  it('预览内容来自 exporter（不是画布 DOM）', () => {
    const p = makeProject()
    const html = exportSingleHtml(p, p.pages[0].id)
    // 包含 Heading 文本
    expect(html).toContain('Preview')
    expect(html).toContain('<h1')
  })

  it('预览文件可写入临时目录并被读取', () => {
    const p = makeProject()
    const html = exportSingleHtml(p, p.pages[0].id)
    const filePath = join(tempDir, 'index.html')
    require('node:fs').writeFileSync(filePath, html, 'utf-8')
    expect(existsSync(filePath)).toBe(true)
    const read = readFileSync(filePath, 'utf-8')
    expect(read).toBe(html)
  })

  it('分离模式预览文件齐全', () => {
    const p = makeProject()
    const files = exportSplitHtml(p, p.pages[0].id)
    const paths = files.map((f) => f.path)
    expect(paths).toContain('index.html')
    expect(paths).toContain('styles.css')
    expect(paths).toContain('script.js')
    for (const f of files) {
      require('node:fs').writeFileSync(join(tempDir, f.path), f.content, 'utf-8')
    }
    expect(existsSync(join(tempDir, 'index.html'))).toBe(true)
    expect(existsSync(join(tempDir, 'styles.css'))).toBe(true)
    expect(existsSync(join(tempDir, 'script.js'))).toBe(true)
  })
})

describe('P2 预览服务 - 端口 fallback', () => {
  it('端口被占用时能找到下一个可用端口', async () => {
    // 占用 4173
    const blocker = createServer()
    await new Promise<void>((resolve) => blocker.listen(4173, '127.0.0.1', () => resolve()))

    // 实现一个简化版 findAvailablePort 测试
    const tryPort = (port: number, attempts: number): Promise<number> =>
      new Promise((resolve, reject) => {
        const s = createServer()
        s.once('error', () => {
          if (attempts <= 0) reject(new Error('no port'))
          else tryPort(port + 1, attempts - 1).then(resolve, reject)
        })
        s.once('listening', () => {
          s.close(() => resolve(port))
        })
        s.listen(port, '127.0.0.1')
      })

    const port = await tryPort(4173, 20)
    expect(port).toBeGreaterThan(4173)

    await new Promise<void>((resolve) => blocker.close(() => resolve()))
  }, 10000)
})

describe('P2 预览服务 - store API（mock）', () => {
  it('startPreview 在无 pageforge API 时返回 null', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    delete (globalThis as any).window
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const r = await s.startPreview()
    expect(r).toBeNull()
  })

  it('startPreview 调用 pageforge.preview.start', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    let called = false
    ;(globalThis as any).window = {
      pageforge: {
        preview: {
          start: async () => {
            called = true
            return { url: 'http://127.0.0.1:4173/', port: 4173 }
          },
          getUrl: async () => null
        }
      }
    }
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    const r = await s.startPreview()
    expect(called).toBe(true)
    expect(r).toEqual({ url: 'http://127.0.0.1:4173/', port: 4173 })
  })

  it('openPreviewWindow 在未启动时先 start', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const calls: string[] = []
    ;(globalThis as any).window = {
      pageforge: {
        preview: {
          start: async () => {
            calls.push('start')
            return { url: 'http://127.0.0.1:4173/', port: 4173 }
          },
          getUrl: async () => null,
          openWindow: async () => {
            calls.push('openWindow')
            return { url: 'http://127.0.0.1:4173/' }
          }
        }
      }
    }
    const { useProjectStore } = await import('@/stores/project')
    const s = useProjectStore()
    await s.openPreviewWindow()
    expect(calls).toEqual(['start', 'openWindow'])
  })
})

describe('P2 预览服务 - 生命周期', () => {
  it('start -> stop 流程（mock IPC）', async () => {
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    let stopped = false
    ;(globalThis as any).window = {
      pageforge: {
        preview: {
          start: async () => ({ url: 'http://127.0.0.1:4173/', port: 4173 }),
          stop: async () => {
            stopped = true
            return { ok: true }
          },
          getUrl: async () => null
        }
      }
    }
    const api = (globalThis as any).window.pageforge
    const r = await api.preview.start()
    expect(r.url).toBe('http://127.0.0.1:4173/')
    await api.preview.stop()
    expect(stopped).toBe(true)
  })
})
