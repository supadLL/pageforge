<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { Node } from '@pageforge/schema'
import { isContainer } from '@pageforge/schema'

const props = defineProps({
  node: { type: Object as PropType<Node>, required: true },
  depth: { type: Number, required: true },
  isExpanded: { type: Function as PropType<(id: string) => boolean>, required: true },
  isSelected: { type: Function as PropType<(id: string) => boolean>, required: true },
  displayName: { type: Function as PropType<(n: Node) => string>, required: true }
})

const emit = defineEmits<{
  (e: 'toggle-expand', id: string): void
  (e: 'select', id: string): void
  (e: 'toggle-hidden', n: Node, ev: Event): void
  (e: 'toggle-locked', n: Node, ev: Event): void
  (e: 'rename', n: Node, ev: Event): void
  (e: 'delete', n: Node, ev: Event): void
  (e: 'select-in-child'): void
}>()

const hasChildren = computed(() => isContainer(props.node.type) && (props.node.children?.length ?? 0) > 0)
const expanded = computed(() => props.isExpanded(props.node.id))
const selected = computed(() => props.isSelected(props.node.id))
const hidden = computed(() => props.node.state?.hidden === true)
const locked = computed(() => props.node.state?.locked === true)
const isRoot = computed(() => props.node.type === 'PageRoot')
const showChildren = computed(() => hasChildren.value && expanded.value)

function onClick() {
  emit('select', props.node.id)
}
</script>

<template>
  <div class="layer-node">
    <div
      class="row"
      :class="{ selected }"
      :style="{ paddingLeft: 8 + depth * 14 + 'px' }"
      @click="onClick"
    >
      <span
        class="caret"
        :class="{ expanded: showChildren, invisible: !hasChildren }"
        @click.stop="emit('toggle-expand', node.id)"
      >▶</span>
      <span class="icon" :class="{ 'is-hidden': hidden, 'is-locked': locked }">
        {{ node.type.charAt(0) }}
      </span>
      <input
        class="name"
        :value="displayName(node)"
        @change="emit('rename', node, $event)"
        @click.stop
        :title="node.type"
      />
      <button
        class="action"
        :class="{ active: hidden }"
        @click="emit('toggle-hidden', node, $event)"
        title="隐藏/显示"
      >{{ hidden ? '◐' : '○' }}</button>
      <button
        class="action"
        :class="{ active: locked }"
        @click="emit('toggle-locked', node, $event)"
        title="锁定/解锁"
      >{{ locked ? '🔒' : '🔓' }}</button>
      <button
        v-if="!isRoot"
        class="action danger"
        @click="emit('delete', node, $event)"
        title="删除"
      >×</button>
    </div>
    <div v-if="showChildren">
      <LayerNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :display-name="displayName"
        @toggle-expand="(id: string) => emit('toggle-expand', id)"
        @select="(id: string) => emit('select', id)"
        @toggle-hidden="(n: Node, ev: Event) => emit('toggle-hidden', n, ev)"
        @toggle-locked="(n: Node, ev: Event) => emit('toggle-locked', n, ev)"
        @rename="(n: Node, ev: Event) => emit('rename', n, ev)"
        @delete="(n: Node, ev: Event) => emit('delete', n, ev)"
      />
    </div>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 4px 0;
  font-size: 12px;
  color: #c2c8d2;
  cursor: pointer;
  border-left: 2px solid transparent;
}
.row:hover {
  background: rgba(255, 255, 255, 0.04);
}
.row.selected {
  background: rgba(99, 153, 255, 0.14);
  border-left-color: #6399ff;
  color: #fff;
}
.caret {
  width: 12px;
  font-size: 8px;
  color: #6b7280;
  transition: transform 0.1s ease;
  user-select: none;
}
.caret.expanded {
  transform: rotate(90deg);
}
.caret.invisible {
  visibility: hidden;
}
.icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 153, 255, 0.15);
  color: #6399ff;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.icon.is-hidden {
  opacity: 0.4;
}
.icon.is-locked {
  background: rgba(255, 200, 100, 0.18);
  color: #ffc864;
}
.name {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 0;
}
.name:hover,
.name:focus {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  outline: none;
}
.action {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
}
.action:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e6e8eb;
}
.action.active {
  color: #6399ff;
}
.action.danger:hover {
  color: #ff6b6b;
}
</style>
