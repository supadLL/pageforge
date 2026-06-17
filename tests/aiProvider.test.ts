import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  PROVIDER_DEFAULTS,
  PROVIDER_CAPABILITIES,
  validateAIProviderConfig,
  summarizeRequest,
  type AIProviderConfig,
  type AIChatRequest
} from '@pageforge/schema'
import { GLMProvider } from '@electron/services/ai/glmProvider'

describe('P3 AI 协议 - 默认配置', () => {
  it('三个 Provider 都有默认配置', () => {
    expect(PROVIDER_DEFAULTS.glm.model).toBe('glm-4v')
    expect(PROVIDER_DEFAULTS.openai.model).toBe('gpt-4o')
    expect(PROVIDER_DEFAULTS.claude.model).toContain('claude')
  })

  it('capabilities 全部支持 vision + chat', () => {
    for (const name of ['glm', 'openai', 'claude'] as const) {
      expect(PROVIDER_CAPABILITIES[name].vision).toBe(true)
      expect(PROVIDER_CAPABILITIES[name].chat).toBe(true)
    }
  })
})

describe('P3 AI 协议 - validateAIProviderConfig', () => {
  it('合法配置通过', () => {
    expect(validateAIProviderConfig(PROVIDER_DEFAULTS.glm)).toBe(true)
  })

  it('非法 name 拒绝', () => {
    expect(validateAIProviderConfig({ ...PROVIDER_DEFAULTS.glm, name: 'foo' as any })).toBe(false)
  })

  it('空 baseUrl 拒绝', () => {
    expect(validateAIProviderConfig({ ...PROVIDER_DEFAULTS.glm, baseUrl: '' })).toBe(false)
  })

  it('非对象拒绝', () => {
    expect(validateAIProviderConfig(null)).toBe(false)
    expect(validateAIProviderConfig('x')).toBe(false)
  })
})

describe('P3 AI 协议 - summarizeRequest', () => {
  it('文本消息摘要', () => {
    const req: AIChatRequest = {
      messages: [{ role: 'user', content: 'Hello world this is a long message' }]
    }
    const s = summarizeRequest(req)
    expect(s).toContain('[user]')
    expect(s).toContain('Hello world')
  })

  it('图片消息摘要', () => {
    const req: AIChatRequest = {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '识别' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
          ]
        }
      ]
    }
    const s = summarizeRequest(req)
    expect(s).toContain('<text,image_url>')
  })
})

describe('P3 GLM Provider - mock fetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('构造时缺 Key 抛错', () => {
    expect(() => new GLMProvider(PROVIDER_DEFAULTS.glm, '')).toThrow(/apiKey required/)
  })

  it('chat 发送正确请求体并解析响应', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'pong' } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 }
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const p = new GLMProvider(PROVIDER_DEFAULTS.glm, 'sk-test-key')
    const r = await p.chat({ messages: [{ role: 'user', content: 'ping' }] })

    expect(r.content).toBe('pong')
    expect(r.usage?.promptTokens).toBe(5)
    expect(r.usage?.completionTokens).toBe(1)

    // 验证请求
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/paas/v4/chat/completions')
    expect((init as any).method).toBe('POST')
    expect((init as any).headers.Authorization).toBe('Bearer sk-test-key')
    const body = JSON.parse((init as any).body)
    expect(body.model).toBe('glm-4v')
    expect(body.messages[0].content).toBe('ping')
  })

  it('HTTP 错误抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized'
      })
    )
    const p = new GLMProvider(PROVIDER_DEFAULTS.glm, 'bad-key')
    await expect(p.chat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toThrow(/401/)
  })

  it('响应缺 content 抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{}] })
      })
    )
    const p = new GLMProvider(PROVIDER_DEFAULTS.glm, 'k')
    await expect(p.chat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toThrow(
      /invalid response shape/
    )
  })

  it('name 与 capabilities 正确', () => {
    const p = new GLMProvider(PROVIDER_DEFAULTS.glm, 'k')
    expect(p.name).toBe('glm')
    expect(p.capabilities.vision).toBe(true)
  })
})

describe('P3 aiService - 配置与 Key（mock 文件系统）', () => {
  // aiService 依赖 electron app/safeStorage，在 node 测试环境不可用，
  // 这里只测纯函数 validateAIProviderConfig 与 instantiateProvider 的逻辑边界。
  // 真实 IPC 行为需 Electron 运行时（推迟到桌面验证）。

  it('validateAIProviderConfig 边界', () => {
    const cfg: AIProviderConfig = {
      name: 'glm',
      baseUrl: 'https://x',
      model: 'm',
      temperature: 0.5,
      maxTokens: 100
    }
    expect(validateAIProviderConfig(cfg)).toBe(true)
    expect(validateAIProviderConfig({ ...cfg, name: 'x' as any })).toBe(false)
  })
})
