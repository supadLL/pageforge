import { app, ipcMain, dialog, BrowserWindow, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import {
  type AIProvider,
  type AIProviderConfig,
  type AIProviderName,
  type AIChatRequest,
  type AIChatResponse,
  type AICapability,
  PROVIDER_DEFAULTS,
  PROVIDER_CAPABILITIES,
  validateAIProviderConfig
} from '@pageforge/schema'
import { GLMProvider } from './ai/glmProvider.js'
import { generateFromImage as doGenerateFromImage } from './ai/generateFromImage.js'
import { editByPrompt as doEditByPrompt } from './ai/editByPrompt.js'

/**
 * AI Service（主进程）
 * - 配置：userData/ai-config.json（明文，非敏感）
 * - Key：userData/ai-keys.json（safeStorage 加密）
 * - 渲染进程只能 hasApiKey / setApiKey，永远拿不到明文 Key
 */

const CONFIG_FILE = 'ai-config.json'
const KEYS_FILE = 'ai-keys.json'

function configPath(): string {
  return join(app.getPath('userData'), CONFIG_FILE)
}
function keysPath(): string {
  return join(app.getPath('userData'), KEYS_FILE)
}

async function ensureUserDataDir(): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
}

// === 配置 ===

export async function getAIConfig(): Promise<AIProviderConfig> {
  try {
    const raw = await readFile(configPath(), 'utf-8')
    const data = JSON.parse(raw)
    if (validateAIProviderConfig(data)) return data
  } catch {
    /* fallthrough to default */
  }
  return PROVIDER_DEFAULTS.glm
}

export async function setAIConfig(cfg: AIProviderConfig): Promise<void> {
  if (!validateAIProviderConfig(cfg)) throw new Error('invalid AI config')
  await ensureUserDataDir()
  await writeFile(configPath(), JSON.stringify(cfg, null, 2), 'utf-8')
}

// === API Key（加密） ===

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

async function readKeys(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(keysPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export async function hasApiKey(provider?: AIProviderName): Promise<boolean> {
  const cfg = provider ? { name: provider } : await getAIConfig()
  const keys = await readKeys()
  const entry = keys[(cfg as { name: AIProviderName }).name]
  return typeof entry === 'string' && entry.length > 0
}

export async function setApiKey(provider: AIProviderName, key: string): Promise<void> {
  if (!key) throw new Error('empty api key')
  await ensureUserDataDir()
  const keys = await readKeys()
  if (isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key).toString('base64')
    keys[provider] = `enc:${encrypted}`
  } else {
    // 降级：拒绝明文存储
    throw new Error('safeStorage 不可用，拒绝保存 API Key')
  }
  await writeFile(keysPath(), JSON.stringify(keys, null, 2), 'utf-8')
}

async function getDecryptedApiKey(provider: AIProviderName): Promise<string | null> {
  const keys = await readKeys()
  const entry = keys[provider]
  if (typeof entry !== 'string' || entry.length === 0) return null
  if (entry.startsWith('enc:')) {
    if (!isEncryptionAvailable()) return null
    try {
      const buf = Buffer.from(entry.slice(4), 'base64')
      return safeStorage.decryptString(buf)
    } catch {
      return null
    }
  }
  return null
}

// === Provider 实例化 ===

export async function getActiveProvider(): Promise<AIProvider> {
  const cfg = await getAIConfig()
  const key = await getDecryptedApiKey(cfg.name)
  if (!key) throw new Error(`API Key 未设置（provider: ${cfg.name}）`)
  return instantiateProvider(cfg, key)
}

function instantiateProvider(cfg: AIProviderConfig, key: string): AIProvider {
  switch (cfg.name) {
    case 'glm':
      return new GLMProvider(cfg, key)
    case 'openai':
      // 预留：OpenAIProvider
      throw new Error('openai provider 暂未实现')
    case 'claude':
      throw new Error('claude provider 暂未实现')
    default:
      throw new Error(`unknown provider: ${(cfg as { name: string }).name}`)
  }
}

export async function chat(req: AIChatRequest): Promise<AIChatResponse> {
  const provider = await getActiveProvider()
  return provider.chat(req)
}

export function getCapabilities(provider: AIProviderName): AICapability {
  return PROVIDER_CAPABILITIES[provider]
}

export function listProviders(): AIProviderName[] {
  return Object.keys(PROVIDER_DEFAULTS) as AIProviderName[]
}

// === IPC ===

export function registerAIHandlers(): void {
  ipcMain.handle('ai:chat', async (_e, req: AIChatRequest) => {
    // 基础参数校验，防超大 payload
    if (!req || !Array.isArray(req.messages) || req.messages.length === 0) {
      throw new Error('ai:chat requires non-empty messages array')
    }
    if (req.messages.length > 50) {
      throw new Error('ai:chat messages too long (max 50)')
    }
    return chat(req)
  })

  ipcMain.handle('ai:getConfig', async () => getAIConfig())
  ipcMain.handle('ai:setConfig', async (_e, cfg: AIProviderConfig) => {
    await setAIConfig(cfg)
    return { ok: true }
  })

  ipcMain.handle('ai:hasApiKey', async (_e, provider?: AIProviderName) =>
    hasApiKey(provider)
  )

  ipcMain.handle('ai:setApiKey', async (_e, provider: AIProviderName, _key?: string) => {
    // 通过对话框获取 Key，不通过 IPC 参数传递明文
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showMessageBox(win ?? undefined as any, {
      type: 'question',
      title: '设置 API Key',
      message: `为 ${provider} 设置 API Key`,
      detail: 'Key 将用 safeStorage 加密保存，不会明文存储或传给渲染进程。',
      buttons: ['取消', '输入 Key'],
      defaultId: 1
    })
    if (result.response === 0) return { ok: false }
    // 真实场景应弹输入框；MVP 用 prompt 风格的二次对话框
    // 这里返回 true 表示触发了设置流程，实际 Key 由后续 secure input 组件处理
    // 为保持可测试性，支持通过第二个参数直接传 Key（仅供测试/CI）
    if (typeof _key === 'string' && _key.length > 0) {
      await setApiKey(provider, _key)
      return { ok: true }
    }
    return { ok: false, reason: '需要 secure input 组件（后续完善）' }
  })

  ipcMain.handle('ai:listProviders', async () => listProviders())
  ipcMain.handle('ai:getCapabilities', async (_e, provider: AIProviderName) =>
    getCapabilities(provider)
  )
  ipcMain.handle('ai:isEncryptionAvailable', async () => isEncryptionAvailable())

  ipcMain.handle(
    'ai:generateFromImage',
    async (_e, imagePath: string, userHint?: string, baseTokens?: any) => {
      const r = await doGenerateFromImage(imagePath, { userHint, baseTokens })
      return {
        summary: r.draft.summary,
        warnings: r.normalized.warnings,
        root: r.normalized.root
      }
    }
  )

  ipcMain.handle(
    'ai:editByPrompt',
    async (_e, root: any, prompt: string, scopeNodeId?: string) => {
      const r = await doEditByPrompt(root, prompt, scopeNodeId)
      return {
        summary: r.patchSet.summary,
        patches: r.normalized.patches,
        warnings: r.normalized.warnings
      }
    }
  )
}
