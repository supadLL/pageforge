import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import type { JsonSchema } from './jsonSchema.js'

/**
 * 校验结果（带 path + message，便于 UI 展示）
 */
export interface ValidationIssue {
  path: string
  message: string
  keyword: string
  /** 原始 ajv 错误信息，便于高级调试 */
  raw?: ErrorObject
}

export interface ValidationResult<T> {
  valid: boolean
  data?: T
  issues: ValidationIssue[]
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  // 允许 $schema / x-* 扩展
  allowUnionTypes: true
})

addFormats(ajv)

function toIssue(err: ErrorObject): ValidationIssue {
  // instancePath 是 JSON Pointer 形式（如 "/pages/0/root/type"）
  let path = (err.instancePath || '').replace(/\//g, '.')
  if (path.startsWith('.')) path = path.slice(1)
  if (!path) {
    // 顶层错误（如 required 缺失）：把缺失属性加到 path 里
    const params = err.params as Record<string, unknown> | undefined
    if (params && typeof params.missingProperty === 'string') {
      path = params.missingProperty
    } else {
      path = '<root>'
    }
  }
  return {
    path,
    message: err.message ?? 'invalid',
    keyword: err.keyword,
    raw: err
  }
}

function compile(schema: JsonSchema) {
  return ajv.compile(schema) as ((data: unknown) => boolean) & {
    errors?: ErrorObject[] | null
  }
}

export { ajv, compile, toIssue }
