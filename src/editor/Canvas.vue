<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import NodeRenderer from '../editor/NodeRenderer.vue'
import { tokensToCssVars } from '../editor/styleResolver'
import type { ComponentType } from '@pageforge/schema'

const project = useProjectStore()
const editor = useEditorStore()

type CanvasDropPayload = {
  targetId: string
  rect: DOMRect
  offsetX: number
  offsetY: number
  clientX: number
  clientY: number
}

const root = computed(() => project.getCurrentRoot())
const tokens = computed(() => project.project.tokens)
const cssVars = computed(() => tokensToCssVars(tokens.value))
const hoverDropId = ref<string | null>(null)
const wrapEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLElement | null>(null)
const pan = ref({ x: 420, y: 260 })
const panning = ref(false)
let panStart: { x: number; y: number; panX: number; panY: number } | null = null
let didPan = false

const canvasStyle = computed(() => ({
  ...cssVars.value,
  transform: `translate(${pan.value.x}px, ${pan.value.y}px)`
}))

const wrapStyle = computed(() => ({
  '--grid-x': `${mod(pan.value.x, 24)}px`,
  '--grid-y': `${mod(pan.value.y, 24)}px`,
  '--grid-major-x': `${mod(pan.value.x, 120)}px`,
  '--grid-major-y': `${mod(pan.value.y, 120)}px`
}))

function onSelect(id: string) {
  editor.selectNode(id)
}

function onCanvasClick() {
  if (didPan) {
    didPan = false
    return
  }
  editor.selectNode(null)
}

function clearDragState() {
  ;(window as any).__pfDragComponent = undefined
  ;(window as any).__pfDragNode = undefined
  ;(window as any).__pfDragOffset = undefined
}

function getDropStyle(payload: Pick<CanvasDropPayload, 'clientX' | 'clientY'>) {
  const rect = wrapEl.value?.getBoundingClientRect()
  const offset = ((window as any).__pfDragOffset ?? { x: 12, y: 12 }) as { x: number; y: number }
  const rawLeft = rect ? payload.clientX - rect.left - pan.value.x - offset.x : 24
  const rawTop = rect ? payload.clientY - rect.top - pan.value.y - offset.y : 24
  return {
    position: 'absolute',
    left: `${Math.round(rawLeft)}px`,
    top: `${Math.round(rawTop)}px`,
    margin: '0'
  } as const
}

function onNodeDrop(payload: CanvasDropPayload) {
  const dragType = (window as any).__pfDragComponent as ComponentType | undefined
  const dragNodeId = (window as any).__pfDragNode as string | undefined

  if (dragType) {
    const newNode = project.addNode(dragType, root.value.id, undefined, getDropStyle(payload))
    editor.selectNode(newNode.id)
  } else if (dragNodeId) {
    project.updateNodeStyle(dragNodeId, getDropStyle(payload))
    editor.selectNode(dragNodeId)
  }

  clearDragState()
}

function onDragOver(e: DragEvent) {
  if (!e.dataTransfer) return
  e.preventDefault()
  e.dataTransfer.dropEffect = (window as any).__pfDragNode ? 'move' : 'copy'
}

function onCanvasDrop(e: DragEvent) {
  if (!e.dataTransfer) return
  e.preventDefault()
  onNodeDrop({
    targetId: root.value.id,
    rect: wrapEl.value?.getBoundingClientRect() ?? new DOMRect(),
    offsetX: 0,
    offsetY: 0,
    clientX: e.clientX,
    clientY: e.clientY
  })
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  if (isInteractiveTarget(e.target as HTMLElement)) return
  const node = (e.target as HTMLElement).closest('.pf-node[data-node-type]') as HTMLElement | null
  if (node && node.dataset.nodeType !== 'PageRoot') return

  e.preventDefault()
  panning.value = true
  didPan = false
  panStart = { x: e.clientX, y: e.clientY, panX: pan.value.x, panY: pan.value.y }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
  if (!panStart) return
  const dx = e.clientX - panStart.x
  const dy = e.clientY - panStart.y
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan = true
  pan.value = {
    x: panStart.panX + dx,
    y: panStart.panY + dy
  }
}

function onPointerUp() {
  panning.value = false
  panStart = null
  window.removeEventListener('pointermove', onPointerMove)
}

function isInteractiveTarget(target: HTMLElement | null) {
  if (!target) return false
  return !!target.closest('button,input,textarea,select,[contenteditable="true"],.pf-resize-handle')
}

function mod(value: number, size: number) {
  return ((value % size) + size) % size
}
</script>

<template>
  <div
    ref="wrapEl"
    class="canvas-wrap"
    :class="{ 'is-panning': panning }"
    :style="wrapStyle as any"
    @click="onCanvasClick"
    @pointerdown="onPointerDown"
    @dragover="onDragOver"
    @drop="onCanvasDrop"
  >
    <div
      ref="canvasEl"
      class="canvas"
      :style="canvasStyle as any"
      @dragover="onDragOver"
      @drop="onCanvasDrop"
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
  position: relative;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  background:
    linear-gradient(
      rgba(99, 153, 255, 0.12) 1px,
      transparent 1px
    ) var(--grid-major-x) var(--grid-major-y) / 120px 120px,
    linear-gradient(
      90deg,
      rgba(99, 153, 255, 0.12) 1px,
      transparent 1px
    ) var(--grid-major-x) var(--grid-major-y) / 120px 120px,
    linear-gradient(
      rgba(148, 163, 184, 0.08) 1px,
      transparent 1px
    ) var(--grid-x) var(--grid-y) / 24px 24px,
    linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.08) 1px,
      transparent 1px
    ) var(--grid-x) var(--grid-y) / 24px 24px,
    radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.2) 1px, transparent 0),
    linear-gradient(135deg, #080b10 0%, #0d1118 100%);
}
.canvas-wrap.is-panning {
  cursor: grabbing;
}
.canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  color: #1a1a1a;
  overflow: visible;
  transform-origin: 0 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
}
</style>
