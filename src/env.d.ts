/**
 * PageForge 渲染进程全局类型
 *
 * window.pageforge 由 electron/preload/index.ts 通过 contextBridge 注入。
 * 这里只声明其形状，避免渲染进程 import 主进程代码。
 */
import type { Project, Asset, Node, AiPatch } from '@pageforge/schema'
import type {
  AIProviderConfig,
  AIProviderName,
  AIChatRequest,
  AIChatResponse,
  AICapability
} from '@pageforge/schema'

export interface PageForgeApi {
  app: {
    ping: () => Promise<{ message: string; version: string; ts: number }>
  }
  project: {
    create: (parentWindowId?: number) => Promise<{ projectDir: string; project: Project } | null>
    open: (parentWindowId?: number) => Promise<{ projectDir: string; project: Project } | null>
    save: (projectDir: string, project: Project) => Promise<{ ok: boolean }>
    listRecent: () => Promise<string[]>
  }
  asset: {
    importImage: (
      projectDir: string,
      sourceFilePath: string,
      originalName: string
    ) => Promise<Asset>
    chooseAndImport: (projectDir: string, parentWindowId?: number) => Promise<Asset | null>
    read: (projectDir: string, assetPath: string) => Promise<string>
  }
  export: {
    saveHtml: (
      content: string,
      suggestedName?: string,
      parentWindowId?: number
    ) => Promise<{ ok: boolean; path: string | null }>
  }
  preview: {
    start: (project: Project, pageId: string) => Promise<{ url: string; port: number }>
    refresh: (project: Project, pageId: string) => Promise<{ url: string }>
    stop: () => Promise<{ ok: boolean }>
    openWindow: () => Promise<{ url: string } | null>
    getUrl: () => Promise<{ url: string } | null>
  }
  ai: {
    chat: (req: AIChatRequest) => Promise<AIChatResponse>
    getConfig: () => Promise<AIProviderConfig>
    setConfig: (cfg: AIProviderConfig) => Promise<{ ok: boolean }>
    hasApiKey: (provider?: AIProviderName) => Promise<boolean>
    setApiKey: (provider: AIProviderName, key?: string) => Promise<{ ok: boolean; reason?: string }>
    listProviders: () => Promise<AIProviderName[]>
    getCapabilities: (provider: AIProviderName) => Promise<AICapability>
    isEncryptionAvailable: () => Promise<boolean>
    generateFromImage: (
      imagePath: string,
      userHint?: string,
      baseTokens?: unknown
    ) => Promise<{ summary: string; warnings: string[]; root: Node }>
    editByPrompt: (
      root: Node,
      prompt: string,
      scopeNodeId?: string
    ) => Promise<{ summary: string; patches: AiPatch[]; warnings: string[] }>
  }
}

declare global {
  interface Window {
    pageforge: PageForgeApi
  }
}

export {}
