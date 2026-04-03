<script setup>
import { computed, ref, watch } from 'vue'
import { saveAs } from 'file-saver'
import DrawioEmbed from './DrawioEmbed.vue'
import { UML_TEMPLATES } from '../utils/diagramTemplates.js'
import {
  AI_PRESETS,
  applyAiPreset,
  generateDiagramSpecWithAi,
  loadDiagramAiSettings,
  saveDiagramAiSettings
} from '../utils/diagramAi.js'

const props = defineProps({
  diagramType: { type: String, required: true },
  pageTitle: { type: String, required: true },
  pageIcon: { type: String, default: '🧩' },
  hintText: { type: String, required: true },
  defaultCaptionTitle: { type: String, required: true },
  helperText: { type: String, default: '支持可编辑画布、自动布局与 AI 生成' }
})

const spec = ref('')
const lastAppliedSpec = ref('')
const editorXml = ref('')
const editorRevision = ref(0)
const drawioRef = ref(null)
const showExportMenu = ref(false)
const toast = ref({ show: false, msg: '', type: 'success' })
const renderError = ref('')
const canvasReady = ref(false)
const canvasBusy = ref(false)

const chapterNo = ref(3)
const figureNo = ref(1)
const captionTitle = ref(props.defaultCaptionTitle)

const showAiPanel = ref(false)
const showAiConfig = ref(false)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiSettings = ref(loadDiagramAiSettings())
let buildDiagramDrawioXmlFn = null

function showToast(msg, type = 'success') {
  toast.value = { show: true, msg, type }
  window.setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

function buildCaption() {
  const title = captionTitle.value.trim() || props.defaultCaptionTitle
  return `图${chapterNo.value}-${figureNo.value} ${title}`
}

function exportBaseName() {
  const title = (captionTitle.value.trim() || props.defaultCaptionTitle)
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
  return `fig${chapterNo.value}-${figureNo.value}-${title}`
}

const canvasDirty = computed(() => spec.value.trim() !== lastAppliedSpec.value.trim())

function resetTemplate() {
  spec.value = UML_TEMPLATES[props.diagramType] || ''
  captionTitle.value = props.defaultCaptionTitle
  showToast('已恢复当前图模板')
}

async function applyToCanvas() {
  if (!spec.value.trim()) {
    showToast('请先输入图定义', 'warn')
    return
  }
  canvasBusy.value = true
  canvasReady.value = false
  renderError.value = ''
  showExportMenu.value = false
  try {
    if (!buildDiagramDrawioXmlFn) {
      const mod = await import('../utils/umlDrawioBuilder.js')
      buildDiagramDrawioXmlFn = mod.buildDiagramDrawioXml
    }
    const xml = await buildDiagramDrawioXmlFn(props.diagramType, spec.value, buildCaption())
    editorXml.value = xml
    editorRevision.value += 1
    lastAppliedSpec.value = spec.value
    showToast('已同步到可编辑画布')
  } catch (error) {
    renderError.value = error.message || '生成画布失败'
    showToast(renderError.value, 'error')
  } finally {
    canvasBusy.value = false
  }
}

function applyThesisStyle() {
  showToast('当前默认已按论文黑白风格生成')
}

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(buildCaption())
    showToast('图注已复制')
  } catch {
    showToast('复制失败，请手动复制', 'warn')
  }
}

function saveAiConfig() {
  saveDiagramAiSettings(aiSettings.value)
  showAiConfig.value = false
  showToast('AI 配置已保存到浏览器本地')
}

function changeAiPreset(presetId) {
  aiSettings.value = applyAiPreset(presetId, aiSettings.value)
}

async function aiGenerate() {
  if (!aiPrompt.value.trim()) {
    showToast('请输入系统描述', 'warn')
    return
  }
  aiLoading.value = true
  try {
    const result = await generateDiagramSpecWithAi({
      diagramType: props.diagramType,
      userPrompt: aiPrompt.value,
      settings: aiSettings.value
    })
    spec.value = result
    saveDiagramAiSettings(aiSettings.value)
    showAiPanel.value = false
    await applyToCanvas()
    showToast('AI 生成成功')
  } catch (error) {
    showToast(`AI 生成失败: ${error.message}`, 'error')
  } finally {
    aiLoading.value = false
  }
}

function handleAutosave(xml) {
  editorXml.value = xml
}

function handleCanvasReady() {
  canvasReady.value = true
}

function handleCanvasError(error) {
  renderError.value = error.message || '画布加载失败'
  showToast(renderError.value, 'error')
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return response.blob()
}

async function exportPayloadToBlob(payload, fallbackMime) {
  const text = String(payload || '')
  if (text.startsWith('data:')) return dataUrlToBlob(text)
  return new Blob([text], { type: fallbackMime })
}

function convertPngDataUrlToJpeg(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('浏览器不支持 JPEG 转换'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    image.onerror = () => reject(new Error('PNG 转换 JPEG 失败'))
    image.src = dataUrl
  })
}

async function exportDiagram(type) {
  showExportMenu.value = false
  if (!drawioRef.value) {
    showToast('画布尚未准备好', 'warn')
    return
  }
  try {
    if (type === 'drawio') {
      const xml = await drawioRef.value.exportDiagram('drawio')
      saveAs(new Blob([xml], { type: 'application/xml' }), `${exportBaseName()}.drawio`)
      showToast('已导出 draw.io 文件')
      return
    }
    if (type === 'jpeg') {
      const pngDataUrl = await drawioRef.value.exportDiagram('png')
      const jpegDataUrl = await convertPngDataUrlToJpeg(pngDataUrl)
      saveAs(await dataUrlToBlob(jpegDataUrl), `${exportBaseName()}.jpg`)
      showToast('已导出 JPG')
      return
    }
    const dataUrl = await drawioRef.value.exportDiagram(type)
    const ext = type === 'svg' ? 'svg' : 'png'
    const mime = type === 'svg' ? 'image/svg+xml' : 'image/png'
    saveAs(await exportPayloadToBlob(dataUrl, mime), `${exportBaseName()}.${ext}`)
    showToast(`已导出 ${ext.toUpperCase()}`)
  } catch (error) {
    showToast(`导出失败: ${error.message}`, 'error')
  }
}

watch(() => props.diagramType, async () => {
  spec.value = UML_TEMPLATES[props.diagramType] || ''
  captionTitle.value = props.defaultCaptionTitle
  lastAppliedSpec.value = ''
  await applyToCanvas()
}, { immediate: true })
</script>

<template>
  <div class="diagram-page">
    <div class="diagram-left">
      <div class="diagram-left-header">
        <span class="title">{{ pageIcon }} {{ pageTitle }}</span>
        <div class="left-actions">
          <button class="btn-sm" @click="applyThesisStyle">论文风格</button>
          <button class="btn-sm" @click="resetTemplate">恢复模板</button>
          <button class="btn-sm btn-primary" @click="applyToCanvas">应用到画布</button>
        </div>
      </div>

      <div class="paper-note">
        <span class="paper-tag">最佳实践</span>
        <span class="paper-text">画布使用 draw.io 编辑能力，初始排版按自动布局生成，再支持自由拖拽微调。</span>
      </div>

      <div class="caption-box">
        <div class="caption-row">
          <label>章节</label>
          <input type="number" v-model.number="chapterNo" min="1" />
          <label>序号</label>
          <input type="number" v-model.number="figureNo" min="1" />
        </div>
        <div class="caption-row">
          <label>标题</label>
          <input class="title-input" v-model="captionTitle" placeholder="图标题" />
        </div>
        <div class="caption-preview">{{ buildCaption() }}</div>
        <button class="btn-sm" @click="copyCaption">复制图注</button>
      </div>

      <div class="hint-box">
        <p class="hint-title">输入规则</p>
        <p>{{ hintText }}</p>
      </div>

      <div class="sync-bar" :class="{ dirty: canvasDirty }">
        <span>{{ canvasDirty ? '文本已修改，尚未同步到画布' : '文本与画布已同步' }}</span>
        <div class="sync-actions">
          <button class="btn-link" @click="showAiPanel = !showAiPanel; showAiConfig = false">AI生成</button>
          <button class="btn-link" @click="showAiConfig = !showAiConfig; showAiPanel = true">模型配置</button>
        </div>
      </div>

      <div v-if="showAiPanel" class="ai-panel">
        <div class="ai-panel-header">
          <span class="ai-panel-title">AI 智能生成</span>
          <button class="btn-icon" @click="showAiPanel = false">✕</button>
        </div>

        <div v-if="showAiConfig" class="ai-config">
          <div class="ai-config-row">
            <label>模型预设</label>
            <select :value="aiSettings.presetId" @change="changeAiPreset($event.target.value)">
              <option v-for="preset in AI_PRESETS" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
            </select>
          </div>
          <div class="ai-config-row">
            <label>API地址</label>
            <input v-model="aiSettings.baseUrl" placeholder="https://api.longcat.chat/openai" />
          </div>
          <div class="ai-config-row">
            <label>接口路径</label>
            <input v-model="aiSettings.endpointPath" placeholder="/chat/completions" />
          </div>
          <div class="ai-config-row">
            <label>API Key</label>
            <input v-model="aiSettings.apiKey" type="password" placeholder="只保存在浏览器本地" />
          </div>
          <div class="ai-config-row">
            <label>模型</label>
            <input v-model="aiSettings.model" placeholder="LongCat-Flash-Thinking" />
          </div>
          <div class="ai-config-row">
            <label>温度</label>
            <input v-model.number="aiSettings.temperature" type="number" min="0" max="1" step="0.1" />
          </div>
          <button class="btn-sm btn-primary" @click="saveAiConfig">保存配置</button>
        </div>

        <textarea
          v-model="aiPrompt"
          class="ai-textarea"
          rows="6"
          placeholder="描述你的系统、业务流程或结构层次，AI 会直接生成当前图类型的 DSL。"
        ></textarea>
        <div class="ai-footer">
          <span class="ai-hint">内置 LongCat / GLM-4.7 预设，密钥只存在浏览器本地。</span>
          <button class="btn-sm btn-primary" @click="aiGenerate" :disabled="aiLoading">
            {{ aiLoading ? '生成中...' : '开始生成' }}
          </button>
        </div>
      </div>

      <textarea v-model="spec" class="diagram-editor" spellcheck="false"></textarea>
    </div>

    <div class="diagram-right">
      <div class="diagram-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">可编辑画布</span>
          <span class="toolbar-hint">{{ helperText }}</span>
        </div>
        <div class="toolbar-right">
          <span class="canvas-status" :class="{ ready: canvasReady }">
            {{ canvasBusy ? '排版中' : canvasReady ? '画布已就绪' : '等待画布' }}
          </span>
          <div class="dropdown-wrap">
            <button class="btn-export" @click="exportDiagram('png')" :disabled="!canvasReady">导出PNG</button>
            <button class="btn-export-more" @click="showExportMenu = !showExportMenu" :disabled="!canvasReady">▾</button>
            <div v-if="showExportMenu" class="dropdown-panel">
              <div class="export-item" @click="exportDiagram('png')">PNG</div>
              <div class="export-item" @click="exportDiagram('jpeg')">JPG</div>
              <div class="export-item" @click="exportDiagram('svg')">SVG</div>
              <div class="export-divider"></div>
              <div class="export-item" @click="exportDiagram('drawio')">Draw.io XML</div>
            </div>
          </div>
        </div>
      </div>

      <div class="canvas-note">
        <span>支持缩放、分组、连接点、自动对齐、图形库与原生 draw.io 画布操作。</span>
      </div>

      <div class="diagram-canvas">
        <div v-if="renderError" class="render-error">{{ renderError }}</div>
        <DrawioEmbed
          v-else-if="editorXml"
          :key="editorRevision"
          ref="drawioRef"
          :xml="editorXml"
          :diagram-name="exportBaseName()"
          @autosave="handleAutosave"
          @ready="handleCanvasReady"
          @error="handleCanvasError"
        />
        <div v-else class="placeholder">请输入内容并应用到画布</div>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.diagram-page { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.diagram-left {
  width: 430px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}
.diagram-left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.title { font-size: 14px; font-weight: 700; color: #0f172a; }
.left-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.btn-sm, .btn-link, .btn-export, .btn-export-more {
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-sm {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  background: #fff;
}
.btn-sm:hover { background: #f8fafc; }
.btn-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}
.paper-note, .caption-box, .hint-box, .ai-panel {
  margin: 10px 12px 0;
  padding: 10px;
  border-radius: 10px;
}
.paper-note, .hint-box {
  border: 1px solid #dbeafe;
  background: #f8fbff;
}
.paper-note { display: flex; gap: 8px; align-items: center; }
.paper-tag {
  min-width: 68px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.paper-text, .hint-box p { font-size: 12px; color: #334155; line-height: 1.6; }
.hint-title { font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
.caption-box {
  border: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.caption-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; }
.caption-row input, .ai-config-row input, .ai-config-row select {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 12px;
}
.caption-row input { width: 70px; }
.caption-row .title-input { flex: 1; width: auto; }
.caption-preview {
  padding: 8px 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 12px;
  color: #0f172a;
}
.sync-bar {
  margin: 10px 12px 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #475569;
}
.sync-bar.dirty {
  border-color: #fbbf24;
  background: #fffbeb;
  color: #92400e;
}
.sync-actions { display: flex; gap: 8px; }
.btn-link {
  border: none;
  background: transparent;
  color: #2563eb;
  padding: 0;
}
.ai-panel {
  border: 1px solid #dbeafe;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ai-panel-title { font-size: 13px; font-weight: 700; color: #0f172a; }
.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: #e2e8f0;
  cursor: pointer;
}
.ai-config {
  display: grid;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #dbeafe;
}
.ai-config-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #475569;
}
.ai-textarea, .diagram-editor {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 12px;
  font-family: 'Consolas', 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.7;
  background: #fff;
  resize: none;
}
.ai-textarea { min-height: 120px; }
.diagram-editor {
  flex: 1;
  min-height: 0;
  margin: 10px 12px 12px;
  background: #f8fafc;
}
.ai-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.ai-hint { font-size: 11px; color: #64748b; line-height: 1.5; }

.diagram-right { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.diagram-toolbar, .canvas-note {
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.diagram-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-title { font-size: 14px; font-weight: 700; color: #0f172a; }
.toolbar-hint, .canvas-note { font-size: 12px; color: #64748b; }
.toolbar-right { display: flex; align-items: center; gap: 10px; }
.canvas-status {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
}
.canvas-status.ready {
  background: #dcfce7;
  color: #166534;
}
.dropdown-wrap { position: relative; display: flex; }
.btn-export {
  padding: 7px 12px;
  border: 1px solid #2563eb;
  border-right: none;
  background: #2563eb;
  color: #fff;
}
.btn-export-more {
  padding: 7px 8px;
  border: 1px solid #2563eb;
  background: #1d4ed8;
  color: #fff;
}
.dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 140px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
  overflow: hidden;
  z-index: 20;
}
.export-item {
  padding: 10px 12px;
  font-size: 12px;
  cursor: pointer;
}
.export-item:hover { background: #f8fafc; }
.export-divider { height: 1px; background: #e2e8f0; }

.diagram-canvas {
  flex: 1;
  min-height: 0;
  background: #f1f5f9;
}
.render-error, .placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 14px;
}
.render-error { color: #b91c1c; }

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
}
.toast-success { background: #166534; }
.toast-warn { background: #92400e; }
.toast-error { background: #b91c1c; }

@media (max-width: 1100px) {
  .diagram-page { flex-direction: column; }
  .diagram-left {
    width: 100%;
    min-width: 0;
    max-height: 55vh;
  }
}
</style>
