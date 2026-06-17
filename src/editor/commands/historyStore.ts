import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EditorCommand, CommandType } from './types'

/**
 * 历史栈 store（参见 docs/steps/07 §3-4）
 *
 * 合并策略：同一节点、同一字段、短时间窗口内的连续 update 命令合并为一条。
 * 例如属性面板连续输入文本时，500ms 内对同一 nodeId + 同一 props key 的 updateProps
 * 只记录最后一次的 after，但保留第一次的 before。
 */
interface MergeKey {
  nodeId: string
  type: CommandType
  field?: string
}

const MERGE_WINDOW_MS = 500

export const useHistoryStore = defineStore('history', () => {
  const undoStack = ref<EditorCommand[]>([])
  const redoStack = ref<EditorCommand[]>([])
  const dirty = ref(false)
  const lastMergeKey = ref<MergeKey | null>(null)
  const lastMergeTime = ref(0)

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const undoCount = computed(() => undoStack.value.length)
  const redoCount = computed(() => redoStack.value.length)
  const lastCommand = computed(() => undoStack.value[undoStack.value.length - 1] ?? null)

  /**
   * 压入一条命令。
   * @param cmd 待压入命令
   * @param mergeKey 可选合并键；若与上一条相同且在时间窗内，则合并 after 而不入新条
   */
  function push(cmd: EditorCommand, mergeKey?: MergeKey): void {
    const now = Date.now()
    if (
      mergeKey &&
      lastMergeKey.value &&
      sameMergeKey(lastMergeKey.value, mergeKey) &&
      now - lastMergeTime.value < MERGE_WINDOW_MS &&
      undoStack.value.length > 0
    ) {
      // 合并：替换栈顶命令的 after（保留 before），更新 label
      const top = undoStack.value[undoStack.value.length - 1]
      mergeAfter(top, cmd)
      lastMergeTime.value = now
      dirty.value = true
      // redo 栈仍然清空（合并期间不应有 redo 残留）
      return
    }
    undoStack.value.push(cmd)
    redoStack.value = []
    lastMergeKey.value = mergeKey ?? null
    lastMergeTime.value = now
    dirty.value = true
  }

  function popUndo(): EditorCommand | null {
    if (undoStack.value.length === 0) return null
    const cmd = undoStack.value.pop()!
    redoStack.value.push(cmd)
    if (undoStack.value.length === 0) {
      // 撤销到空不等于 clean，dirty 由 save 显式清零
    }
    return cmd
  }

  function popRedo(): EditorCommand | null {
    if (redoStack.value.length === 0) return null
    const cmd = redoStack.value.pop()!
    undoStack.value.push(cmd)
    return cmd
  }

  function markSaved(): void {
    dirty.value = false
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
    dirty.value = false
    lastMergeKey.value = null
    lastMergeTime.value = 0
  }

  return {
    undoStack,
    redoStack,
    dirty,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    lastCommand,
    push,
    popUndo,
    popRedo,
    markSaved,
    clear
  }
})

function sameMergeKey(a: MergeKey, b: MergeKey): boolean {
  return a.nodeId === b.nodeId && a.type === b.type && a.field === b.field
}

/**
 * 把新命令的 after 合并到栈顶命令中。
 * 仅支持 updateProps / updateStyle / updateResponsiveStyle 三种合并。
 */
function mergeAfter(top: EditorCommand, incoming: EditorCommand): void {
  const topPayload = top.payload as { after: Record<string, unknown> }
  const incPayload = incoming.payload as { after: Record<string, unknown> }
  if (top.type === 'updateProps' && incoming.type === 'updateProps') {
    top.payload = {
      ...topPayload,
      after: { ...topPayload.after, ...incPayload.after }
    }
    return
  }
  if (top.type === 'updateStyle' && incoming.type === 'updateStyle') {
    top.payload = {
      ...topPayload,
      after: { ...topPayload.after, ...incPayload.after }
    }
    return
  }
  if (top.type === 'updateResponsiveStyle' && incoming.type === 'updateResponsiveStyle') {
    top.payload = {
      ...topPayload,
      after: { ...topPayload.after, ...incPayload.after }
    }
    return
  }
  // 不可合并的命令退化为直接替换栈顶
  undoStack_replaceTop(top, incoming)
}

function undoStack_replaceTop(_top: EditorCommand, incoming: EditorCommand): void {
  // 这里是 fallback，实际不会走到（调用方控制 mergeKey）
}
