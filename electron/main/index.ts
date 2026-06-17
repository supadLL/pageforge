import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerProjectIpcHandlers } from '../services/projectService'
import { registerPreviewIpcHandlers } from '../services/previewService'
import { registerAIHandlers } from '../services/aiService'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * PageForge 主进程入口
 *
 * 安全约束（参见 docs/01 §12 Electron 安全边界）：
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 * - preload 只暴露白名单 API
 *
 * Step 01 范围：创建主窗口、加载 renderer、注册 ping handler。
 * 后续步骤会逐步替换 / 扩展这里的 IPC。
 */

let mainWindow: BrowserWindow | null = null

function createMainWindow(): void {
  const iconPath = join(__dirname, '../../resources/pageforge-icon.ico')

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'PageForge',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 外链走系统浏览器，不在应用内导航
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  // 健康检查：渲染进程 -> preload -> 主进程 -> 回到渲染进程
  ipcMain.handle('app:ping', (): { message: string; version: string; ts: number } => {
    return {
      message: 'pong',
      version: app.getVersion(),
      ts: Date.now()
    }
  })
  // 项目 / 资源 IPC
  registerProjectIpcHandlers()
  // 预览服务 IPC
  registerPreviewIpcHandlers()
  // AI IPC
  registerAIHandlers()
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.pageforge.app')
  }

  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // 应用退出时清理预览服务（在 quit 之前）
  import('../services/previewService').then(({ stopPreview }) => stopPreview()).catch(() => undefined)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
