<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { getComponentDefinition } from '@pageforge/schema'
import { findParent } from '../editor/treeOps'

/**
 * 右侧详情面板（Step 04 范围内只显示基本信息）
 * Step 05 会基于 propSchema 自动生成完整表单。
 */
const project = useProjectStore()
const editor = useEditorStore()

const selectedNode = computed(() => {
  const id = editor.selectedNodeId
  if (!id) return null
  return project.findNodeById(id)
})

const parentNode = computed(() => {
  const n = selectedNode.value
  if (!n) return null
  return findParent(project.getCurrentRoot(), n.id)
})

const definition = computed(() => {
  const n = selectedNode.value
  return n ? getComponentDefinition(n.type) : null
})
</script>

<template>
  <aside class="detail">
    <div class="detail-header">详情</div>
    <div v-if="!selectedNode" class="empty">未选中节点</div>
    <div v-else class="info">
      <div class="row"><span class="k">类型</span><span class="v">{{ selectedNode.type }}</span></div>
      <div class="row"><span class="k">名称</span><span class="v">{{ selectedNode.name ?? '-' }}</span></div>
      <div class="row"><span class="k">id</span><span class="v mono">{{ selectedNode.id }}</span></div>
      <div class="row">
        <span class="k">分类</span>
        <span class="v">{{ definition?.category ?? '-' }}</span>
      </div>
      <div class="row">
        <span class="k">承载子节点</span>
        <span class="v">{{ definition?.acceptsChildren ? '是' : '否' }}</span>
      </div>
      <div v-if="parentNode" class="row">
        <span class="k">父节点</span><span class="v">{{ parentNode.name ?? parentNode.type }}</span>
      </div>
      <div class="row">
        <span class="k">props 字段</span>
        <span class="v">{{ Object.keys(selectedNode.props).length }}</span>
      </div>
      <div class="row">
        <span class="k">style 字段</span>
        <span class="v">{{ Object.keys(selectedNode.style).length }}</span>
      </div>

      <details class="advanced">
        <summary>props</summary>
        <pre class="json">{{ JSON.stringify(selectedNode.props, null, 2) }}</pre>
      </details>
      <details class="advanced">
        <summary>style</summary>
        <pre class="json">{{ JSON.stringify(selectedNode.style, null, 2) }}</pre>
      </details>

      <p class="hint">属性编辑面板将在 Step 05 实现</p>
    </div>
  </aside>
</template>

<style scoped>
.detail {
  width: 280px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
.detail-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e6e8eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.empty {
  padding: 24px 16px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}
.info {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.k {
  color: #6b7280;
}
.v {
  color: #c2c8d2;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.advanced {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 6px 8px;
}
.advanced summary {
  cursor: pointer;
  font-size: 12px;
  color: #8a93a3;
}
.json {
  margin: 6px 0 0;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #c2c8d2;
  overflow-x: auto;
  white-space: pre-wrap;
}
.hint {
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
  margin-top: 8px;
}
</style>
