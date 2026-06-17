import type { DesignTokens } from './tokens.js'
import type { Page } from './page.js'
import type { Asset } from './asset.js'
import type { BreakpointName } from './breakpoint.js'

export interface ProjectSettings {
  defaultPageId: string
  defaultBreakpoint: BreakpointName
  previewBasePath: string
}

export interface Project {
  id: string
  name: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
  tokens: DesignTokens
  pages: Page[]
  assets: Asset[]
  settings: ProjectSettings
}
