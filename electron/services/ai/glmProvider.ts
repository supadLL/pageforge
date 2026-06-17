import type {
  AIProvider,
  AIProviderConfig,
  AIChatRequest,
  AIChatResponse,
  AIMessage
} from '@pageforge/schema'

/**
 * GLM Provider 适配器（智谱 GLM-4V / GLM-4.5）
 *
 * 端点：POST {baseUrl}/api/paas/v4/chat/completions
 * 鉴权：Authorization: Bearer {apiKey}
 *
 * 本类只负责 HTTP 调用与响应解析，不持有 Key 明文日志。
 */
export class GLMProvider implements AIProvider {
  name = 'glm' as const
  capabilities = { vision: true, chat: true }

  constructor(
    private config: AIProviderConfig,
    private apiKey: string
  ) {
    if (!apiKey) throw new Error('GLMProvider: apiKey required')
  }

  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/paas/v4/chat/completions`
    const body = {
      model: this.config.model,
      messages: req.messages.map(normalizeMessage),
      temperature: req.temperature ?? this.config.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? this.config.maxTokens ?? 4096
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`GLM HTTP ${resp.status}: ${text.slice(0, 200)}`)
      }

      const data = (await resp.json()) as any
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('GLM: invalid response shape (choices[0].message.content missing)')
      }
      const usage = data?.usage
      return {
        content,
        usage: usage
          ? { promptTokens: usage.prompt_tokens ?? 0, completionTokens: usage.completion_tokens ?? 0 }
          : undefined,
        raw: data
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

function normalizeMessage(m: AIMessage) {
  // GLM 接受 OpenAI 风格 messages，content 可为 string 或数组
  return { role: m.role, content: m.content }
}
