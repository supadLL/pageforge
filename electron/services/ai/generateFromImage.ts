import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import {
  type GeneratedPageDraft,
  type AIChatRequest,
  type DesignTokens,
  extractJsonFromContent,
  validateGeneratedDraft,
  normalizeGeneratedDraft
} from '@pageforge/schema'
import { chat } from '../aiService.js'
import { buildImageToPageMessages } from './imageToPagePrompt.js'

/**
 * 图生页面：图片 → Vision AI → GeneratedPageDraft
 * （docs/steps/13 §2）
 */
export async function generateFromImage(
  imagePath: string,
  options?: { userHint?: string; baseTokens?: DesignTokens }
): Promise<{ draft: GeneratedPageDraft; normalized: { root: any; warnings: string[]; tokens: DesignTokens | null } }> {
  // 1. 读图为 base64 data URL
  const buffer = await readFile(imagePath)
  const ext = extname(imagePath).toLowerCase()
  const mime = guessMime(ext)
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

  // 2. 构造 messages
  const messages = buildImageToPageMessages(dataUrl, options?.userHint)

  // 3. 调用 AI
  const req: AIChatRequest = {
    messages,
    jsonSchemaHint: 'GeneratedPageDraft',
    temperature: 0.1,
    maxTokens: 8192
  }
  const resp = await chat(req)

  // 4. 提取 JSON
  const extracted = extractJsonFromContent(resp.content)
  if (!extracted) {
    return {
      draft: {
        summary: 'AI 返回无法解析为 JSON',
        root: { type: 'PageRoot', children: [] },
        warnings: ['解析失败，原始响应: ' + resp.content.slice(0, 200)]
      },
      normalized: normalizeGeneratedDraft(
        {
          summary: '解析失败',
          root: { type: 'PageRoot' as const, children: [] }
        },
        options?.baseTokens
      )
    }
  }

  // 5. 校验 + 归一化
  const v = validateGeneratedDraft(extracted)
  if (!v.valid) {
    return {
      draft: {
        summary: 'AI 返回结构非法',
        root: { type: 'PageRoot', children: [] },
        warnings: v.issues.map((i) => `${i.path}: ${i.message}`)
      },
      normalized: normalizeGeneratedDraft(
        {
          summary: '结构非法',
          root: { type: 'PageRoot' as const, children: [] }
        },
        options?.baseTokens
      )
    }
  }

  const normalized = normalizeGeneratedDraft(v.data!, options?.baseTokens)
  return { draft: v.data!, normalized }
}

function guessMime(ext: string): string {
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}
