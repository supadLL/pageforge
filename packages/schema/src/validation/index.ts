import { ajv, compile, toIssue } from './ajv.js'
import { projectSchema } from './projectSchema.js'
import { pageSchema } from './pageSchema.js'
import { nodeSchema } from './nodeSchema.js'
import { assetSchema } from './assetSchema.js'
import type { ValidationResult, ValidationIssue } from './ajv.js'
import type { Project } from '../types/project.js'
import type { Page } from '../types/page.js'
import type { Node } from '../types/node.js'
import type { Asset } from '../types/asset.js'
import type { ErrorObject } from 'ajv'

// 显式 addSchema 让跨 schema $ref（page → node）可解析
ajv.addSchema(nodeSchema)
ajv.addSchema(pageSchema)
ajv.addSchema(assetSchema)

type CompiledValidator = ((data: unknown) => boolean) & {
  errors?: ErrorObject[] | null
}
const projectValidate = compile(projectSchema) as CompiledValidator
const pageValidate = compile(pageSchema) as CompiledValidator
const nodeValidate = compile(nodeSchema) as CompiledValidator
const assetValidate = compile(assetSchema) as CompiledValidator

function run<T>(validate: CompiledValidator, data: unknown): ValidationResult<T> {
  const ok = validate(data)
  if (ok) return { valid: true, data: data as T, issues: [] }
  const issues: ValidationIssue[] = (validate.errors ?? []).map(toIssue)
  return { valid: false, issues }
}

export function validateProject(input: unknown): ValidationResult<Project> {
  const result = run<Project>(projectValidate, input)
  if (!result.valid) return result

  // 二次业务校验：每个 page.root.type 必须是 PageRoot
  const issues: ValidationIssue[] = []
  const project = result.data!
  for (let i = 0; i < project.pages.length; i++) {
    const page = project.pages[i]
    if (page.root.type !== 'PageRoot') {
      issues.push({
        path: `pages.${i}.root.type`,
        message: `page.root.type must be PageRoot, got ${page.root.type}`,
        keyword: 'pageRootType'
      })
    }
    // route 唯一性
  }
  const seenRoutes = new Set<string>()
  for (let i = 0; i < project.pages.length; i++) {
    const r = project.pages[i].route
    if (seenRoutes.has(r)) {
      issues.push({
        path: `pages.${i}.route`,
        message: `duplicate route: ${r}`,
        keyword: 'uniqueRoute'
      })
    }
    seenRoutes.add(r)
  }

  if (issues.length > 0) return { valid: false, issues }
  return { valid: true, data: project, issues: [] }
}

export function validatePage(input: unknown): ValidationResult<Page> {
  return run<Page>(pageValidate, input)
}

export function validateNode(input: unknown): ValidationResult<Node> {
  return run<Node>(nodeValidate, input)
}

export function validateAsset(input: unknown): ValidationResult<Asset> {
  return run<Asset>(assetValidate, input)
}

export { ajv }
