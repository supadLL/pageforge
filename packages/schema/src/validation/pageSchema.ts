import type { JsonSchema } from './jsonSchema.js'
import { MVP_COMPONENT_TYPES } from '../types/component.js'

export const pageSchema: JsonSchema = {
  $id: 'https://pageforge.local/schemas/page',
  type: 'object',
  required: ['id', 'name', 'route', 'root'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    route: {
      type: 'string',
      pattern: '^/.*',
      description: '页面路由，必须以 / 开头'
    },
    // 跨 schema 引用 nodeSchema（nodeSchema 已在 validation/index.ts addSchema 显式注册）
    root: { $ref: 'https://pageforge.local/schemas/node' },
    meta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' }
      }
    }
  }
}

export const pageRootConstraintSchema: JsonSchema = {
  $id: 'https://pageforge.local/schemas/pageRoot-constraint',
  type: 'object',
  required: ['type'],
  properties: {
    type: { const: 'PageRoot', enum: [...MVP_COMPONENT_TYPES] }
  }
}
