import type { AIMessage } from '@pageforge/schema'
import { MVP_COMPONENT_TYPES, ALLOWED_STYLE_KEYS } from '@pageforge/schema'

/**
 * 图生页面 prompt 构造（docs/steps/13 §3）
 */

export const IMAGE_TO_PAGE_SYSTEM_PROMPT = `你是 PageForge 的页面识别助手。
用户会给你一张页面截图或设计稿，你需要识别其中的布局、文案、样式，并生成 PageForge Node Tree。

输出要求：
1. 只返回一个 JSON 对象，不要任何解释文字、不要 markdown 围栏。
2. JSON 形状：
{
  "summary": "对识别结果的简短描述",
  "tokens": { "colors": { "primary": "#xxx" } },
  "root": { "type": "PageRoot", "children": [ ... ] },
  "warnings": []
}

3. 允许的组件 type（只能用这些）：
${MVP_COMPONENT_TYPES.join(', ')}

4. 允许的 style key（只能用这些，camelCase）：
${ALLOWED_STYLE_KEYS.join(', ')}

5. token 引用格式：$colors.primary、$spacing.4、$radius.md（完整路径，不要短引用）。

6. 每个节点必须有 type 和 props；id 可省略（系统会补）。

7. PageRoot、Container、Card 可以有 children 数组；其他组件不要有 children。

8. 示例：
{
  "summary": "Hero 区块",
  "root": {
    "type": "PageRoot",
    "children": [
      { "type": "Heading", "props": { "text": "Welcome", "level": 1 } },
      { "type": "Text", "props": { "text": "Build pages fast." } },
      { "type": "Button", "props": { "text": "Start", "variant": "primary" } }
    ]
  }
}`

export function buildImageToPageMessages(
  imageDataUrl: string,
  userHint?: string
): AIMessage[] {
  return [
    { role: 'system', content: IMAGE_TO_PAGE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: userHint ?? '请识别此页面并生成 Node Tree JSON。' },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ]
    }
  ]
}
