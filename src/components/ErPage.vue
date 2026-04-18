<script setup>
import { computed, ref, watch } from 'vue'
import { saveAs } from 'file-saver'
import DrawioEmbed from './DrawioEmbed.vue'
import { parseSQL } from '../utils/sqlParser.js'
import { detectRelations } from '../utils/aiRelation.js'
import { autoFillComments } from '../utils/autoTranslate.js'
import {
  AI_PRESETS,
  LONGCAT_MODELS,
  applyAiPreset,
  generateDiagramSpecWithAi,
  loadDiagramAiSettings,
  saveDiagramAiSettings
} from '../utils/diagramAi.js'
import { convertPngDataUrlToJpeg, exportPayloadToBlob } from '../utils/drawioClientExport.js'

const DEMO_SQL = `CREATE TABLE user (
  id bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  username varchar(50) NOT NULL COMMENT '用户名',
  password varchar(100) NOT NULL COMMENT '密码',
  name varchar(100) NULL COMMENT '真实姓名',
  phone varchar(20) NULL COMMENT '手机号',
  role_code varchar(20) NOT NULL DEFAULT 'USER' COMMENT '角色编码',
  status int NOT NULL DEFAULT 0 COMMENT '状态',
  create_time datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='用户表';

CREATE TABLE lost_item (
  id bigint NOT NULL AUTO_INCREMENT COMMENT '失物ID',
  title varchar(100) NOT NULL COMMENT '标题',
  user_id bigint NOT NULL COMMENT '发布用户ID',
  category_id bigint NULL COMMENT '分类ID',
  status int NOT NULL DEFAULT 0 COMMENT '状态',
  create_time datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (id),
  CONSTRAINT fk_lost_user FOREIGN KEY (user_id) REFERENCES user(id)
) ENGINE=InnoDB COMMENT='失物信息表';

CREATE TABLE item_category (
  id bigint NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  name varchar(50) NOT NULL COMMENT '分类名称',
  sort int NULL DEFAULT 0 COMMENT '排序号',
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='物品分类表';`

const sqlInput = ref(DEMO_SQL)
const parsed = ref(null)
const parseError = ref('')
const editorXml = ref('')
const editorRevision = ref(0)
const lastAppliedSignature = ref('')
const drawioRef = ref(null)
const fileInput = ref(null)
const showExportMenu = ref(false)
const showAiPanel = ref(false)
const showAiConfig = ref(false)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiSettings = ref(loadDiagramAiSettings())
const canvasReady = ref(false)
const canvasBusy = ref(false)
const renderError = ref('')
const showAttrs = ref(true)
const toast = ref({ show: false, msg: '', type: 'success' })

const chapterNo = ref(3)
const figureNo = ref(1)
const captionTitle = ref('系统E-R图')

let debounceTimer = null
let buildErDrawioXmlFn = null

function showToast(msg, type = 'success') {
  toast.value = { show: true, msg, type }
  window.setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

function buildCaption() {
  const title = captionTitle.value.trim() || '系统E-R图'
  return `图${chapterNo.value}-${figureNo.value} ${title}`
}

function exportBaseName() {
  const title = (captionTitle.value.trim() || '系统E-R图')
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
  return `fig${chapterNo.value}-${figureNo.value}-${title}`
}

const tableCount = computed(() => parsed.value?.tables?.length || 0)
const relCount = computed(() => parsed.value?.relationships?.length || 0)

const canvasSignature = computed(() => JSON.stringify({
  tables: parsed.value?.tables || [],
  relationships: parsed.value?.relationships || [],
  showAttrs: showAttrs.value,
  caption: buildCaption()
}))

const canvasDirty = computed(() => {
  if (!parsed.value) return false
  return canvasSignature.value !== lastAppliedSignature.value
})

async function ensureBuilder() {
  if (!buildErDrawioXmlFn) {
    const mod = await import('../utils/erDrawioBuilder.js')
    buildErDrawioXmlFn = mod.buildErDrawioXml
  }
}

async function applyToCanvas() {
  if (!parsed.value) {
    showToast('请先输入有效 SQL', 'warn')
    return
  }
  canvasBusy.value = true
  canvasReady.value = false
  renderError.value = ''
  showExportMenu.value = false
  try {
    await ensureBuilder()
    editorXml.value = await buildErDrawioXmlFn({
      parsed: parsed.value,
      diagramName: buildCaption(),
      showAttrs: showAttrs.value
    })
    editorRevision.value += 1
    lastAppliedSignature.value = canvasSignature.value
    showToast('已同步到可编辑画布')
  } catch (error) {
    renderError.value = error.message || 'ER 画布生成失败'
    showToast(renderError.value, 'error')
  } finally {
    canvasBusy.value = false
  }
}

async function parseSqlText(autoApply = false) {
  try {
    const result = parseSQL(sqlInput.value)
    parseError.value = ''
    parsed.value = result.tables.length > 0 ? result : null
    if (!parsed.value) {
      editorXml.value = ''
      renderError.value = ''
      return
    }
    if (autoApply) {
      await applyToCanvas()
    }
  } catch (error) {
    parsed.value = null
    parseError.value = error.message || 'SQL 解析失败'
    editorXml.value = ''
  }
}

watch(sqlInput, () => {
  clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    parseSqlText(false)
  }, 500)
}, { immediate: true })

watch(showAttrs, () => {
  if (!parsed.value) return
})

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(buildCaption())
    showToast('图注已复制')
  } catch {
    showToast('复制失败，请手动复制', 'warn')
  }
}

function triggerFileUpload() {
  fileInput.value?.click()
}

function isValidUtf8(buffer) {
  const bytes = new Uint8Array(buffer)
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    let extraBytes = 0
    if (b === 0xEF && bytes[i + 1] === 0xBB && bytes[i + 2] === 0xBF) {
      i += 3
      continue
    }
    if (b <= 0x7F) {
      i++
      continue
    } else if ((b & 0xE0) === 0xC0) extraBytes = 1
    else if ((b & 0xF0) === 0xE0) extraBytes = 2
    else if ((b & 0xF8) === 0xF0) extraBytes = 3
    else return false
    for (let j = 1; j <= extraBytes; j++) {
      if (i + j >= bytes.length || (bytes[i + j] & 0xC0) !== 0x80) return false
    }
    i += 1 + extraBytes
  }
  return true
}

function onFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const binaryReader = new FileReader()
  binaryReader.onload = ev => {
    const encoding = isValidUtf8(ev.target.result) ? 'utf-8' : 'gbk'
    const textReader = new FileReader()
    textReader.onload = async ev2 => {
      sqlInput.value = ev2.target.result
      showToast(`SQL 文件导入成功（${encoding.toUpperCase()}）`)
      await parseSqlText(true)
    }
    textReader.readAsText(file, encoding)
  }
  binaryReader.readAsArrayBuffer(file)
  event.target.value = ''
}

async function autoTranslate() {
  if (!parsed.value) return
  const { sql, count } = autoFillComments(sqlInput.value)
  if (count === 0) {
    showToast('所有字段已有注释，无需补全')
    return
  }
  sqlInput.value = sql
  await parseSqlText(false)
  showToast(`已自动补全 ${count} 个注释`)
}

async function aiDetectRelations() {
  if (!parsed.value) return
  const aiRels = detectRelations(parsed.value.tables)
  const existing = parsed.value.relationships || []
  let added = 0
  for (const rel of aiRels) {
    const duplicated = existing.some(item => item.from === rel.from && item.fromCol === rel.fromCol && item.to === rel.to)
    if (!duplicated) {
      existing.push(rel)
      added++
    }
  }
  parsed.value.relationships = existing
  if (added > 0) {
    await applyToCanvas()
    showToast(`AI 识别到 ${added} 个新关联`)
  } else {
    showToast('未发现新的关联关系', 'warn')
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

async function aiGenerateSql() {
  if (!aiPrompt.value.trim()) {
    showToast('请输入系统描述', 'warn')
    return
  }
  aiLoading.value = true
  try {
    const result = await generateDiagramSpecWithAi({
      diagramType: 'er_sql',
      userPrompt: aiPrompt.value,
      settings: aiSettings.value
    })
    sqlInput.value = result
    saveDiagramAiSettings(aiSettings.value)
    showAiPanel.value = false
    await parseSqlText(true)
    showToast('AI 已生成 SQL 并同步到画布')
  } catch (error) {
    showToast(`AI 生成失败: ${error.message}`, 'error')
  } finally {
    aiLoading.value = false
  }
}

function handleCanvasReady() {
  canvasReady.value = true
}

function handleAutosave(xml) {
  editorXml.value = xml
}

function handleCanvasError(error) {
  renderError.value = error.message || 'ER 画布加载失败'
  showToast(renderError.value, 'error')
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
      showToast('已导出 Draw.io 文件')
      return
    }
    if (type === 'jpeg') {
      const pngDataUrl = await drawioRef.value.exportDiagram('png')
      const jpegDataUrl = await convertPngDataUrlToJpeg(pngDataUrl)
      saveAs(await exportPayloadToBlob(jpegDataUrl, 'image/jpeg'), `${exportBaseName()}.jpg`)
      showToast('已导出 JPG')
      return
    }
    const payload = await drawioRef.value.exportDiagram(type)
    const ext = type === 'svg' ? 'svg' : 'png'
    const mime = type === 'svg' ? 'image/svg+xml' : 'image/png'
    saveAs(await exportPayloadToBlob(payload, mime), `${exportBaseName()}.${ext}`)
    showToast(`已导出 ${ext.toUpperCase()}`)
  } catch (error) {
    showToast(`导出失败: ${error.message}`, 'error')
  }
}
</script>

<template>
  <div class="er-page">
    <div class="er-left">
      <div class="er-left-header">
        <span class="title">📊 论文 ER 图工具</span>
        <div class="left-actions">
          <button class="btn-sm" @click="triggerFileUpload">导入SQL</button>
          <button class="btn-sm btn-primary" @click="applyToCanvas">应用到画布</button>
          <input ref="fileInput" type="file" accept=".sql,.txt,.SQL" style="display:none" @change="onFileUpload" />
        </div>
      </div>

      <div class="paper-note">
        <span class="paper-tag">最佳实践</span>
        <span class="paper-text">ER 图默认使用表实体卡片 + 正交关系线，更接近论文里常见的数据库设计图表达。</span>
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
        <p>支持 MySQL `CREATE TABLE` 语句。建议保留 `COMMENT` 和 `FOREIGN KEY`，这样生成的 ER 图可读性更好。</p>
      </div>

      <div class="action-grid">
        <button class="btn-action" @click="aiDetectRelations" :disabled="!parsed">AI识别关联</button>
        <button class="btn-action" @click="autoTranslate" :disabled="!parsed">自动补全注释</button>
        <button class="btn-action" @click="showAttrs = !showAttrs" :disabled="!parsed">{{ showAttrs ? '隐藏字段明细' : '显示字段明细' }}</button>
        <button class="btn-action" @click="showAiPanel = !showAiPanel; showAiConfig = false">AI生成SQL</button>
      </div>

      <div class="sync-bar" :class="{ dirty: canvasDirty }">
        <span v-if="parsed">{{ canvasDirty ? 'SQL/关系已修改，尚未同步到画布' : 'SQL 与画布已同步' }}</span>
        <span v-else>等待输入有效 SQL</span>
        <span class="sync-meta" v-if="parsed">{{ tableCount }} 张表 / {{ relCount }} 个关联</span>
      </div>

      <div v-if="showAiPanel" class="ai-panel">
        <div class="ai-panel-header">
          <span class="ai-panel-title">AI 生成 SQL / ER</span>
          <button class="btn-icon" @click="showAiPanel = false">✕</button>
        </div>

        <div class="ai-tools">
          <button class="btn-sm" @click="showAiConfig = !showAiConfig">模型配置</button>
        </div>

        <div v-if="showAiConfig" class="ai-config">
          <div class="ai-config-row">
            <label>模型预设</label>
            <select :value="aiSettings.presetId" @change="changeAiPreset($event.target.value)">
              <option v-for="preset in AI_PRESETS" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
            </select>
          </div>
          <div class="ai-config-row">
            <label>模型</label>
            <select v-if="aiSettings.presetId === 'longcat'" v-model="aiSettings.model">
              <option v-for="m in LONGCAT_MODELS" :key="m.id" :value="m.id">{{ m.name }}{{ m.recommended ? ' ★' : '' }}</option>
            </select>
            <input v-else v-model="aiSettings.model" placeholder="模型名称" />
          </div>
          <div class="ai-config-row">
            <label>API Key</label>
            <input v-model="aiSettings.apiKey" type="password" placeholder="只保存在浏览器本地" />
          </div>
          <div v-if="aiSettings.presetId === 'custom'" class="ai-config-row">
            <label>API地址</label>
            <input v-model="aiSettings.baseUrl" placeholder="https://api.example.com" />
          </div>
          <div v-if="aiSettings.presetId === 'custom'" class="ai-config-row">
            <label>接口路径</label>
            <input v-model="aiSettings.endpointPath" placeholder="/v1/chat/completions" />
          </div>
          <button class="btn-sm btn-primary" @click="saveAiConfig">保存配置</button>
        </div>

        <textarea
          v-model="aiPrompt"
          class="ai-textarea"
          rows="6"
          placeholder="描述业务系统，例如：校园失物招领系统，包含用户、失物、招领单、分类、公告等数据，并记录发布、认领、审核关系。"
        ></textarea>
        <div class="ai-footer">
          <span class="ai-hint">AI 会直接生成带注释和外键的 SQL，再同步成 ER 画布。</span>
          <button class="btn-sm btn-primary" @click="aiGenerateSql" :disabled="aiLoading">
            {{ aiLoading ? '生成中...' : '开始生成' }}
          </button>
        </div>
      </div>

      <textarea v-model="sqlInput" class="sql-editor" spellcheck="false"></textarea>
      <div class="left-footer" :class="{ error: !!parseError }">
        {{ parseError || '推荐流程：AI 生成 SQL / 导入 SQL -> 自动补注释 / AI 识别关联 -> 应用到可编辑画布。' }}
      </div>
    </div>

    <div class="er-right">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-title">可编辑 ER 画布</span>
          <span class="toolbar-hint">支持拖拽表卡片、改连接线、手动补图形，导出保持论文图注命名。</span>
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
        <span>关系线默认按实体关系风格生成，后续可直接在画布里继续精修。</span>
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
        <div v-else class="placeholder">请输入 SQL 并应用到画布</div>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.er-page { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.er-left {
  width: 430px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}
.er-left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.title { font-size: 14px; font-weight: 700; color: #0f172a; }
.left-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.paper-note, .caption-box, .hint-box, .ai-panel {
  margin: 10px 12px 0;
  padding: 10px;
  border-radius: 10px;
}
.paper-note, .hint-box {
  border: 1px solid #dbeafe;
  background: #f8fbff;
}
.paper-note {
  display: flex;
  align-items: center;
  gap: 8px;
}
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
.action-grid {
  margin: 10px 12px 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.btn-sm, .btn-action, .btn-export, .btn-export-more {
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-sm, .btn-action {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  background: #fff;
}
.btn-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}
.btn-action:disabled, .btn-sm:disabled, .btn-export:disabled, .btn-export-more:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
  gap: 10px;
  font-size: 12px;
  color: #475569;
}
.sync-bar.dirty {
  border-color: #fbbf24;
  background: #fffbeb;
  color: #92400e;
}
.sync-meta { color: #64748b; white-space: nowrap; }
.ai-panel {
  border: 1px solid #dbeafe;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ai-panel-header, .ai-tools, .ai-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
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
.ai-textarea, .sql-editor {
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
.sql-editor {
  flex: 1;
  min-height: 0;
  margin: 10px 12px 12px;
  background: #f8fafc;
}
.left-footer {
  margin: 0 12px 12px;
  font-size: 11px;
  color: #94a3b8;
}
.left-footer.error { color: #b91c1c; }
.ai-hint { font-size: 11px; color: #64748b; }

.er-right { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.toolbar, .canvas-note {
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.toolbar {
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
  .er-page { flex-direction: column; }
  .er-left {
    width: 100%;
    min-width: 0;
    max-height: 55vh;
  }
}
</style>
