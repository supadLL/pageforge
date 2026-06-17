import { app, BrowserWindow, ipcMain } from 'electron'
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { exportSingleHtml, exportSplitHtml, DEFAULT_EXPORT_OPTIONS } from '../../src/exporters/htmlExporter'
import type { Project } from '@pageforge/schema'

/**
 * Preview Service（docs/steps/11）
 *
 * 主进程启动本地 HTTP 服务，提供当前页面预览。
 * 渲染进程通过 preload 请求 start/refresh/stop/openWindow。
 */

const DEFAULT_PORT = 4173
const MAX_PORT_ATTEMPTS = 20

let server: Server | null = null
let currentUrl: string | null = null
let currentProject: Project | null = null
let currentPageId: string | null = null
let previewWindow: BrowserWindow | null = null
let previewDir: string | null = null

function findAvailablePort(start: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number, attemptsLeft: number) => {
      const s = createServer()
      s.once('error', () => {
        if (attemptsLeft <= 0) reject(new Error(`no available port from ${start}`))
        else tryPort(port + 1, attemptsLeft - 1)
      })
      s.once('listening', () => {
        s.close(() => resolve(port))
      })
      s.listen(port, '127.0.0.1')
    }
    tryPort(start, MAX_PORT_ATTEMPTS)
  })
}

async function writePreviewFiles(project: Project, pageId: string): Promise<void> {
  if (!previewDir) {
    previewDir = mkdtempSync(join(tmpdir(), 'pf-preview-'))
  }
  // 单文件模式：写 index.html
  const html = exportSingleHtml(project, pageId)
  writeFileSync(join(previewDir, 'index.html'), html, 'utf-8')

  // 分离文件也写一份，便于 /styles.css 等直接访问
  const split = exportSplitHtml(project, pageId)
  for (const f of split) {
    writeFileSync(join(previewDir, f.path), f.content, 'utf-8')
  }
}

export async function startPreview(
  project: Project,
  pageId: string
): Promise<{ url: string; port: number }> {
  // 如果已在运行，先停止
  await stopPreview()

  currentProject = project
  currentPageId = pageId
  await writePreviewFiles(project, pageId)

  const port = await findAvailablePort(DEFAULT_PORT)
  const srv = createServer((req, res) => {
    handlePreviewRequest(req.url ?? '/', res)
  })

  return new Promise((resolve, reject) => {
    srv.once('error', reject)
    srv.listen(port, '127.0.0.1', () => {
      server = srv
      currentUrl = `http://127.0.0.1:${port}/`
      resolve({ url: currentUrl, port })
    })
  })
}

export async function refreshPreview(
  project: Project,
  pageId: string
): Promise<{ url: string }> {
  if (!server || !currentUrl) {
    return startPreview(project, pageId)
  }
  currentProject = project
  currentPageId = pageId
  await writePreviewFiles(project, pageId)
  // 如果有预览窗口，刷新它
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.webContents.reload()
  }
  return { url: currentUrl }
}

export async function stopPreview(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = null
  }
  currentUrl = null
  currentProject = null
  currentPageId = null
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.destroy()
    previewWindow = null
  }
  if (previewDir) {
    rmSync(previewDir, { recursive: true, force: true })
    previewDir = null
  }
}

export function openPreviewWindow(): { url: string } | null {
  if (!currentUrl) return null
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.focus()
    return { url: currentUrl }
  }
  previewWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'PageForge Preview',
    autoHideMenuBar: true,
    webPreferences: {
      // 预览窗口不复用编辑器 preload，最小权限
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  previewWindow.loadURL(currentUrl)
  previewWindow.on('closed', () => {
    previewWindow = null
  })
  return { url: currentUrl }
}

function handlePreviewRequest(urlPath: string, res: any): void {
  if (!previewDir) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('preview not ready')
    return
  }
  const safe = urlPath === '/' ? '/index.html' : urlPath
  const fileName = safe.split('/').pop() ?? 'index.html'
  try {
    const filePath = join(previewDir, fileName)
    // 防止路径穿越
    if (!filePath.startsWith(previewDir)) {
      res.writeHead(403)
      res.end('forbidden')
      return
    }
    const { readFileSync } = require('node:fs')
    const content = readFileSync(filePath)
    const mime = guessMime(fileName)
    res.writeHead(200, { 'Content-Type': mime })
    res.end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
  }
}

function guessMime(name: string): string {
  if (name.endsWith('.html')) return 'text/html; charset=utf-8'
  if (name.endsWith('.css')) return 'text/css; charset=utf-8'
  if (name.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

export function registerPreviewIpcHandlers(): void {
  ipcMain.handle('preview:start', async (_e, project: Project, pageId: string) => {
    return startPreview(project, pageId)
  })
  ipcMain.handle('preview:refresh', async (_e, project: Project, pageId: string) => {
    return refreshPreview(project, pageId)
  })
  ipcMain.handle('preview:stop', async () => {
    await stopPreview()
    return { ok: true }
  })
  ipcMain.handle('preview:openWindow', async () => {
    return openPreviewWindow()
  })
  ipcMain.handle('preview:getUrl', async () => {
    return currentUrl ? { url: currentUrl } : null
  })
}
