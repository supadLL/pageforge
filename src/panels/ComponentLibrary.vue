<script setup lang="ts">
import { computed } from 'vue'
import { MVP_COMPONENT_TYPES, getComponentDefinition, type ComponentType } from '@pageforge/schema'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'

/**
 * 组件库面板
 * 支持点击添加与拖拽到画布（docs/steps/08）。
 */
const project = useProjectStore()
const editor = useEditorStore()

const components = computed(() =>
  MVP_COMPONENT_TYPES.filter((t) => t !== 'PageRoot').map((type) => {
    const def = getComponentDefinition(type)
    return { type, label: def.label, category: def.category }
  })
)

function addComponent(type: ComponentType) {
  const newNode = project.addNode(type, editor.selectedNodeId ?? undefined)
  editor.selectNode(newNode.id)
}

function onDragStart(e: DragEvent, type: ComponentType) {
  if (!e.dataTransfer) return
  // 用 mime 标记来源是组件库，payload 是组件 type
  e.dataTransfer.setData('application/x-pageforge-component', type)
  e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="component-lib">
    <div class="lib-header">组件库</div>
    <div class="lib-grid">
      <button
        v-for="c in components"
        :key="c.type"
        class="lib-item"
        draggable="true"
        @click="addComponent(c.type)"
        @dragstart="onDragStart($event, c.type)"
        :title="`点击或拖拽添加 ${c.label}`"
      >
        <span class="lib-icon">{{ c.label.charAt(0) }}</span>
        <span class="lib-label">{{ c.label }}</span>
      </button>
    </div>
    <div class="lib-hint">点击添加，或拖拽到画布容器内</div>
  </aside>
</template>

<style scoped>
.component-lib {
  flex: 1;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.lib-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e6e8eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.lib-grid {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.lib-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: #c2c8d2;
  font-size: 12px;
  cursor: grab;
  transition: all 0.15s ease;
}
.lib-item:hover {
  background: rgba(99, 153, 255, 0.12);
  border-color: rgba(99, 153, 255, 0.4);
  color: #fff;
}
.lib-item:active {
  cursor: grabbing;
}
.lib-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(99, 153, 255, 0.18);
  color: #6399ff;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}
.lib-label {
  font-size: 11px;
}
.lib-hint {
  padding: 8px 12px;
  font-size: 11px;
  color: #6b7280;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  line-height: 1.4;
}
</style>
