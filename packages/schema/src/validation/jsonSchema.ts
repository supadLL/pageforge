/**
 * JSON Schema 7 类型（与 ajv 8 对齐）。
 * 用 type alias 而非 import，避开 ajv 内部类型的循环依赖复杂度。
 */
export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'

export interface JsonSchema {
  // 顶层关键字
  $id?: string
  $ref?: string
  $defs?: Record<string, JsonSchema>
  definitions?: Record<string, JsonSchema>

  type?: JsonSchemaType | JsonSchemaType[]
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  const?: unknown
  properties?: Record<string, JsonSchema>
  additionalProperties?: boolean | JsonSchema
  required?: string[]
  items?: JsonSchema | JsonSchema[]
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  pattern?: string
  format?: string
  oneOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  allOf?: JsonSchema[]
  /** 扩展：标记此字段为 token 引用（字符串，匹配 $xxx 路径） */
  'x-token'?: boolean
  /** 扩展：标记此字段为 asset 引用 */
  'x-asset'?: boolean
}

