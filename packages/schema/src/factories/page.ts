import type { Page } from '../types/page.js'
import { createPageRoot } from './node.js'
import { genNodeId } from './node.js'

export function createPage(options?: Partial<Page>): Page {
  const id = options?.id ?? genNodeId('pg')
  return {
    id,
    name: options?.name ?? 'Home',
    route: options?.route ?? '/',
    root: options?.root ?? createPageRoot(),
    meta: options?.meta
  }
}
