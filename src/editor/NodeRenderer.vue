<script setup lang="ts">
import { computed, defineComponent, getCurrentInstance, h, ref, type PropType } from 'vue'
import type { DesignTokens, Node, StyleMap } from '@pageforge/schema'
import { isContainer } from '@pageforge/schema'
import { resolveStyleMap } from './styleResolver'
import { useProjectStore } from '../stores/project'

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const props = defineProps({
  node: { type: Object as PropType<Node>, required: true },
  tokens: { type: Object as PropType<DesignTokens>, required: true },
  selectedId: { type: String, default: null },
  hoverDropId: { type: String, default: null }
})

defineOptions({ name: 'NodeRenderer' })

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'drop', payload: {
    targetId: string
    rect: DOMRect
    offsetX: number
    offsetY: number
    clientX: number
    clientY: number
  }): void
}>()

const project = useProjectStore()
const selfComponent = getCurrentInstance()?.type
const resolvedStyle = computed(() => resolveStyleMap(props.node.style, props.tokens))

const isSelected = computed(() => props.selectedId === props.node.id)
const isLocked = computed(() => props.node.state?.locked === true)
const isHidden = computed(() => props.node.state?.hidden === true)
const isDropHover = computed(() => props.hoverDropId === props.node.id)
const canDrag = computed(() => props.node.type !== 'PageRoot' && !isLocked.value)
const canResize = computed(() => isSelected.value && props.node.type !== 'PageRoot' && !isLocked.value)
const isEmptyContainer = computed(
  () => isContainer(props.node.type) && (!props.node.children || props.node.children.length === 0)
)

const isEditing = ref(false)
const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const textEditableTypes = new Set(['Heading', 'Text', 'Button', 'Badge', 'Avatar'])

function onClick(e: MouseEvent) {
  if (isLocked.value) return
  e.stopPropagation()
  emit('select', props.node.id)
}

function onDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.preventDefault()
    e.dataTransfer.dropEffect = (window as any).__pfDragComponent ? 'copy' : 'move'
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  emit('drop', {
    targetId: props.node.id,
    rect,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    clientX: e.clientX,
    clientY: e.clientY
  })
}

function onDragStart(e: DragEvent) {
  if (isEditing.value || !canDrag.value || !e.dataTransfer) {
    e.preventDefault()
    return
  }
  e.stopPropagation()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  ;(window as any).__pfDragNode = props.node.id
  ;(window as any).__pfDragComponent = undefined
  ;(window as any).__pfDragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
  e.dataTransfer.setData('application/x-pageforge-node', props.node.id)
  e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  ;(window as any).__pfDragNode = undefined
  ;(window as any).__pfDragOffset = undefined
}

function onResizeStart(e: PointerEvent, handle: ResizeHandle) {
  if (!canResize.value) return
  e.preventDefault()
  e.stopPropagation()
  emit('select', props.node.id)

  const el = (e.currentTarget as HTMLElement).closest('.pf-node') as HTMLElement | null
  if (!el) return

  const rect = el.getBoundingClientRect()
  const start = {
    x: e.clientX,
    y: e.clientY,
    width: rect.width,
    height: rect.height,
    left: parsePx(props.node.style.left, 0),
    top: parsePx(props.node.style.top, 0)
  }

  // 拖动期间的实时尺寸（本地 ref，不进历史栈）
  const liveStyle = ref<{ width?: string; height?: string; left?: string; top?: string }>({})

  const onMove = (moveEvent: PointerEvent) => {
    moveEvent.preventDefault()
    const dx = moveEvent.clientX - start.x
    const dy = moveEvent.clientY - start.y
    const next: Partial<StyleMap> = {}
    const minWidth = 24
    const minHeight = 18

    if (handle.includes('e')) next.width = `${Math.max(minWidth, Math.round(start.width + dx))}px`
    if (handle.includes('s')) next.height = `${Math.max(minHeight, Math.round(start.height + dy))}px`
    if (handle.includes('w')) {
      const width = Math.max(minWidth, Math.round(start.width - dx))
      next.width = `${width}px`
      next.left = `${Math.round(start.left + (start.width - width))}px`
    }
    if (handle.includes('n')) {
      const height = Math.max(minHeight, Math.round(start.height - dy))
      next.height = `${height}px`
      next.top = `${Math.round(start.top + (start.height - height))}px`
    }

    // 实时更新视觉（直接写 DOM，不走 store，不进历史栈）
    liveStyle.value = next as any
    if (next.width) el.style.width = next.width as string
    if (next.height) el.style.height = next.height as string
    if (next.left) el.style.left = next.left as string
    if (next.top) el.style.top = next.top as string
  }

  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    // pointerup 时一次性提交命令（一条历史记录）
    const final = liveStyle.value
    if (final && Object.keys(final).length > 0) {
      project.updateNodeStyle(props.node.id, final as Partial<StyleMap>)
    }
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}

function parsePx(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function updateTextFromEditable(n: Node, e: FocusEvent) {
  isEditing.value = false
  const next = (e.currentTarget as HTMLElement).innerText
  if (next !== String(n.props.text ?? '')) {
    project.updateNodeProps(n.id, { text: next })
  }
}

function editableText(n: Node) {
  const editable = textEditableTypes.has(n.type) && !isLocked.value
  return h(
    'span',
    {
      class: 'pf-editable-text',
      contenteditable: editable ? 'true' : 'false',
      spellcheck: 'false',
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        emit('select', n.id)
      },
      onPointerdown: (e: PointerEvent) => {
        e.stopPropagation()
      },
      onFocus: () => {
        isEditing.value = true
        emit('select', n.id)
      },
      onBlur: (e: FocusEvent) => updateTextFromEditable(n, e),
      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).blur()
        }
      }
    },
    String(n.props.text ?? '')
  )
}

const Inner = defineComponent({
  name: 'NodeInner',
  props: { node: { type: Object as PropType<Node>, required: true } },
  setup(p) {
    return () => renderByType(p.node)
  }
})

function renderByType(n: Node) {
  switch (n.type) {
    case 'PageRoot':
      return h('main', undefined, renderChildren(n))
    case 'Container':
    case 'Card':
    case 'BackgroundPanel':
    case 'GlassPanel':
    case 'GradientCard':
    case 'Navbar':
    case 'HeroBlock':
    case 'StatsCard':
    case 'FeatureTile':
    case 'Tabs':
    case 'Sidebar':
    case 'PricingCard':
      return h(getContainerTag(n.type), undefined, renderChildren(n))
    case 'ProgressBar': {
      const value = Math.max(0, Math.min(100, Number(n.props.value ?? 0)))
      return h('div', undefined, [
        h('span', {
          class: 'pf-progress-fill',
          style: {
            display: 'block',
            width: `${value}%`,
            height: '100%',
            borderRadius: 'inherit',
            background: 'linear-gradient(90deg, #2563eb, #06b6d4)'
          }
        })
      ])
    }
    case 'Badge':
      return h('span', undefined, editableText(n))
    case 'Avatar':
      return h('div', undefined, editableText(n))
    case 'SearchBox':
      return h('div', undefined, [
        h('span', { class: 'pf-search-icon' }, 'Search'),
        h('input', {
          type: 'text',
          placeholder: String(n.props.placeholder ?? ''),
          value: String(n.props.value ?? ''),
          disabled: !!n.props.disabled
        })
      ])
    case 'Heading': {
      const level = Math.max(1, Math.min(6, Number(n.props.level ?? 2)))
      return h(`h${level}`, undefined, editableText(n))
    }
    case 'Text':
      return h('p', null, editableText(n))
    case 'Button':
      return h(
        'button',
        { disabled: !!n.props.disabled, type: 'button' },
        editableText(n)
      )
    case 'Image':
      return h('img', {
        src: String(n.props.src ?? ''),
        alt: String(n.props.alt ?? ''),
        style: { objectFit: n.props.fit }
      })
    case 'Input':
      return h('input', {
        type: String(n.props.inputType ?? 'text'),
        placeholder: String(n.props.placeholder ?? ''),
        value: String(n.props.value ?? ''),
        disabled: !!n.props.disabled
      })
    case 'Divider':
      return h('hr')
    default:
      return h('div', undefined, `[unknown: ${(n as any).type}]`)
  }
}

function getContainerTag(type: string) {
  if (type === 'BackgroundPanel' || type === 'HeroBlock') return 'section'
  if (type === 'Navbar') return 'nav'
  if (type === 'Sidebar') return 'aside'
  return 'div'
}

function renderChildren(n: Node) {
  if (!n.children || n.children.length === 0) {
    if (isContainer(n.type)) {
      return h('div', { class: 'pf-empty' }, '拖入组件')
    }
    return undefined
  }
  return n.children.map((c) =>
    h(selfComponent as any, {
      node: c,
      tokens: props.tokens,
      selectedId: props.selectedId,
      hoverDropId: props.hoverDropId,
      onSelect: (id: string) => emit('select', id),
      onDrop: (p: any) => emit('drop', p),
      key: c.id
    })
  )
}
</script>

<template>
  <div
    class="pf-node"
    :class="{
      'is-selected': isSelected,
      'is-locked': isLocked,
      'is-hidden': isHidden,
      'is-empty-container': isEmptyContainer,
      'is-drop-hover': isDropHover
    }"
    :style="resolvedStyle as any"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :draggable="canDrag"
    @click="onClick"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <Inner :node="node" />
    <template v-if="canResize">
      <span
        v-for="handle in resizeHandles"
        :key="handle"
        class="pf-resize-handle"
        :class="`is-${handle}`"
        :data-handle="handle"
        draggable="false"
        @pointerdown="onResizeStart($event, handle)"
        @dragstart.stop.prevent
      />
    </template>
  </div>
</template>

<style scoped>
.pf-node {
  position: relative;
  outline: 1px dashed transparent;
  outline-offset: -1px;
  transition: outline-color 0.1s ease;
  cursor: pointer;
}
.pf-node:hover {
  outline-color: rgba(99, 153, 255, 0.5);
}
.pf-node[draggable='true'] {
  cursor: grab;
}
.pf-node[draggable='true']:active {
  cursor: grabbing;
}
.pf-node.is-selected {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
  z-index: 10;
}
.pf-node.is-locked {
  cursor: not-allowed;
}
.pf-node.is-hidden {
  opacity: 0.35;
}
.pf-node.is-drop-hover {
  outline: 2px dashed #f59e0b !important;
  outline-offset: -2px;
  background-color: rgba(245, 158, 11, 0.08);
}
.pf-node.is-empty-container {
  min-height: 40px;
  border: 1px dashed rgba(99, 153, 255, 0.4);
  border-radius: 6px;
  padding: 8px;
  color: #64748b;
  font-size: 12px;
  align-items: center;
  justify-content: center;
}
.pf-empty {
  text-align: center;
  width: 100%;
  pointer-events: none;
}
.pf-editable-text {
  min-width: 1ch;
  outline: none;
  cursor: text;
  white-space: pre-wrap;
}
.pf-editable-text:focus {
  border-radius: 4px;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.26);
}
.pf-search-icon {
  color: currentColor;
  opacity: 0.65;
  font-size: 12px;
  font-weight: 700;
}
button,
input {
  font: inherit;
}
.pf-node[data-node-type='SearchBox'] input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
}
.pf-resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  z-index: 20;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.32);
}
.pf-resize-handle.is-nw {
  left: -5px;
  top: -5px;
  cursor: nwse-resize;
}
.pf-resize-handle.is-n {
  left: 50%;
  top: -5px;
  transform: translateX(-50%);
  cursor: ns-resize;
}
.pf-resize-handle.is-ne {
  right: -5px;
  top: -5px;
  cursor: nesw-resize;
}
.pf-resize-handle.is-e {
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}
.pf-resize-handle.is-se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}
.pf-resize-handle.is-s {
  left: 50%;
  bottom: -5px;
  transform: translateX(-50%);
  cursor: ns-resize;
}
.pf-resize-handle.is-sw {
  left: -5px;
  bottom: -5px;
  cursor: nesw-resize;
}
.pf-resize-handle.is-w {
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  cursor: ew-resize;
}
</style>
