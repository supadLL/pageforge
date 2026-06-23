<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Toolbar from './panels/Toolbar.vue'
import ComponentLibrary from './panels/ComponentLibrary.vue'
import LayersPanel from './panels/LayersPanel.vue'
import Canvas from './editor/Canvas.vue'
import PropertyPanel from './panels/PropertyPanel.vue'
import CodeView from './panels/CodeView.vue'
import AIConfigPanel from './panels/ai/AIConfigPanel.vue'

const codeView = ref<InstanceType<typeof CodeView> | null>(null)
const aiPanelVisible = ref(false)

onMounted(() => {
  if (window.pageforge?.app?.ping) {
    window.pageforge.app.ping().catch(() => undefined)
  }
})

function toggleCodeView() {
  codeView.value?.toggle()
}
function toggleAIPanel() {
  aiPanelVisible.value = !aiPanelVisible.value
}
</script>

<template>
  <div class="pageforge">
    <Toolbar @toggle-code="toggleCodeView" @toggle-ai="toggleAIPanel" />
    <div class="body">
      <div class="left-rail">
        <ComponentLibrary />
        <LayersPanel />
      </div>
      <div class="center-pane">
        <Canvas />
        <CodeView ref="codeView" />
      </div>
      <PropertyPanel />
    </div>
    <AIConfigPanel :visible="aiPanelVisible" @close="aiPanelVisible = false" />
  </div>
</template>

<style scoped>
.pageforge {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f1115;
  color: #e6e8eb;
  position: relative;
}
.body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.left-rail {
  display: flex;
  flex-direction: column;
  width: 244px;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
}
.center-pane {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
