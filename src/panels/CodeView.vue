<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import {
  exportSingleHtml,
  exportSplitHtml,
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions
} from '../exporters/htmlExporter'
import { toVueSfc } from '../exporters/vueExporter'
import { toReact } from '../exporters/reactExporter'
import { toUniApp } from '../exporters/uniAppExporter'

type Tab = 'html' | 'css' | 'js' | 'vue' | 'react' | 'uniapp'

const project = useProjectStore()
const visible = ref(false)
const activeTab = ref<Tab>('html')
const options = ref<ExportOptions>({ ...DEFAULT_EXPORT_OPTIONS, mode: 'split' })

const htmlExported = computed(() => {
  if (!visible.value) return { html: '', css: '', js: '' }
  try {
    if (options.value.mode === 'single') {
      const single = exportSingleHtml(project.project, project.currentPage.id)
      return { html: single, css: '', js: '' }
    }
    const files = exportSplitHtml(project.project, project.currentPage.id)
    return {
      html: files.find((f) => f.path === 'index.html')?.content ?? '',
      css: files.find((f) => f.path === 'styles.css')?.content ?? '',
      js: files.find((f) => f.path === 'script.js')?.content ?? ''
    }
  } catch (e) {
    return { html: `/* export error: ${(e as Error).message} */`, css: '', js: '' }
  }
})

const vueCode = computed(() => {
  if (!visible.value || activeTab.value !== 'vue') return ''
  try {
    return toVueSfc(project.project, project.currentPage.id)[0].content
  } catch (e) {
    return `/* ${((e as Error).message)} */`
  }
})

const reactCode = computed(() => {
  if (!visible.value || activeTab.value !== 'react') return ''
  try {
    const files = toReact(project.project, project.currentPage.id)
    return files.map((f) => `// === ${f.path} ===\n${f.content}`).join('\n\n')
  } catch (e) {
    return `/* ${((e as Error).message)} */`
  }
})

const uniAppCode = computed(() => {
  if (!visible.value || activeTab.value !== 'uniapp') return ''
  try {
    const files = toUniApp(project.project, project.currentPage.id)
    return files.map((f) => `<!-- === ${f.path} === -->\n${f.content}`).join('\n\n')
  } catch (e) {
    return `/* ${((e as Error).message)} */`
  }
})

const currentCode = computed(() => {
  switch (activeTab.value) {
    case 'html': return htmlExported.value.html
    case 'css': return htmlExported.value.css
    case 'js': return htmlExported.value.js
    case 'vue': return vueCode.value
    case 'react': return reactCode.value
    case 'uniapp': return uniAppCode.value
  }
})

function toggle() {
  visible.value = !visible.value
}

function copy() {
  navigator.clipboard?.writeText(currentCode.value).catch(() => undefined)
}

function exportToDisk() {
  const api = (globalThis as any).window?.pageforge
  if (!api?.export?.saveHtml) {
    alert('导出功能需要桌面环境（window.pageforge.export.saveHtml）')
    return
  }
  const content =
    options.value.mode === 'single'
      ? exportSingleHtml(project.project, project.currentPage.id)
      : ''
  api.export.saveHtml(content || currentCode.value)
}

watch(visible, (v) => {
  if (v) activeTab.value = 'html'
})

defineExpose({ toggle, visible })
</script>

<template>
  <div v-if="visible" class="code-view">
    <div class="cv-header">
      <div class="tabs">
        <button :class="{ active: activeTab === 'html' }" @click="activeTab = 'html'">HTML</button>
        <button
          v-if="options.mode === 'split'"
          :class="{ active: activeTab === 'css' }"
          @click="activeTab = 'css'"
        >CSS</button>
        <button
          v-if="options.mode === 'split'"
          :class="{ active: activeTab === 'js' }"
          @click="activeTab = 'js'"
        >JS</button>
        <button :class="{ active: activeTab === 'vue' }" @click="activeTab = 'vue'">Vue</button>
        <button :class="{ active: activeTab === 'react' }" @click="activeTab = 'react'">React</button>
        <button :class="{ active: activeTab === 'uniapp' }" @click="activeTab = 'uniapp'">uni-app</button>
      </div>
      <div class="cv-actions">
        <label v-if="activeTab === 'html' || activeTab === 'css' || activeTab === 'js'" class="mode-toggle">
          <input type="checkbox" :checked="options.mode === 'single'" @change="options.mode = ($event.target as HTMLInputElement).checked ? 'single' : 'split'" />
          <span>单文件</span>
        </label>
        <button @click="copy" title="复制">复制</button>
        <button @click="exportToDisk" title="导出到磁盘">导出</button>
        <button @click="toggle" title="关闭">×</button>
      </div>
    </div>
    <pre class="code-body"><code>{{ currentCode }}</code></pre>
  </div>
</template>

<style scoped>
.code-view {
  height: 280px;
  flex: 0 0 280px;
  min-height: 180px;
  background: #0b0d12;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.cv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.4);
}
.tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}
.tabs button {
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
}
.tabs button.active {
  background: rgba(99, 153, 255, 0.18);
  color: #6399ff;
}
.cv-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cv-actions button {
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #c2c8d2;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
}
.cv-actions button:hover {
  background: rgba(99, 153, 255, 0.12);
  color: #fff;
}
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8a93a3;
  cursor: pointer;
}
.code-body {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #c2c8d2;
  white-space: pre;
}
</style>
