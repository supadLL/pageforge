# P3-1 AI Provider 抽象层与配置

## 目标

建立统一的 AI Provider 抽象层与配置管理，让后续图生页面、AI 微调、框架转译都通过同一接口调用，且 API Key 等敏感信息只在主进程持有。

## 范围

- 定义 `AIProvider` 接口与 `AIRequest / AIResponse` 协议。
- 实现主进程 `aiService`：负责密钥读取（safeStorage 加密）、Provider 实例化、请求转发。
- preload 暴露 `window.pageforge.ai.*` 白名单 API。
- 实现 GLM Provider 适配器（智谱 GLM-4V / GLM-4.5）作为首个内置 Provider。
- 预留 OpenAI / Claude Provider 适配器接口（不实现完整调用）。
- 渲染进程 AI 配置面板：选择 Provider、填写 Base URL、模型、温度等非敏感参数。
- API Key 通过主进程对话框输入，safeStorage 加密存到 `userData`，渲染进程永远拿不到明文。

## 不做什么

- 不实现图生页面的具体 prompt 与 Node Tree 解析（Step 13）。
- 不实现 AI 微调的 Patch 协议应用（Step 14）。
- 不实现框架转译（Step 15-17）。
- 不做多 Provider 并发或负载均衡。
- 不做流式响应（MVP 用一次性返回；流式留到后续打磨）。

## 前置依赖

- 需要完成 [11-P2-本地预览服务与独立窗口.md](./11-P2-本地预览服务与独立窗口.md)。
- 主进程 IPC 框架（`registerProjectIpcHandlers` 模式）已就绪。
- `packages/schema` 的 `JsonSchema` 类型可用于校验 AI 返回。

## 实现要点

### 1. Provider 接口

```ts
// packages/schema/src/ai/provider.ts
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

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | AIContentPart[]
}

export type AIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

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
  /** 通用对话（可带图片） */
  chat(req: AIChatRequest): Promise<AIChatResponse>
}
```

### 2. GLM Provider 适配器

```ts
// electron/services/ai/glmProvider.ts
export class GLMProvider implements AIProvider {
  name = 'glm' as const
  capabilities = { vision: true, chat: true }
  constructor(private config: AIProviderConfig, private apiKey: string) {}
  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    // POST `${config.baseUrl}/api/paas/v4/chat/completions`
    // Authorization: Bearer ${apiKey}
    // body: { model, messages, temperature, max_tokens }
    // 返回 content = choices[0].message.content
  }
}
```

### 3. 主进程 aiService

```text
electron/services/aiService.ts
```

职责：
- `getActiveProvider(): AIProvider` —— 读取当前配置 + 解密 Key，返回 Provider 实例。
- `setApiKey(provider, key)` —— safeStorage 加密后写入 `userData/ai-keys.json`。
- `hasApiKey(provider): boolean`
- `chat(req)` —— 转发给 active provider。
- 所有网络请求只在主进程发起；渲染进程通过 IPC 调用。

### 4. 配置存储

- 非敏感配置（Provider 名、baseUrl、model、temperature）存 `userData/ai-config.json`，明文。
- API Key 存 `userData/ai-keys.json`，值用 `safeStorage.encryptString` 加密。
- 渲染进程能读配置但不能读 Key（IPC 只暴露 `hasApiKey` / `setApiKey`，不暴露 `getApiKey`）。

### 5. preload API

```ts
window.pageforge.ai = {
  chat: (req: AIChatRequest) => Promise<AIChatResponse>,
  getConfig: () => Promise<AIProviderConfig>,
  setConfig: (cfg: AIProviderConfig) => Promise<void>,
  hasApiKey: () => Promise<boolean>,
  setApiKey: () => Promise<boolean>, // 触发主进程输入对话框
  listProviders: () => Promise<AIProviderName[]>,
  getCapabilities: () => Promise<AICapability>
}
```

### 6. 渲染进程配置面板

- 一个独立面板或模态，列出 Provider 选择、baseUrl、model、temperature。
- API Key 输入框旁边一个"设置 Key"按钮，点击触发主进程 secure input。
- 显示当前 Key 是否已设置（绿点/灰点），不显示 Key 内容。
- "测试连接"按钮：发一条最小 chat 请求验证。

### 7. 安全

- `safeStorage.isEncryptionAvailable()` 不可用时降级提示用户（不存明文 Key）。
- IPC 参数 schema 校验，拒绝异常大的 messages 数组。
- 网络请求超时（默认 60s）+ 重试（1 次）。
- Provider 返回内容不直接 eval；所有结构化结果须经 schema 校验后才能用。

## 验收标准

- 可在配置面板选择 GLM Provider 并保存 baseUrl/model。
- API Key 设置后，渲染进程无法通过任何 IPC 拿到明文 Key。
- `window.pageforge.ai.chat()` 能成功调用 GLM 并返回 content。
- 未配置 Key 时调用 chat 返回明确错误，不崩溃。
- 配置面板显示 Key 已设置状态。
- "测试连接"在 Key 正确时返回成功，Key 错误时返回失败提示。
- 主进程日志不打印 API Key 明文。

## 测试建议

- GLM Provider 单元测试（mock fetch）：请求体格式、header、响应解析。
- aiService 单元测试：配置读写、Key 加密/解密往返、Provider 切换。
- safeStorage 不可用时的降级行为测试。
- IPC 参数校验测试（超大 payload 拒绝）。
- 配置面板组件测试：Provider 切换、Key 状态显示。

## PR Checklist

- [ ] `AIProvider` 接口在 `packages/schema` 中可被主/渲染共同引用。
- [ ] GLM Provider 可发起真实 chat 请求（需 Key 时手动验证）。
- [ ] API Key 全程不明文进入渲染进程。
- [ ] preload `ai.*` API 有完整类型声明。
- [ ] 配置面板可保存/读取配置。
- [ ] 测试覆盖 mock 请求与 Key 加解密。
- [ ] 文档更新：在 README 加 AI 配置说明。
