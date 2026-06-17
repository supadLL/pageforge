<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'
import {
  getComponentDefinition,
  type BreakpointName
} from '@pageforge/schema'
import { schemaToFields, STYLE_FIELDS, type FieldMeta } from './formMeta'

const project = useProjectStore()
const editor = useEditorStore()

const selectedNode = computed(() => {
  const id = editor.selectedNodeId
  if (!id) return null
  return project.findNodeById(id)
})

const definition = computed(() => {
  const n = selectedNode.value
  return n ? getComponentDefinition(n.type) : null
})

const propFields = computed<FieldMeta[]>(() => {
  const def = definition.value
  return def ? schemaToFields(def.propSchema) : []
})

// style 字段分组
const layoutFields = STYLE_FIELDS.filter((f) => f.group === 'layout')
const visualFields = STYLE_FIELDS.filter((f) => f.group === 'visual')
const textFields = STYLE_FIELDS.filter((f) => f.group === 'text')
const spacingFields = STYLE_FIELDS.filter((f) => f.group === 'spacing')

const isResponsive = computed(() => editor.currentBreakpoint !== 'desktop')

// === props 编辑 ===
function onPropChange(key: string, value: unknown) {
  if (!selectedNode.value) return
  project.updateNodeProps(selectedNode.value.id, { [key]: value })
}

// === style 编辑 ===
function onStyleChange(key: string, value: unknown) {
  if (!selectedNode.value) return
  project.updateNodeStyle(
    selectedNode.value.id,
    { [key]: value } as any,
    isResponsive.value ? (editor.currentBreakpoint as BreakpointName) : undefined
  )
}

function getProp(key: string): unknown {
  return selectedNode.value?.props[key]
}
function getStyle(key: string): unknown {
  const n = selectedNode.value
  if (!n) return undefined
  if (isResponsive.value) {
    return n.responsive?.[editor.currentBreakpoint as BreakpointName]?.style?.[key as keyof typeof n.style]
  }
  return (n.style as Record<string, unknown>)[key]
}

// 节点名编辑
function onNameChange(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (selectedNode.value) project.renameNode(selectedNode.value.id, v)
}

function toggleHidden() {
  if (!selectedNode.value) return
  const cur = selectedNode.value.state?.hidden === true
  project.setNodeState(selectedNode.value.id, { hidden: !cur })
}
function toggleLocked() {
  if (!selectedNode.value) return
  const cur = selectedNode.value.state?.locked === true
  project.setNodeState(selectedNode.value.id, { locked: !cur })
}
function onDelete() {
  if (selectedNode.value && selectedNode.value.type !== 'PageRoot') {
    project.removeNode(selectedNode.value.id)
    editor.selectNode(null)
  }
}
</script>

<template>
  <aside class="prop-panel">
    <div class="prop-header">
      <span>属性</span>
      <span class="bp-badge">{{ editor.currentBreakpoint }}</span>
    </div>

    <div v-if="!selectedNode" class="empty">未选中节点</div>

    <div v-else class="prop-body">
      <!-- 基本信息 -->
      <section class="group">
        <div class="group-title">基本信息</div>
        <div class="row">
          <label>类型</label>
          <input :value="selectedNode.type" disabled />
        </div>
        <div class="row">
          <label>名称</label>
          <input :value="selectedNode.name ?? ''" @change="onNameChange" placeholder="节点名" />
        </div>
        <div class="row">
          <label>id</label>
          <input :value="selectedNode.id" disabled class="mono" />
        </div>
        <div class="state-actions">
          <button :class="{ active: selectedNode.state?.hidden }" @click="toggleHidden">
            {{ selectedNode.state?.hidden ? '已隐藏' : '隐藏' }}
          </button>
          <button :class="{ active: selectedNode.state?.locked }" @click="toggleLocked">
            {{ selectedNode.state?.locked ? '已锁定' : '锁定' }}
          </button>
          <button
            v-if="selectedNode.type !== 'PageRoot'"
            class="danger"
            @click="onDelete"
          >删除</button>
        </div>
      </section>

      <!-- 内容属性 -->
      <section v-if="propFields.length > 0" class="group">
        <div class="group-title">内容属性</div>
        <div v-for="f in propFields" :key="f.key" class="row">
          <label>{{ f.label }}</label>
          <input
            v-if="f.control === 'text'"
            :value="String(getProp(f.key) ?? '')"
            @input="onPropChange(f.key, ($event.target as HTMLInputElement).value)"
            :placeholder="f.placeholder"
          />
          <input
            v-else-if="f.control === 'number'"
            type="number"
            :value="Number(getProp(f.key) ?? 0)"
            @input="onPropChange(f.key, Number(($event.target as HTMLInputElement).value))"
          />
          <select
            v-else-if="f.control === 'select'"
            :value="getProp(f.key)"
            @change="onPropChange(f.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="o in f.options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
          </select>
          <label v-else-if="f.control === 'boolean'" class="switch">
            <input
              type="checkbox"
              :checked="getProp(f.key) === true"
              @change="onPropChange(f.key, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ getProp(f.key) === true ? '是' : '否' }}</span>
          </label>
          <input
            v-else
            :value="String(getProp(f.key) ?? '')"
            @input="onPropChange(f.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </section>

      <!-- 布局 -->
      <section class="group">
        <div class="group-title">布局</div>
        <div v-for="f in layoutFields" :key="f.key" class="row">
          <label>{{ f.label }}</label>
          <input
            v-if="f.control === 'text'"
            :value="String(getStyle(f.key) ?? '')"
            @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
          />
          <select
            v-else-if="f.control === 'select'"
            :value="String(getStyle(f.key) ?? '')"
            @change="onStyleChange(f.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">（默认）</option>
            <option v-for="o in f.options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
          </select>
          <input
            v-else
            :value="String(getStyle(f.key) ?? '')"
            @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </section>

      <!-- 视觉 -->
      <section class="group">
        <div class="group-title">外观</div>
        <div v-for="f in visualFields" :key="f.key" class="row">
          <label>{{ f.label }}</label>
          <div class="color-row" v-if="f.control === 'color'">
            <input
              type="color"
              :value="normalizeColor(getStyle(f.key))"
              @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
            />
            <input
              type="text"
              :value="String(getStyle(f.key) ?? '')"
              @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
              placeholder="#fff 或 $colors.primary"
            />
          </div>
          <input
            v-else-if="f.control === 'number'"
            type="number"
            :value="Number(getStyle(f.key) ?? 0)"
            @input="onStyleChange(f.key, Number(($event.target as HTMLInputElement).value))"
          />
          <input
            v-else
            :value="String(getStyle(f.key) ?? '')"
            @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </section>

      <!-- 文字 -->
      <section class="group">
        <div class="group-title">文字</div>
        <div v-for="f in textFields" :key="f.key" class="row">
          <label>{{ f.label }}</label>
          <select
            v-if="f.control === 'select'"
            :value="String(getStyle(f.key) ?? '')"
            @change="onStyleChange(f.key, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">（默认）</option>
            <option v-for="o in f.options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
          </select>
          <input
            v-else
            :value="String(getStyle(f.key) ?? '')"
            @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </section>

      <!-- 间距 -->
      <section class="group">
        <div class="group-title">间距</div>
        <div v-for="f in spacingFields" :key="f.key" class="row">
          <label>{{ f.label }}</label>
          <input
            :value="String(getStyle(f.key) ?? '')"
            @input="onStyleChange(f.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </section>

      <p v-if="isResponsive" class="hint">
        当前编辑 {{ editor.currentBreakpoint }} 断点覆盖样式
      </p>
    </div>
  </aside>
</template>

<script lang="ts">
function normalizeColor(v: unknown): string {
  if (typeof v !== 'string') return '#ffffff'
  if (v.startsWith('#') && (v.length === 7 || v.length === 4)) return v
  // token 引用或关键字色，给个占位
  return '#ffffff'
}
export default { methods: { normalizeColor } }
</script>

<style scoped>
.prop-panel {
  width: 300px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
.prop-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e6e8eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.bp-badge {
  font-size: 11px;
  color: #6399ff;
  background: rgba(99, 153, 255, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
}
.empty {
  padding: 24px 16px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}
.prop-body {
  padding: 8px 0;
}
.group {
  padding: 8px 16px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.group-title {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}
.row label {
  width: 80px;
  color: #8a93a3;
  flex-shrink: 0;
}
.row input,
.row select {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e6e8eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  min-width: 0;
}
.row input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
.color-row {
  display: flex;
  gap: 4px;
  flex: 1;
}
.color-row input[type='color'] {
  width: 32px;
  padding: 0;
  flex: 0 0 auto;
  cursor: pointer;
}
.color-row input[type='text'] {
  flex: 1;
  min-width: 0;
}
.state-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.state-actions button {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #c2c8d2;
  border-radius: 4px;
  cursor: pointer;
}
.state-actions button.active {
  background: rgba(99, 153, 255, 0.18);
  border-color: rgba(99, 153, 255, 0.4);
  color: #6399ff;
}
.state-actions button.danger {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.3);
}
.state-actions button.danger:hover {
  background: rgba(255, 107, 107, 0.12);
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: auto !important;
  color: #e6e8eb !important;
}
.hint {
  padding: 8px 16px;
  font-size: 11px;
  color: #6399ff;
  font-style: italic;
}
</style>
