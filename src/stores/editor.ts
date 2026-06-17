import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BreakpointName } from '@pageforge/schema'

/**
 * Editor Store
 * 负责选中态、当前断点等"编辑器层"状态，不写入 Project。
 */
export const useEditorStore = defineStore('editor', () => {
  const selectedNodeId = ref<string | null>(null)
  const currentBreakpoint = ref<BreakpointName>('desktop')
  const hoveredNodeId = ref<string | null>(null)

  function selectNode(id: string | null) {
    selectedNodeId.value = id
  }

  function setBreakpoint(bp: BreakpointName) {
    currentBreakpoint.value = bp
  }

  function setHovered(id: string | null) {
    hoveredNodeId.value = id
  }

  return {
    selectedNodeId,
    currentBreakpoint,
    hoveredNodeId,
    selectNode,
    setBreakpoint,
    setHovered
  }
})
