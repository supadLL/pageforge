<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import { useHistoryStore } from '../editor/commands/historyStore'

const project = useProjectStore()
const editor = useEditorStore()
const history = useHistoryStore()

const emit = defineEmits<{ (e: 'toggle-code'): void; (e: 'toggle-ai'): void }>()

const nodeCount = computed(() => project.nodeCount)
const selectedLabel = computed(() => {
  const id = editor.selectedNodeId
  if (!id) return '无'
  const n = project.findNodeById(id)
  return n ? (n.name ?? n.type) : '?'
})

function onKey(e: KeyboardEvent) {
  // 不在输入控件内才响应
  const t = e.target as HTMLElement
  const isFormInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')
  if (e.key === 'Delete' && !isFormInput) {
    const id = editor.selectedNodeId
    if (!id) return
    const node = project.findNodeById(id)
    if (!node || node.type === 'PageRoot') return
    e.preventDefault()
    project.removeNode(id)
    editor.selectNode(null)
    return
  }
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) project.redo()
    else project.undo()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    project.redo()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    project.saveCurrentProject()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <header class="toolbar">
    <div class="brand">⚡ PageForge</div>
    <div class="divider" />
    <button class="file-btn" @click="project.newProjectViaDialog()" title="新建项目">新建</button>
    <button class="file-btn" @click="project.openProjectViaDialog()" title="打开项目">打开</button>
    <button class="file-btn primary" @click="project.saveCurrentProject()" title="保存项目 Ctrl+S">保存</button>
    <button class="file-btn" @click="emit('toggle-code')" title="代码视图">代码</button>
    <button class="file-btn" @click="project.openPreviewWindow()" title="预览">预览</button>
    <button class="file-btn" @click="emit('toggle-ai')" title="AI 配置">AI</button>
    <div class="divider" />
    <button
      class="undo-btn"
      :disabled="!history.canUndo"
      @click="project.undo()"
      title="撤销 Ctrl+Z"
    >↶</button>
    <button
      class="undo-btn"
      :disabled="!history.canRedo"
      @click="project.redo()"
      title="重做 Ctrl+Shift+Z"
    >↷</button>
    <span class="hist-count" :class="{ dirty: history.dirty }">
      {{ history.undoCount }}{{ history.dirty ? '*' : '' }}
    </span>
    <div class="divider" />
    <div class="group">
      <span class="label">项目</span>
      <span class="value">{{ project.project.name }}</span>
    </div>
    <div class="divider" />
    <div class="group">
      <span class="label">页面</span>
      <span class="value">{{ project.currentPage.name }}</span>
    </div>
    <div class="divider" />
    <div class="group">
      <span class="label">节点数</span>
      <span class="value">{{ nodeCount }}</span>
    </div>
    <div class="divider" />
    <div class="group">
      <span class="label">选中</span>
      <span class="value">{{ selectedLabel }}</span>
    </div>
    <div class="spacer" />
    <div class="group">
      <span class="label">断点</span>
      <span class="value">{{ editor.currentBreakpoint }}</span>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.3);
  font-size: 12px;
  color: #c2c8d2;
}
.brand {
  font-weight: 700;
  font-size: 14px;
  color: #e6e8eb;
}
.divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.08);
}
.undo-btn {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #c2c8d2;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}
.undo-btn:hover:not(:disabled) {
  background: rgba(99, 153, 255, 0.12);
  border-color: rgba(99, 153, 255, 0.3);
}
.undo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.file-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #c2c8d2;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.file-btn:hover {
  background: rgba(99, 153, 255, 0.12);
  border-color: rgba(99, 153, 255, 0.3);
  color: #fff;
}
.file-btn.primary {
  background: #e0321c;
  border-color: #e0321c;
  color: #fff;
}
.file-btn.primary:hover {
  background: #c92a16;
}
.hist-count {
  font-size: 11px;
  color: #6b7280;
  min-width: 24px;
}
.hist-count.dirty {
  color: #ffc864;
}
.group {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.label {
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.value {
  color: #e6e8eb;
  font-weight: 500;
}
.spacer {
  flex: 1;
}
</style>
