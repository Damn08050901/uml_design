<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  xml: { type: String, required: true },
  diagramName: { type: String, default: '论文图表' }
})

const emit = defineEmits(['autosave', 'ready', 'error', 'status'])

const iframeRef = ref(null)
const isReady = ref(false)
const isBusy = ref(true)
const currentXml = ref(props.xml)
let pendingExport = null

const iframeSrc = computed(() => {
  return 'https://embed.diagrams.net/?embed=1&proto=json&spin=1&saveAndExit=0&noSaveBtn=1&noExitBtn=1&libraries=1&configure=0'
})

function parseMessage(payload) {
  if (!payload) return null
  if (typeof payload === 'object') return payload
  if (typeof payload !== 'string') return null
  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function isDrawioOrigin(origin) {
  return /diagrams\.net|draw\.io/i.test(String(origin || ''))
}

function postEditor(message) {
  iframeRef.value?.contentWindow?.postMessage(JSON.stringify(message), '*')
}

function handleMessage(event) {
  if (!isDrawioOrigin(event.origin)) return
  const data = parseMessage(event.data)
  if (!data || !data.event) return

  if (data.event === 'init') {
    isReady.value = true
    isBusy.value = false
    postEditor({
      action: 'load',
      xml: props.xml,
      title: props.diagramName,
      autosave: 1,
      modified: 'unsavedChanges'
    })
    emit('ready')
    emit('status', 'ready')
    return
  }

  if (data.event === 'autosave' || data.event === 'save') {
    if (data.xml) {
      currentXml.value = data.xml
      emit('autosave', data.xml)
    }
    return
  }

  if (data.event === 'export') {
    if (pendingExport) {
      pendingExport.resolve(data.data || data.xml || '')
      pendingExport = null
    }
    return
  }

  if (data.event === 'spinner') {
    isBusy.value = !!data.show
    return
  }

  if (data.event === 'error') {
    const error = new Error(data.message || 'draw.io 编辑器加载失败')
    if (pendingExport) {
      pendingExport.reject(error)
      pendingExport = null
    }
    emit('error', error)
  }
}

function exportDiagram(format) {
  if (!isReady.value) return Promise.reject(new Error('编辑器尚未就绪'))
  if (format === 'drawio') return Promise.resolve(currentXml.value)
  if (pendingExport) return Promise.reject(new Error('上一个导出尚未完成'))
  return new Promise((resolve, reject) => {
    pendingExport = { resolve, reject }
    postEditor({
      action: 'export',
      format,
      spinKey: 'exporting',
      message: '正在导出...',
      scale: 2,
      xml: 0,
      transparent: false
    })
  })
}

function getCurrentXml() {
  return currentXml.value
}

defineExpose({ exportDiagram, getCurrentXml })

onMounted(() => {
  emit('status', 'loading')
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (pendingExport) {
    pendingExport.reject(new Error('编辑器已卸载'))
    pendingExport = null
  }
})
</script>

<template>
  <div class="drawio-host">
    <iframe ref="iframeRef" :src="iframeSrc" class="drawio-frame" title="drawio-editor" />
    <div v-if="!isReady || isBusy" class="drawio-overlay">
      <div class="drawio-spinner"></div>
      <p>正在加载可编辑画布...</p>
    </div>
  </div>
</template>

<style scoped>
.drawio-host {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 480px;
  background: #f8fafc;
}

.drawio-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.drawio-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(248, 250, 252, 0.92);
  color: #475569;
  font-size: 13px;
}

.drawio-spinner {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid #dbeafe;
  border-top-color: #2563eb;
  animation: drawio-spin 0.8s linear infinite;
}

@keyframes drawio-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
