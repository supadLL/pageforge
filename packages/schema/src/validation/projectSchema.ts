import type { JsonSchema } from './jsonSchema.js'
import { pageSchema } from './pageSchema.js'
import { assetSchema } from './assetSchema.js'

/**
 * tokens 是分组字典；每组下都是 string -> string。
 * 实际类型在 DesignTokens interface 中定义。
 */
const tokensGroup = (description: string): JsonSchema => ({
  type: 'object',
  description,
  additionalProperties: { type: 'string' }
})

export const projectSchema: JsonSchema = {
  $id: 'https://pageforge.local/schemas/project',
  type: 'object',
  required: [
    'id',
    'name',
    'schemaVersion',
    'createdAt',
    'updatedAt',
    'tokens',
    'pages',
    'assets',
    'settings'
  ],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    schemaVersion: {
      type: 'integer',
      minimum: 1,
      description: '数据 schema 版本号'
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    tokens: {
      type: 'object',
      additionalProperties: false,
      properties: {
        colors: tokensGroup('color tokens'),
        fontSize: tokensGroup('font size tokens'),
        fontFamily: tokensGroup('font family tokens'),
        spacing: tokensGroup('spacing tokens'),
        radius: tokensGroup('radius tokens'),
        shadow: tokensGroup('shadow tokens'),
        motion: tokensGroup('motion tokens')
      }
    },
    pages: {
      type: 'array',
      minItems: 1,
      items: pageSchema
    },
    assets: {
      type: 'array',
      items: assetSchema
    },
    settings: {
      type: 'object',
      required: ['defaultPageId', 'defaultBreakpoint', 'previewBasePath'],
      additionalProperties: false,
      properties: {
        defaultPageId: { type: 'string' },
        defaultBreakpoint: {
          type: 'string',
          enum: ['desktop', 'laptop', 'tablet', 'mobile']
        },
        previewBasePath: { type: 'string' }
      }
    }
  }
}
