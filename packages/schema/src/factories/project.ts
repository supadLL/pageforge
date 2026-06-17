import type { Project } from '../types/project.js'
import { DEFAULT_TOKENS } from '../types/tokens.js'
import { createPage } from './page.js'
import { genNodeId } from './node.js'
import { CURRENT_SCHEMA_VERSION } from './schemaVersion.js'

export function createProject(options?: Partial<Project>): Project {
  const now = new Date().toISOString()
  const homePage = createPage({
    id: options?.settings?.defaultPageId ?? 'pg_home',
    name: 'Home',
    route: '/'
  })
  return {
    id: options?.id ?? genNodeId('p'),
    name: options?.name ?? 'Untitled Project',
    schemaVersion: options?.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    createdAt: options?.createdAt ?? now,
    updatedAt: options?.updatedAt ?? now,
    tokens: options?.tokens ?? structuredClone(DEFAULT_TOKENS),
    pages: options?.pages ?? [homePage],
    assets: options?.assets ?? [],
    settings: {
      defaultPageId: homePage.id,
      defaultBreakpoint: 'desktop',
      previewBasePath: '',
      ...(options?.settings ?? {})
    }
  }
}
