import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { join, dirname, resolve } from 'node:path'
import {
  mkdir,
  writeFile,
  readFile,
  copyFile,
  access,
  rename,
  stat
} from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { validateProject, type Project, type Asset } from '@pageforge/schema'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Project Service（主进程）
 * 负责 .pageforge 工程目录的创建、保存、打开，以及图片资源导入。
 *
 * 工程结构（docs/steps/09 §1）：
 *   my-project.pageforge/
 *   ├── project.json
 *   ├── assets/
 *   ├── snapshots/
 *   └── meta.json
 */

const PROJECT_FILE = 'project.json'
const META_FILE = 'meta.json'
const ASSETS_DIR = 'assets'
const SNAPSHOTS_DIR = 'snapshots'

/** 最近打开项目记录（写入 userData） */
async function getRecentPath(): Promise<string> {
  return join(app.getPath('userData'), 'recent-projects.json')
}

export async function listRecentProjects(): Promise<string[]> {
  try {
    const p = await getRecentPath()
    const raw = await readFile(p, 'utf-8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function pushRecentProject(dir: string): Promise<void> {
  const list = await listRecentProjects()
  const next = [dir, ...list.filter((d) => d !== dir)].slice(0, 10)
  await writeFile(await getRecentPath(), JSON.stringify(next, null, 2), 'utf-8')
}

/** 选择一个目录作为新项目位置 */
export async function createProjectDialog(
  parentWindow: BrowserWindow | null
): Promise<{ projectDir: string; project: Project } | null> {
  const result = await dialog.showOpenDialog(parentWindow ?? undefined as any, {
    title: '选择新项目保存位置',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const baseDir = result.filePaths[0]
  const projectDir = join(baseDir, 'untitled.pageforge')
  await ensureProjectDirs(projectDir)
  const project = createEmptyProject()
  await saveProjectInternal(projectDir, project)
  await pushRecentProject(projectDir)
  return { projectDir, project }
}

/** 打开已存在的 .pageforge 目录 */
export async function openProjectDialog(
  parentWindow: BrowserWindow | null
): Promise<{ projectDir: string; project: Project } | null> {
  const result = await dialog.showOpenDialog(parentWindow ?? undefined as any, {
    title: '打开 PageForge 项目',
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const projectDir = result.filePaths[0]
  try {
    const project = await loadProjectInternal(projectDir)
    await pushRecentProject(projectDir)
    return { projectDir, project }
  } catch (e) {
    throw new Error(`打开项目失败: ${(e as Error).message}`)
  }
}

/** 保存项目（原子写） */
export async function saveProject(projectDir: string, project: Project): Promise<void> {
  await saveProjectInternal(projectDir, project)
}

async function saveProjectInternal(projectDir: string, project: Project): Promise<void> {
  await ensureProjectDirs(projectDir)
  const json = JSON.stringify(project, null, 2)
  const tmpPath = join(projectDir, `${PROJECT_FILE}.tmp`)
  const finalPath = join(projectDir, PROJECT_FILE)
  // 1. 写入临时文件
  await writeFile(tmpPath, json, 'utf-8')
  // 2. 校验写入结果（能被解析且通过 schema 校验）
  const verify = JSON.parse(await readFile(tmpPath, 'utf-8'))
  const result = validateProject(verify)
  if (!result.valid) {
    throw new Error(`project.json 校验失败: ${result.issues.map((i) => i.message).join('; ')}`)
  }
  // 3. 原子替换
  await rename(tmpPath, finalPath)
  // 4. 写 meta.json
  const meta = {
    lastOpenedAt: new Date().toISOString(),
    schemaVersion: project.schemaVersion
  }
  await writeFile(join(projectDir, META_FILE), JSON.stringify(meta, null, 2), 'utf-8')
}

async function loadProjectInternal(projectDir: string): Promise<Project> {
  const finalPath = join(projectDir, PROJECT_FILE)
  const raw = await readFile(finalPath, 'utf-8')
  const data = JSON.parse(raw)
  const result = validateProject(data)
  if (!result.valid) {
    throw new Error(`project.json 校验失败: ${result.issues.map((i) => i.path + ': ' + i.message).join('; ')}`)
  }
  return result.data as Project
}

async function ensureProjectDirs(projectDir: string): Promise<void> {
  await mkdir(join(projectDir, ASSETS_DIR), { recursive: true })
  await mkdir(join(projectDir, SNAPSHOTS_DIR), { recursive: true })
}

function createEmptyProject(): Project {
  // 复用 schema 包的 factory
  // 这里通过动态 import 避免循环依赖（schema 包是 ESM）
  // 实际工程中可以直接 import
  const now = new Date().toISOString()
  return {
    id: `p_${Date.now().toString(36)}`,
    name: 'Untitled Project',
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    tokens: {
      colors: {
        primary: '#E0321C',
        text: '#1A1A1A',
        muted: '#6B7280',
        background: '#FFFFFF',
        surface: '#F5F6F8',
        border: '#E5E7EB'
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px'
      },
      fontFamily: {
        sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px'
      },
      radius: { sm: '4px', md: '8px', lg: '12px', pill: '9999px' },
      shadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 8px 24px rgba(0,0,0,0.12)'
      },
      motion: { fast: '120ms ease', base: '200ms ease', slow: '320ms ease' }
    },
    pages: [
      {
        id: 'pg_home',
        name: 'Home',
        route: '/',
        root: {
          id: `root_${Date.now().toString(36)}`,
          type: 'PageRoot',
          name: 'Page',
          props: {},
          style: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '$colors.background',
            color: '$colors.text',
            fontFamily: '$fontFamily.sans'
          },
          children: []
        }
      }
    ],
    assets: [],
    settings: {
      defaultPageId: 'pg_home',
      defaultBreakpoint: 'desktop',
      previewBasePath: ''
    }
  }
}

/**
 * 导入图片到项目 assets/。
 * 返回新建 Asset 记录。
 */
export async function importImage(
  projectDir: string,
  sourceFilePath: string,
  originalName: string
): Promise<Asset> {
  await ensureProjectDirs(projectDir)
  const buffer = await readFile(sourceFilePath)
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
  const storedName = `${hash}${ext}`
  const destPath = join(projectDir, ASSETS_DIR, storedName)
  await copyFile(sourceFilePath, destPath)
  const stats = await stat(destPath)
  const asset: Asset = {
    id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'image',
    name: originalName,
    path: `${ASSETS_DIR}/${storedName}`,
    mime: guessMime(ext),
    size: stats.size,
    hash,
    source: 'upload',
    createdAt: new Date().toISOString()
  }
  return asset
}

function guessMime(ext: string): string {
  const e = ext.toLowerCase()
  if (e === '.png') return 'image/png'
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
  if (e === '.gif') return 'image/gif'
  if (e === '.webp') return 'image/webp'
  if (e === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

/** 读取资源文件 buffer（供 Image 节点渲染） */
export async function readAsset(projectDir: string, assetPath: string): Promise<Buffer> {
  // 防止路径穿越
  const resolved = resolve(projectDir, assetPath)
  if (!resolved.startsWith(resolve(projectDir))) {
    throw new Error('invalid asset path')
  }
  return readFile(resolved)
}

/**
 * 注册所有 project/asset 相关 IPC handler
 */
export function registerProjectIpcHandlers(): void {
  ipcMain.handle('project:create', async (_e, parentWindowId?: number) => {
    const win = parentWindowId ? BrowserWindow.fromId(parentWindowId) : null
    return createProjectDialog(win)
  })

  ipcMain.handle('project:open', async (_e, parentWindowId?: number) => {
    const win = parentWindowId ? BrowserWindow.fromId(parentWindowId) : null
    return openProjectDialog(win)
  })

  ipcMain.handle('project:save', async (_e, projectDir: string, project: Project) => {
    await saveProject(projectDir, project)
    return { ok: true }
  })

  ipcMain.handle('project:listRecent', async () => {
    return listRecentProjects()
  })

  ipcMain.handle('asset:importImage', async (_e, projectDir: string, sourceFilePath: string, originalName: string) => {
    return importImage(projectDir, sourceFilePath, originalName)
  })

  ipcMain.handle('asset:read', async (_e, projectDir: string, assetPath: string) => {
    const buf = await readAsset(projectDir, assetPath)
    return buf.toString('base64')
  })

  ipcMain.handle('asset:chooseAndImport', async (_e, projectDir: string, parentWindowId?: number) => {
    const win = parentWindowId ? BrowserWindow.fromId(parentWindowId) : null
    const result = await dialog.showOpenDialog(win ?? undefined as any, {
      title: '选择图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const fp = result.filePaths[0]
    const name = fp.split(/[/\\]/).pop() ?? 'image'
    return importImage(projectDir, fp, name)
  })

  // 导出 HTML 到磁盘
  ipcMain.handle('export:saveHtml', async (_e, content: string, suggestedName?: string, parentWindowId?: number) => {
    const win = parentWindowId ? BrowserWindow.fromId(parentWindowId) : null
    const result = await dialog.showSaveDialog(win ?? undefined as any, {
      title: '导出 HTML',
      defaultPath: suggestedName ?? 'page.html',
      filters: [{ name: 'HTML', extensions: ['html'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false, path: null }
    await writeFile(result.filePath, content, 'utf-8')
    return { ok: true, path: result.filePath }
  })
}
