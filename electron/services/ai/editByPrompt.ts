import { readFile } from 'node:fs/promises'
import {
  type AiPatchSet,
  type AiPatch,
  type AIChatRequest,
  type Node,
  validateAiPatchSet,
  normalizeAiPatchSet,
  extractJsonFromContent
} from '@pageforge/schema'
import { chat } from '../aiService.js'
import { buildEditByPromptMessages } from './editByPromptPrompt.js'

/**
 * AI 微调：自然语言 → patch 列表（docs/steps/14 §3）
 * 注意：本函数只返回 patch 列表，不应用。应用由渲染进程走 applyPatchCommand。
 */
export async function editByPrompt(
  root: Node,
  prompt: string,
  scopeNodeId?: string
): Promise<{ patchSet: AiPatchSet; normalized: { patches: AiPatch[]; warnings: string[] } }> {
  const messages = buildEditByPromptMessages(root, prompt, scopeNodeId)

  const req: AIChatRequest = {
    messages,
    jsonSchemaHint: 'AiPatchSet',
    temperature: 0.1,
    maxTokens: 8192
  }
  const resp = await chat(req)

  // 提取 JSON
  const extracted = extractJsonFromContent(resp.content)
  if (!extracted) {
    return {
      patchSet: { summary: 'AI 返回无法解析', patches: [], warnings: ['解析失败'] } as any,
      normalized: { patches: [], warnings: ['解析失败: ' + resp.content.slice(0, 200)] }
    }
  }

  const v = validateAiPatchSet(extracted)
  if (!v.valid) {
    return {
      patchSet: { summary: '结构非法', patches: [] },
      normalized: { patches: [], warnings: v.issues.map((i) => `${i.path}: ${i.message}`) }
    }
  }

  const normalized = normalizeAiPatchSet(v.data!, root, scopeNodeId)
  return { patchSet: v.data!, normalized }
}
