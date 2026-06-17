import { contextBridge, ipcRenderer } from 'electron'
import type { Project, Asset, Node, AiPatch } from '@pageforge/schema'
import type {
  AIProviderConfig,
  AIProviderName,
  AIChatRequest,
  AIChatResponse,
  AICapability
} from '@pageforge/schema'

/**
 * PageForge preload 脚本
 *
 * 唯一职责：把白名单 API 暴露到 window.pageforge。
 * 渲染进程不能直接访问 Node API（nodeIntegration: false）。
 */

const api = {
  app: {
    ping: (): Promise<{ message: string; version: string; ts: number }> =>
      ipcRenderer.invoke('app:ping')
  },
  project: {
    create: (
      parentWindowId?: number
    ): Promise<{ projectDir: string; project: Project } | null> =>
      ipcRenderer.invoke('project:create', parentWindowId),
    open: (
      parentWindowId?: number
    ): Promise<{ projectDir: string; project: Project } | null> =>
      ipcRenderer.invoke('project:open', parentWindowId),
    save: (projectDir: string, project: Project): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('project:save', projectDir, project),
    listRecent: (): Promise<string[]> => ipcRenderer.invoke('project:listRecent')
  },
  asset: {
    importImage: (
      projectDir: string,
      sourceFilePath: string,
      originalName: string
    ): Promise<Asset> => ipcRenderer.invoke('asset:importImage', projectDir, sourceFilePath, originalName),
    chooseAndImport: (
      projectDir: string,
      parentWindowId?: number
    ): Promise<Asset | null> => ipcRenderer.invoke('asset:chooseAndImport', projectDir, parentWindowId),
    read: (projectDir: string, assetPath: string): Promise<string> =>
      ipcRenderer.invoke('asset:read', projectDir, assetPath)
  },
  export: {
    saveHtml: (
      content: string,
      suggestedName?: string,
      parentWindowId?: number
    ): Promise<{ ok: boolean; path: string | null }> =>
      ipcRenderer.invoke('export:saveHtml', content, suggestedName, parentWindowId)
  },
  preview: {
    start: (project: Project, pageId: string): Promise<{ url: string; port: number }> =>
      ipcRenderer.invoke('preview:start', project, pageId),
    refresh: (project: Project, pageId: string): Promise<{ url: string }> =>
      ipcRenderer.invoke('preview:refresh', project, pageId),
    stop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('preview:stop'),
    openWindow: (): Promise<{ url: string } | null> => ipcRenderer.invoke('preview:openWindow'),
    getUrl: (): Promise<{ url: string } | null> => ipcRenderer.invoke('preview:getUrl')
  },
  ai: {
    chat: (req: AIChatRequest): Promise<AIChatResponse> => ipcRenderer.invoke('ai:chat', req),
    getConfig: (): Promise<AIProviderConfig> => ipcRenderer.invoke('ai:getConfig'),
    setConfig: (cfg: AIProviderConfig): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('ai:setConfig', cfg),
    hasApiKey: (provider?: AIProviderName): Promise<boolean> =>
      ipcRenderer.invoke('ai:hasApiKey', provider),
    setApiKey: (provider: AIProviderName, key?: string): Promise<{ ok: boolean; reason?: string }> =>
      ipcRenderer.invoke('ai:setApiKey', provider, key),
    listProviders: (): Promise<AIProviderName[]> => ipcRenderer.invoke('ai:listProviders'),
    getCapabilities: (provider: AIProviderName): Promise<AICapability> =>
      ipcRenderer.invoke('ai:getCapabilities', provider),
    isEncryptionAvailable: (): Promise<boolean> => ipcRenderer.invoke('ai:isEncryptionAvailable'),
    generateFromImage: (
      imagePath: string,
      userHint?: string,
      baseTokens?: unknown
    ): Promise<{ summary: string; warnings: string[]; root: Node }> =>
      ipcRenderer.invoke('ai:generateFromImage', imagePath, userHint, baseTokens),
    editByPrompt: (
      root: Node,
      prompt: string,
      scopeNodeId?: string
    ): Promise<{ summary: string; patches: AiPatch[]; warnings: string[] }> =>
      ipcRenderer.invoke('ai:editByPrompt', root, prompt, scopeNodeId)
  }
} as const

export type PageForgeApi = typeof api

try {
  contextBridge.exposeInMainWorld('pageforge', api)
} catch (error) {
  // contextBridge 在极端场景下会抛错，这里只记录不阻断
  // eslint-disable-next-line no-console
  console.error('[pageforge preload] failed to expose api:', error)
}
