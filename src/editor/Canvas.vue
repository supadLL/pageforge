<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import NodeRenderer from '../editor/NodeRenderer.vue'
import { tokensToCssVars } from '../editor/styleResolver'
import { computeDropTarget, canDrop } from '../editor/dnd'
import type { ComponentType } from '@pageforge/schema'

/**
 * 画布（编辑器主区域）
 * 从 Node Tree 渲染当前 page root。
 * 接收来自组件库的拖拽（新建）和画布节点的拖拽（移动）。
 */
const project = useProjectStore()
const editor = useEditorStore()

const root = computed(() => project.getCurrentRoot())
const tokens = computed(() => project.project.tokens)
const cssVars = computed(() => tokensToCssVars(tokens.value))
const hoverDropId = ref<string | null>(null)

function onSelect(id: string) {
  editor.selectNode(id)
}

function onCanvasClick() {
  editor.selectNode(null)
}

function onNodeDrop(payload: { targetId: string; rect: DOMRect; offsetX: number; offsetY: number }) {
  const dragType = (window as any).__pfDragComponent as ComponentType | undefined
  const dragNodeId = (window as any).__pfDragNode as string | undefined

  if (dragType) {
    // 来自组件库：新建节点
    const target = computeDropTarget(project.getCurrentRoot(), payload.targetId, {
      offsetX: payload.offsetX,
      offsetY: payload.offsetY,
      width: payload.rect.width,
      height: payload.rect.height
    })
    if (!target) return
    const newNode = project.addNode(dragType, target.parentId, target.index)
    editor.selectNode(newNode.id)
  } else if (dragNodeId) {
    // 来自画布：移动已有节点
    const target = computeDropTarget(project.getCurrentRoot(), payload.targetId, {
      offsetX: payload.offsetX,
      offsetY: payload.offsetY,
      width: payload.rect.width,
      height: payload.rect.height
    })
    if (!target) return
    if (!canDrop(project.getCurrentRoot(), dragNodeId, target)) return
    project.moveNode(dragNodeId, target.parentId, target.index)
  }
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
}
</script>

<template>
  <div class="canvas-wrap" @click="onCanvasClick">
    <div
      class="canvas"
      :style="cssVars as any"
      @click.stop
      @dragover="onDragOver"
    >
      <NodeRenderer
        :node="root"
        :tokens="tokens"
        :selected-id="editor.selectedNodeId ?? undefined"
        :hover-drop-id="hoverDropId ?? undefined"
        @select="onSelect"
        @drop="onNodeDrop"
      />
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  flex: 1;
  background: #0b0d12;
  overflow: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.canvas {
  width: 100%;
  max-width: 1200px;
  min-height: 600px;
  background: #fff;
  color: #1a1a1a;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
}
</style>
