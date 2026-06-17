/**
 * AI Provider 抽象协议（docs/steps/12）
 * 主/渲染进程共同引用，渲染进程只拿类型，不拿 Key。
 */
import type { JsonSchema } from '../validation/jsonSchema.js'

export type AIProviderName = 'glm' | 'openai' | 'claude'

export interface AIProviderConfig {
  name: AIProviderName
  baseUrl: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface AICapability {
  vision: boolean
  chat: boolean
}

export type AIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | AIContentPart[]
}

export interface AIChatRequest {
  messages: AIMessage[]
  /** 强制返回 JSON 时给出 schema 提示 */
  jsonSchemaHint?: string
  temperature?: number
  maxTokens?: number
}

export interface AIChatResponse {
  content: string
  usage?: { promptTokens: number; completionTokens: number }
  raw?: unknown
}

export interface AIProvider {
  name: AIProviderName
  capabilities: AICapability
  chat(req: AIChatRequest): Promise<AIChatResponse>
}

export const PROVIDER_DEFAULTS: Record<AIProviderName, AIProviderConfig> = {
  glm: {
    name: 'glm',
    baseUrl: 'https://open.bigmodel.cn',
    model: 'glm-4v',
    temperature: 0.2,
    maxTokens: 4096
  },
  openai: {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4096
  },
  claude: {
    name: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 4096
  }
}

export const PROVIDER_CAPABILITIES: Record<AIProviderName, AICapability> = {
  glm: { vision: true, chat: true },
  openai: { vision: true, chat: true },
  claude: { vision: true, chat: true }
}

/** 校验 AI 配置 */
export function validateAIProviderConfig(input: unknown): input is AIProviderConfig {
  if (!input || typeof input !== 'object') return false
  const c = input as Record<string, unknown>
  if (c.name !== 'glm' && c.name !== 'openai' && c.name !== 'claude') return false
  if (typeof c.baseUrl !== 'string' || c.baseUrl.length === 0) return false
  if (typeof c.model !== 'string' || c.model.length === 0) return false
  return true
}

/** 把消息序列化为 token 友好的紧凑文本（仅用于日志/调试，不含 Key） */
export function summarizeRequest(req: AIChatRequest): string {
  const parts: string[] = []
  for (const m of req.messages) {
    const role = m.role
    if (typeof m.content === 'string') {
      parts.push(`[${role}] ${m.content.slice(0, 80)}`)
    } else {
      const kinds = m.content.map((c) => c.type).join(',')
      parts.push(`[${role}] <${kinds}>`)
    }
  }
  return parts.join(' | ')
}
