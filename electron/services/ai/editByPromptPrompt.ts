import type { AIMessage, Node } from '@pageforge/schema'
import { MVP_COMPONENT_TYPES, ALLOWED_STYLE_KEYS } from '@pageforge/schema'

/**
 * AI 微调 prompt 构造（docs/steps/14 §6）
 */

export const EDIT_BY_PROMPT_SYSTEM_PROMPT = `你是 PageForge 的页面修改助手。
用户会给你当前的 Node Tree（JSON）和一条修改指令，你需要返回修改后的 patch 列表。

输出要求：
1. 只返回一个 JSON 对象，不要解释文字、不要 markdown 围栏。
2. JSON 形状：
{
  "summary": "简短描述你做了什么",
  "patches": [ ... ]
}

3. 每个 patch 的 op 只能是：
   - addNode: { op: "addNode", parentId, index?, node: { type, props, style? } }
   - removeNode: { op: "removeNode", nodeId }
   - moveNode: { op: "moveNode", nodeId, parentId, index? }
   - updateProps: { op: "updateProps", nodeId, props: { ... } }
   - updateStyle: { op: "updateStyle", nodeId, style: { ... }, breakpoint? }
   - renameNode: { op: "renameNode", nodeId, name }

4. 允许的组件 type：
${MVP_COMPONENT_TYPES.join(', ')}

5. 允许的 style key（camelCase）：
${ALLOWED_STYLE_KEYS.join(', ')}

6. token 引用格式：$colors.primary、$spacing.4 等。

7. nodeId 必须来自我提供的树，不要发明新 id。addNode 的 node 不要带 id（系统会补）。

8. 示例（把按钮改红色圆角）：
{
  "summary": "按钮改红色圆角",
  "patches": [
    { "op": "updateStyle", "nodeId": "btn1", "style": { "backgroundColor": "#ff0000", "borderRadius": "8px" } }
  ]
}`

export function buildEditByPromptMessages(
  tree: Node,
  prompt: string,
  scopeNodeId?: string
): AIMessage[] {
  // 紧凑序列化：只保留 id/type/props/style/children，去掉 events/responsive
  const compact = serializeCompact(tree)
  const scopeHint = scopeNodeId
    ? `\n注意：只修改 nodeId 等于 ${scopeNodeId} 的节点及其后代，不要改树的其他部分。`
    : ''

  return [
    { role: 'system', content: EDIT_BY_PROMPT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `当前 Node Tree：\n${compact}\n\n修改指令：${prompt}${scopeHint}`
    }
  ]
}

function serializeCompact(node: Node): string {
  const stripped = stripNode(node)
  return JSON.stringify(stripped)
}

function stripNode(n: Node): any {
  const out: any = { id: n.id, type: n.type }
  if (n.name) out.name = n.name
  if (n.props && Object.keys(n.props).length > 0) out.props = n.props
  if (n.style && Object.keys(n.style).length > 0) out.style = n.style
  if (n.children && n.children.length > 0) {
    out.children = n.children.map(stripNode)
  }
  return out
}
