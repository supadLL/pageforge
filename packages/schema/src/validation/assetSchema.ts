import type { JsonSchema } from './jsonSchema.js'

export const assetSchema: JsonSchema = {
  $id: 'https://pageforge.local/schemas/asset',
  type: 'object',
  required: ['id', 'type', 'name', 'path', 'mime', 'size', 'createdAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['image', 'font', 'file'] },
    name: { type: 'string' },
    path: {
      type: 'string',
      pattern: '^(assets|snapshots)/.*$',
      description: '项目内相对路径，必须在 assets/ 或 snapshots/ 下'
    },
    mime: { type: 'string' },
    size: { type: 'number', minimum: 0 },
    width: { type: 'number', minimum: 0 },
    height: { type: 'number', minimum: 0 },
    hash: { type: 'string' },
    source: { type: 'string', enum: ['upload', 'ai', 'remote', 'template'] },
    createdAt: { type: 'string' }
  }
}
