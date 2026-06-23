<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { getComponentDefinition, type Node } from '@pageforge/schema'

const project = useProjectStore()
const editor = useEditorStore()

/** 展开状态：编辑器 UI 状态，不写入 Project */
const expanded = ref<Record<string, boolean>>({})

function toggleExpand(id: string) {
  expanded.value[id] = !expanded.value[id]
}

function isExpanded(id: string): boolean {
  // 默认展开
  return expanded.value[id] !== false
}

function displayName(n: Node): string {
  return n.name ?? getComponentDefinition(n.type).label
}

function onSelect(id: string) {
  editor.selectNode(id)
}

function isSelected(id: string): boolean {
  return editor.selectedNodeId === id
}

function toggleHidden(n: Node, e: Event) {
  e.stopPropagation()
  project.setNodeState(n.id, { hidden: !(n.state?.hidden === true) })
}

function toggleLocked(n: Node, e: Event) {
  e.stopPropagation()
  project.setNodeState(n.id, { locked: !(n.state?.locked === true) })
}

function onRename(n: Node, e: Event) {
  const v = (e.target as HTMLInputElement).value
  project.renameNode(n.id, v)
}

function onDelete(n: Node, e: Event) {
  e.stopPropagation()
  if (n.type === 'PageRoot') return
  // 删除前若该节点选中，选中其父节点
  if (editor.selectedNodeId === n.id) {
    const parent = findParent(project.getCurrentRoot(), n.id)
    editor.selectNode(parent?.id ?? null)
  }
  project.removeNode(n.id)
}

// 内联 findParent（避免引入 treeOps 循环引用）
function findParent(root: Node, id: string): Node | null {
  if (!root.children) return null
  for (const c of root.children) {
    if (c.id === id) return root
    const r = findParent(c, id)
    if (r) return r
  }
  return null
}

const root = computed(() => project.getCurrentRoot())
</script>

<template>
  <aside class="layers">
    <div class="layers-header">图层</div>
    <div class="layers-body">
      <LayerNode
        :node="root"
        :depth="0"
        :is-expanded="isExpanded"
        :is-selected="isSelected"
        :display-name="displayName"
        @toggle-expand="toggleExpand"
        @select="onSelect"
        @toggle-hidden="toggleHidden"
        @toggle-locked="toggleLocked"
        @rename="onRename"
        @delete="onDelete"
      />
    </div>
  </aside>
</template>

<script lang="ts">
import LayerNode from './LayerNode.vue'
export default { components: { LayerNode } }
</script>

<style scoped>
.layers {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.layers-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e6e8eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.layers-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
</style>
