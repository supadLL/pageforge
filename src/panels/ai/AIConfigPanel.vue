<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  type AIProviderConfig,
  type AIProviderName,
  PROVIDER_DEFAULTS
} from '@pageforge/schema'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const config = ref<AIProviderConfig>({ ...PROVIDER_DEFAULTS.glm })
const hasKey = ref(false)
const encryptionAvailable = ref(false)
const providers = ref<AIProviderName[]>(['glm', 'openai', 'claude'])
const saving = ref(false)
const testing = ref(false)
const testResult = ref<string | null>(null)

const api = computed(() => (globalThis as any).window?.pageforge?.ai)

onMounted(async () => {
  if (!api.value) return
  try {
    const [cfg, providersList, key, enc] = await Promise.all([
      api.value.getConfig(),
      api.value.listProviders(),
      api.value.hasApiKey(),
      api.value.isEncryptionAvailable()
    ])
    config.value = cfg
    providers.value = providersList
    hasKey.value = key
    encryptionAvailable.value = enc
  } catch (e) {
    console.error('AI config load failed', e)
  }
})

async function onProviderChange(name: AIProviderName) {
  config.value = { ...PROVIDER_DEFAULTS[name] }
  hasKey.value = await api.value?.hasApiKey(name)
}

async function saveConfig() {
  if (!api.value) return
  saving.value = true
  try {
    await api.value.setConfig(config.value)
  } finally {
    saving.value = false
  }
}

async function setKey() {
  if (!api.value) return
  // 简化：用 prompt 输入。真实场景应主进程 secure input
  const key = (globalThis as any).prompt(`输入 ${config.value.name} 的 API Key（将加密保存）`)
  if (!key) return
  const r = await api.value.setApiKey(config.value.name, key)
  if (r.ok) {
    hasKey.value = true
  } else {
    alert(r.reason ?? '设置失败')
  }
}

async function testConnection() {
  if (!api.value) return
  testing.value = true
  testResult.value = null
  try {
    const r = await api.value.chat({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 16
    })
    testResult.value = `✓ ${r.content.slice(0, 60)}`
  } catch (e) {
    testResult.value = `✗ ${(e as Error).message}`
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div v-if="props.visible" class="ai-panel">
    <div class="ai-header">
      <span>AI 配置</span>
      <button @click="emit('close')" title="关闭">×</button>
    </div>
    <div class="ai-body">
      <div v-if="!api" class="hint">桌面环境不可用（无 window.pageforge.ai）</div>
      <template v-else>
        <div class="row">
          <label>Provider</label>
          <select :value="config.name" @change="onProviderChange(($event.target as HTMLSelectElement).value as AIProviderName)">
            <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="row">
          <label>Base URL</label>
          <input v-model="config.baseUrl" />
        </div>
        <div class="row">
          <label>Model</label>
          <input v-model="config.model" />
        </div>
        <div class="row">
          <label>Temperature</label>
          <input type="number" step="0.1" min="0" max="2" v-model.number="config.temperature" />
        </div>
        <div class="row">
          <label>Max Tokens</label>
          <input type="number" v-model.number="config.maxTokens" />
        </div>

        <div class="row">
          <label>API Key</label>
          <div class="key-status">
            <span class="dot" :class="{ ok: hasKey }"></span>
            <span>{{ hasKey ? '已设置' : '未设置' }}</span>
            <button @click="setKey">设置 Key</button>
          </div>
        </div>

        <div v-if="!encryptionAvailable" class="warn">
          ⚠ safeStorage 不可用，Key 无法加密保存
        </div>

        <div class="actions">
          <button :disabled="saving" @click="saveConfig">{{ saving ? '保存中…' : '保存配置' }}</button>
          <button :disabled="testing || !hasKey" @click="testConnection">
            {{ testing ? '测试中…' : '测试连接' }}
          </button>
        </div>
        <div v-if="testResult" class="test-result">{{ testResult }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  position: absolute;
  top: 44px;
  right: 0;
  width: 320px;
  height: calc(100vh - 44px);
  background: #14161c;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 20;
}
.ai-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e6e8eb;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.ai-header button {
  background: transparent;
  border: none;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
}
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.hint {
  color: #6b7280;
  font-size: 12px;
  text-align: center;
  padding: 24px 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}
.row label {
  width: 90px;
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
.key-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}
.dot.ok {
  background: #4ade80;
}
.key-status button {
  margin-left: auto;
  padding: 3px 10px;
  background: rgba(99, 153, 255, 0.12);
  border: 1px solid rgba(99, 153, 255, 0.3);
  color: #6399ff;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
}
.warn {
  padding: 8px;
  background: rgba(255, 200, 100, 0.1);
  border: 1px solid rgba(255, 200, 100, 0.3);
  color: #ffc864;
  font-size: 11px;
  border-radius: 4px;
  margin-bottom: 10px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.actions button {
  flex: 1;
  padding: 6px;
  background: #e0321c;
  border: none;
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}
.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.actions button:last-child {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #c2c8d2;
}
.test-result {
  margin-top: 8px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #c2c8d2;
  word-break: break-all;
}
</style>
