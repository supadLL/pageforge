<script setup lang="ts">
import { computed, h, defineComponent, resolveComponent, type PropType } from 'vue'
import type { Node, DesignTokens } from '@pageforge/schema'
import { isContainer } from '@pageforge/schema'
import { resolveStyleMap } from './styleResolver'

/**
 * NodeRenderer 鈥斺€?閫掑綊娓叉煋 Node Tree 鍒?Vue 缁勪欢
 * 缂栬緫鍣ㄥ唴閮ㄤ娇鐢ㄥ唴鑱?style锛堜笌瀵煎嚭鍣ㄧ殑 class 绛栫暐鍒嗗紑锛? * 閫変腑鎬佺敱澶栧眰 NodeWrapper 澶勭悊
 */
const props = defineProps({
  node: { type: Object as PropType<Node>, required: true },
  tokens: { type: Object as PropType<DesignTokens>, required: true },
  selectedId: { type: String, default: null },
  hoverDropId: { type: String, default: null },
  onSelect: { type: Function as PropType<(id: string) => void>, default: () => {} },
  onDropNode: {
    type: Function as PropType<
      (e: { targetId: string; rect: DOMRect; offsetX: number; offsetY: number }) => void
    >,
    default: () => {}
  }
})

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'drop', payload: { targetId: string; rect: DOMRect; offsetX: number; offsetY: number }): void
}>()

const resolvedStyle = computed(() => resolveStyleMap(props.node.style, props.tokens))

const isSelected = computed(() => props.selectedId === props.node.id)
const isLocked = computed(() => props.node.state?.locked === true)
const isHidden = computed(() => props.node.state?.hidden === true)
const isDropHover = computed(() => props.hoverDropId === props.node.id)

function onClick(e: MouseEvent) {
  if (isLocked.value) return
  e.stopPropagation()
  emit('select', props.node.id)
}

function onDragOver(e: DragEvent) {
  // 鍏佽 drop 鍙嶉
  if (e.dataTransfer) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
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
    offsetY: e.clientY - rect.top
  })
}

const isEmptyContainer = computed(
  () => isContainer(props.node.type) && (!props.node.children || props.node.children.length === 0)
)

// 鍐呭眰鐢?render function 瀹炵幇锛岀畝鍖?鎸?type 娓叉煋瀵瑰簲 HTML"
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
      return h('div', undefined, renderChildren(n))
    case 'Card':
      return h('div', undefined, renderChildren(n))
    case 'Heading': {
      const level = Math.max(1, Math.min(6, Number(n.props.level ?? 2)))
      return h(`h${level}`, undefined, String(n.props.text ?? ''))
    }
    case 'Text':
      return h('p', null, String(n.props.text ?? ''))
    case 'Button': {
      const tag = n.props.disabled ? 'button' : 'button'
      return h(
        tag,
        { disabled: !!n.props.disabled, type: 'button' },
        String(n.props.text ?? '')
      )
    }
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

function renderChildren(n: Node) {
  if (!n.children || n.children.length === 0) {
    if (isContainer(n.type)) {
      return h('div', { class: 'pf-empty' }, '鎷栧叆缁勪欢')
    }
    return undefined
  }
  const Self = resolveComponent('NodeRenderer')
  return n.children.map((c) =>
    h(Self, {
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
    @click="onClick"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <Inner :node="node" />
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
.pf-node.is-selected {
  outline: 2px solid #6399ff;
  outline-offset: -2px;
}
.pf-node.is-locked {
  cursor: not-allowed;
}
.pf-node.is-hidden {
  opacity: 0.35;
}
.pf-node.is-drop-hover {
  outline: 2px dashed #ffc864 !important;
  outline-offset: -2px;
  background-color: rgba(255, 200, 100, 0.08);
}
.pf-node.is-empty-container {
  min-height: 40px;
  border: 1px dashed rgba(99, 153, 255, 0.4);
  border-radius: 6px;
  padding: 8px;
  color: #6b7280;
  font-size: 12px;
  align-items: center;
  justify-content: center;
}
.pf-empty {
  text-align: center;
  width: 100%;
}
button {
  font: inherit;
}
</style>
