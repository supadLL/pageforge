<script setup lang="ts">
import { computed } from 'vue'
import { MVP_COMPONENT_TYPES, getComponentDefinition, type ComponentType } from '@pageforge/schema'
import { useProjectStore } from '../stores/project'
import { useEditorStore } from '../stores/editor'

const project = useProjectStore()
const editor = useEditorStore()

const categoryLabel: Record<string, string> = {
  layout: '布局',
  basic: '基础',
  form: '表单',
  data: '数据',
  navigation: '导航',
  feedback: '反馈'
}

const categoryOrder = ['layout', 'basic', 'form', 'data', 'navigation', 'feedback']

const iconMap: Partial<Record<ComponentType, string>> = {
  Container: '□',
  Card: '▣',
  BackgroundPanel: '▧',
  GlassPanel: '◱',
  GradientCard: '◆',
  HeroBlock: 'H',
  Heading: 'T',
  Text: '¶',
  Button: 'B',
  Image: '▥',
  Badge: '●',
  Avatar: 'A',
  FeatureTile: '✦',
  Input: 'I',
  SearchBox: '⌕',
  Divider: '─',
  StatsCard: '9',
  PricingCard: '$',
  ProgressBar: '%',
  Navbar: 'N',
  Tabs: '≡',
  Sidebar: 'S'
}

const components = computed(() =>
  MVP_COMPONENT_TYPES.filter((type) => type !== 'PageRoot').map((type) => {
    const def = getComponentDefinition(type)
    return {
      type,
      label: def.label,
      category: def.category,
      icon: iconMap[type] ?? type.charAt(0)
    }
  })
)

const groups = computed(() =>
  categoryOrder
    .map((category) => ({
      category,
      label: categoryLabel[category] ?? category,
      items: components.value.filter((item) => item.category === category)
    }))
    .filter((group) => group.items.length > 0)
)

function addComponent(type: ComponentType) {
  const count = project.getCurrentRoot().children?.length ?? 0
  const newNode = project.addNode(type, project.getCurrentRoot().id, undefined, {
    position: 'absolute',
    left: `${48 + (count % 6) * 36}px`,
    top: `${48 + Math.floor(count / 6) * 36}px`,
    margin: '0'
  })
  editor.selectNode(newNode.id)
}

function onDragStart(e: DragEvent, type: ComponentType) {
  if (!e.dataTransfer) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  ;(window as any).__pfDragComponent = type
  ;(window as any).__pfDragOffset = {
    x: Math.min(18, Math.max(0, e.clientX - rect.left)),
    y: Math.min(18, Math.max(0, e.clientY - rect.top))
  }
  e.dataTransfer.setData('application/x-pageforge-component', type)
  e.dataTransfer.effectAllowed = 'copy'
}

function onDragEnd() {
  ;(window as any).__pfDragComponent = undefined
  ;(window as any).__pfDragOffset = undefined
}
</script>

<template>
  <aside class="component-lib">
    <div class="lib-header">
      <span>组件</span>
      <span class="lib-count">{{ components.length }}</span>
    </div>
    <div class="lib-scroll">
      <section v-for="group in groups" :key="group.category" class="lib-group">
        <div class="group-title">{{ group.label }}</div>
        <div class="lib-grid">
          <button
            v-for="c in group.items"
            :key="c.type"
            class="lib-item"
            draggable="true"
            @click="addComponent(c.type)"
            @dragstart="onDragStart($event, c.type)"
            @dragend="onDragEnd"
            :title="c.label"
          >
            <span class="lib-icon">{{ c.icon }}</span>
            <span class="lib-label">{{ c.label }}</span>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.component-lib {
  flex: 0 0 340px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #10151d;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.lib-header {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  color: #eef2f7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.lib-count {
  min-width: 24px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.2);
  color: #93c5fd;
  font-size: 11px;
}
.lib-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.lib-group + .lib-group {
  margin-top: 16px;
}
.group-title {
  margin: 0 0 8px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
}
.lib-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.lib-item {
  height: 76px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #dbe4ef;
  cursor: grab;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}
.lib-item:hover {
  transform: translateY(-1px);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.22), rgba(255, 255, 255, 0.05));
  border-color: rgba(96, 165, 250, 0.55);
}
.lib-item:active {
  cursor: grabbing;
  transform: translateY(0);
}
.lib-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #bfdbfe;
  background: rgba(37, 99, 235, 0.22);
  font-size: 13px;
  font-weight: 900;
}
.lib-label {
  width: 100%;
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
