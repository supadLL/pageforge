import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createProject,
  type Project,
  type Page,
  type Node,
  type ComponentType,
  type StyleMap,
  type BreakpointName,
  type DesignTokens,
  createNode,
  isContainer,
  DEFAULT_TOKENS
} from '@pageforge/schema'
import {
  addNodeToTree,
  findNode,
  removeNodeFromTree,
  findContainerAncestor,
  updateNodeInTree,
  moveNodeInTree
} from '../editor/treeOps'
import { useHistoryStore } from '../editor/commands/historyStore'
import {
  makeAddCommand,
  makeRemoveCommand,
  makeMoveCommand,
  makeReorderCommand,
  makeUpdatePropsCommand,
  makeUpdateStyleCommand,
  makeUpdateResponsiveStyleCommand,
  makeRenameCommand,
  makeSetNodeStateCommand,
  makeReplacePageRootCommand,
  makeApplyPatchCommand,
  type EditorCommand
} from '../editor/commands/types'
import { applyCommand, collectRemoveSnapshot } from '../editor/commands/executor'

/**
 * Project Store
 *
 * Step 07 起：所有修改走 command dispatcher，并进入 history 栈。
 * 直接修改 Project 的方法被替换为对应的 command 入口。
 */
export const useProjectStore = defineStore('project', () => {
  const project = ref<Project>(createProject())
  /** 当前项目所在目录（.pageforge 路径）；新建未保存时为 null */
  const projectDir = ref<string | null>(null)

  const currentPageId = ref<string>(project.value.pages[0].id)
  const currentPage = ref<Page>(project.value.pages[0])

  function setCurrentPage(pageId: string) {
    const p = project.value.pages.find((x) => x.id === pageId)
    if (!p) throw new Error(`page not found: ${pageId}`)
    currentPageId.value = p.id
    currentPage.value = p
  }

  function getCurrentRoot(): Node {
    return currentPage.value.root
  }

  function setRoot(root: Node) {
    currentPage.value.root = root
  }

  function findNodeById(nodeId: string): Node | null {
    return findNode(getCurrentRoot(), nodeId)
  }

  /** 内部：执行一条命令，更新 root，并压入历史栈 */
  function exec(cmd: EditorCommand, mergeKey?: { nodeId: string; type: string; field?: string }): void {
    const newRoot = applyCommand(getCurrentRoot(), cmd)
    setRoot(newRoot)
    useHistoryStore().push(cmd, mergeKey as any)
  }

  function addNode(
    type: ComponentType,
    parentId?: string,
    index?: number,
    initialStyle?: Partial<StyleMap>
  ): Node {
    const targetParent = resolveParent(parentId)
    const newNode = createNode(type)
    if (initialStyle) {
      newNode.style = { ...newNode.style, ...initialStyle }
    }
    const cmd = makeAddCommand(targetParent.id, newNode, index)
    exec(cmd)
    return newNode
  }

  function removeNode(nodeId: string): void {
    const snapshot = collectRemoveSnapshot(getCurrentRoot(), nodeId)
    if (!snapshot) return
    const cmd = makeRemoveCommand(nodeId, snapshot.snapshot, snapshot.parentId, snapshot.index)
    exec(cmd)
  }

  function moveNode(nodeId: string, toParentId: string, toIndex: number): void {
    // 计算原始位置以便 revert
    const root = getCurrentRoot()
    const parent = findParentLocal(root, nodeId)
    if (!parent || !parent.children) return
    const fromIndex = parent.children.findIndex((c) => c.id === nodeId)
    const cmd = makeMoveCommand(nodeId, parent.id, fromIndex, toParentId, toIndex)
    exec(cmd)
  }

  function reorderNode(parentId: string, fromIndex: number, toIndex: number): void {
    const cmd = makeReorderCommand(parentId, fromIndex, toIndex)
    exec(cmd)
  }

  function resolveParent(parentId?: string): Node {
    if (parentId) {
      const n = findNodeById(parentId)
      if (n && isContainer(n.type)) return n
      if (n) {
        const container = findContainerAncestor(getCurrentRoot(), n.id)
        if (container) return container
      }
    }
    return getCurrentRoot()
  }

  function setTokens(tokens: DesignTokens) {
    project.value.tokens = tokens
  }

  function updateNodeProps(nodeId: string, partial: Record<string, unknown>): void {
    const cur = findNodeById(nodeId)
    if (!cur) return
    // before = 当前值（只取 partial 涉及的 key）
    const before: Record<string, unknown> = {}
    for (const k of Object.keys(partial)) before[k] = cur.props[k]
    const cmd = makeUpdatePropsCommand(nodeId, before, partial)
    // 合并键：nodeId + updateProps + 字段名
    const field = Object.keys(partial)[0]
    exec(cmd, { nodeId, type: 'updateProps' as const, field })
  }

  function updateNodeStyle(nodeId: string, partial: Partial<StyleMap>, breakpoint?: BreakpointName): void {
    const cur = findNodeById(nodeId)
    if (!cur) return
    const before: Partial<StyleMap> = {}
    for (const k of Object.keys(partial) as (keyof StyleMap)[]) {
      if (breakpoint) {
        before[k] = cur.responsive?.[breakpoint]?.style?.[k as keyof StyleMap]
      } else {
        before[k] = cur.style[k]
      }
    }
    const field = Object.keys(partial)[0]
    if (breakpoint) {
      const cmd = makeUpdateResponsiveStyleCommand(nodeId, breakpoint, before, partial)
      exec(cmd, { nodeId, type: 'updateResponsiveStyle' as const, field })
    } else {
      const cmd = makeUpdateStyleCommand(nodeId, before, partial)
      exec(cmd, { nodeId, type: 'updateStyle' as const, field })
    }
  }

  function renameNode(nodeId: string, name: string): void {
    const cur = findNodeById(nodeId)
    if (!cur) return
    const cmd = makeRenameCommand(nodeId, cur.name, name)
    exec(cmd)
  }

  function setNodeState(nodeId: string, state: Partial<{ hidden: boolean; locked: boolean }>): void {
    const cur = findNodeById(nodeId)
    if (!cur) return
    const before = { hidden: cur.state?.hidden, locked: cur.state?.locked }
    const after = { ...before, ...state }
    const cmd = makeSetNodeStateCommand(nodeId, before, after)
    exec(cmd)
  }

  /** 撤销 */
  function undo(): void {
    const history = useHistoryStore()
    const cmd = history.popUndo()
    if (!cmd) return
    const newRoot = applyCommand(getCurrentRoot(), cmd, true)
    setRoot(newRoot)
  }

  /** 重做 */
  function redo(): void {
    const history = useHistoryStore()
    const cmd = history.popRedo()
    if (!cmd) return
    const newRoot = applyCommand(getCurrentRoot(), cmd, false)
    setRoot(newRoot)
  }

  function markSaved(): void {
    useHistoryStore().markSaved()
  }

  /** 加载已有 Project 到 store（来自打开或新建） */
  function loadProject(p: Project, dir: string | null): void {
    project.value = p
    projectDir.value = dir
    if (p.pages.length > 0) {
      currentPageId.value = p.pages[0].id
      currentPage.value = p.pages[0]
    }
    useHistoryStore().clear()
  }

  /** 新建项目（通过主进程对话框） */
  async function newProjectViaDialog(): Promise<boolean> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.project?.create) return false
    const r = await api.project.create()
    if (!r) return false
    loadProject(r.project, r.projectDir)
    return true
  }

  /** 打开项目（通过主进程对话框） */
  async function openProjectViaDialog(): Promise<boolean> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.project?.open) return false
    const r = await api.project.open()
    if (!r) return false
    loadProject(r.project, r.projectDir)
    return true
  }

  /** 保存当前项目 */
  async function saveCurrentProject(): Promise<boolean> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.project?.save) return false
    if (!projectDir.value) {
      // 还没保存过，走新建流程
      return newProjectViaDialog()
    }
    project.value.updatedAt = new Date().toISOString()
    await api.project.save(projectDir.value, project.value)
    markSaved()
    return true
  }

  /** 启动本地预览服务 */
  async function startPreview(): Promise<{ url: string; port: number } | null> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.preview?.start) return null
    return api.preview.start(project.value, currentPage.value.id)
  }

  /** 刷新预览 */
  async function refreshPreview(): Promise<{ url: string } | null> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.preview?.refresh) return null
    return api.preview.refresh(project.value, currentPage.value.id)
  }

  /** 打开独立预览窗口 */
  async function openPreviewWindow(): Promise<{ url: string } | null> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.preview?.openWindow) return null
    // 若未启动，先 start
    const url = await api.preview.getUrl?.()
    if (!url) {
      await startPreview()
    }
    return api.preview.openWindow()
  }

  /**
   * 加载 AI 生成的页面草稿到当前页面。
   * - mode='replace'：用草稿 root 替换当前页面 root
   * - mode='append'：把草稿 root 的 children 追加到当前 root 的 children 末尾
   * 两种模式都生成可撤销的 replacePageRoot 命令。
   */
  function loadGeneratedDraft(
    newRoot: Node,
    mode: 'replace' | 'append' = 'replace'
  ): void {
    const before = getCurrentRoot()
    let after: Node
    if (mode === 'replace') {
      after = newRoot
    } else {
      // append：把 newRoot.children 追加到当前 root
      after = {
        ...before,
        children: [...(before.children ?? []), ...(newRoot.children ?? [])]
      }
    }
    const cmd = makeReplacePageRootCommand(before, after)
    exec(cmd)
  }

  /** AI 图生页面：选图 → 调 AI → 返回归一化结果（不直接加载，由 UI 决定） */
  async function generateFromImage(
    imagePath: string,
    userHint?: string
  ): Promise<{ summary: string; warnings: string[]; root: Node | null } | null> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.ai?.generateFromImage) return null
    const r = await api.ai.generateFromImage(imagePath, userHint, project.value.tokens)
    return r
  }

  /** AI 微调：自然语言 → patch 列表 → 应用为一条可撤销命令 */
  async function editByPrompt(
    prompt: string,
    scopeNodeId?: string
  ): Promise<{ applied: boolean; warnings: string[]; summary: string }> {
    const api = (globalThis as any).window?.pageforge
    if (!api?.ai?.editByPrompt) {
      return { applied: false, warnings: ['AI 不可用'], summary: '' }
    }
    const root = getCurrentRoot()
    const r = await api.ai.editByPrompt(root, prompt, scopeNodeId)
    if (r.patches.length === 0) {
      return { applied: false, warnings: r.warnings, summary: r.summary }
    }
    applyAiPatches(r.patches)
    return { applied: true, warnings: r.warnings, summary: r.summary }
  }

  /** 把 AI patch 列表打包成一条 applyPatch 命令并应用 */
  function applyAiPatches(patches: import('@pageforge/schema').AiPatch[]): void {
    const before = getCurrentRoot()
    const cmd = makeApplyPatchCommand(patches, before)
    exec(cmd)
  }

  return {
    project,
    projectDir,
    currentPageId,
    currentPage,
    setCurrentPage,
    getCurrentRoot,
    setRoot,
    findNodeById,
    addNode,
    removeNode,
    moveNode,
    reorderNode,
    setTokens,
    updateNodeProps,
    updateNodeStyle,
    renameNode,
    setNodeState,
    undo,
    redo,
    markSaved,
    loadProject,
    newProjectViaDialog,
    openProjectViaDialog,
    saveCurrentProject,
    startPreview,
    refreshPreview,
    openPreviewWindow,
    loadGeneratedDraft,
    generateFromImage,
    editByPrompt,
    applyAiPatches
  }
})

function findParentLocal(root: Node, id: string): Node | null {
  if (!root.children) return null
  for (const c of root.children) {
    if (c.id === id) return root
    const r = findParentLocal(c, id)
    if (r) return r
  }
  return null
}
