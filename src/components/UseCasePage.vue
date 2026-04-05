<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { saveAs } from 'file-saver'
import UseCaseDiagram from './UseCaseDiagram.vue'
import {
  AI_PRESETS,
  applyAiPreset,
  loadDiagramAiSettings,
  requestAiChatCompletion,
  saveDiagramAiSettings
} from '../utils/diagramAi.js'

const actors = ref([
  {
    name: '用户',
    usecases: [
      { name: '注册账号', type: 'main' },
      { name: '登录系统', type: 'main' },
      { name: '浏览商品', type: 'main' },
      { name: '下单购买', type: 'main' },
      { name: '验证身份', type: 'include', parentUc: '登录系统' }
    ]
  }
])

const extraRelations = ref([])
const showRelPanel = ref(false)
const newRel = ref({ from: '', to: '', type: 'include' })
const showParsePanel = ref(true)
const parseInput = ref(`用户: 注册账号, 登录系统, 浏览商品, 下单购买
管理员: 管理用户, 查看数据统计, 管理知识文章
登录系统 include 验证身份
下单购买 extend 使用优惠券`)

const showAiPanel = ref(false)
const showAiConfig = ref(false)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiSettings = ref(loadDiagramAiSettings())

const layoutData = ref(null)
const layoutRevision = ref(0)
const lastAppliedSignature = ref('')
const canvasRef = ref(null)
const showExportMenu = ref(false)
const canvasReady = ref(false)
const canvasBusy = ref(false)
const renderError = ref('')
const toast = ref({ show: false, msg: '', type: 'success' })

const chapterNo = ref(3)
const figureNo = ref(1)
const captionTitle = ref('系统用例图')
const jsonFileInput = ref(null)

let buildUseCaseLayoutFn = null

function showToast(msg, type = 'success') {
  toast.value = { show: true, msg, type }
  window.setTimeout(() => {
    toast.value.show = false
  }, 2600)
}

function buildCaption() {
  const title = captionTitle.value.trim() || '系统用例图'
  return `图${chapterNo.value}-${figureNo.value} ${title}`
}

function exportBaseName() {
  const title = (captionTitle.value.trim() || '系统用例图')
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
  return `fig${chapterNo.value}-${figureNo.value}-${title}`
}

const snapshot = computed(() => JSON.stringify({
  actors: actors.value,
  relations: extraRelations.value,
  caption: buildCaption()
}))

const canvasDirty = computed(() => snapshot.value !== lastAppliedSignature.value)

const allUcNames = computed(() => {
  const names = []
  for (const actor of actors.value) {
    for (const uc of actor.usecases) names.push(uc.name)
  }
  return [...new Set(names.filter(Boolean))]
})

async function ensureBuilder() {
  if (!buildUseCaseLayoutFn) {
    const mod = await import('../utils/usecaseDrawioBuilder.js')
    buildUseCaseLayoutFn = mod.buildUseCaseLayout
  }
}

async function applyToCanvas() {
  if (actors.value.length === 0 || actors.value.every(actor => actor.usecases.length === 0)) {
    showToast('请先添加参与者和用例', 'warn')
    return
  }
  canvasBusy.value = true
  canvasReady.value = false
  renderError.value = ''
  showExportMenu.value = false
  try {
    await ensureBuilder()
    layoutData.value = buildUseCaseLayoutFn({
      actors: actors.value,
      relations: extraRelations.value
    })
    layoutRevision.value += 1
    lastAppliedSignature.value = snapshot.value
    showToast('已同步到可编辑画布')
  } catch (error) {
    renderError.value = error.message || '用例图画布生成失败'
    showToast(renderError.value, 'error')
  } finally {
    canvasBusy.value = false
  }
}

function addActor() {
  actors.value.push({ name: '新参与者', usecases: [] })
}

function removeActor(index) {
  if (actors.value.length <= 1) return
  actors.value.splice(index, 1)
}

function addUseCase(actorIndex, type = 'main', parentUc = '') {
  actors.value[actorIndex].usecases.push({
    name: '新用例',
    type,
    parentUc: parentUc || undefined
  })
}

function removeUseCase(actorIndex, ucIndex) {
  actors.value[actorIndex].usecases.splice(ucIndex, 1)
}

function addRelation() {
  if (!newRel.value.from || !newRel.value.to) return
  extraRelations.value.push({ ...newRel.value })
  newRel.value = { from: '', to: '', type: 'include' }
  showRelPanel.value = false
}

function removeRelation(index) {
  extraRelations.value.splice(index, 1)
}

function parseText() {
  const text = parseInput.value.trim()
  if (!text) {
    showToast('请输入内容', 'warn')
    return
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const newActors = []
  const relations = []

  for (const line of lines) {
    const actorMatch = line.match(/^(.+?)[：:]\s*(.+)$/)
    if (actorMatch) {
      const actorName = actorMatch[1].trim()
      const ucList = actorMatch[2].split(/[,，、;；]/).map(item => item.trim()).filter(Boolean)
      newActors.push({
        name: actorName,
        usecases: ucList.map(name => ({ name, type: 'main' }))
      })
      continue
    }

    const relMatch = line.match(/^(.+?)\s+(include|extend)\s+(.+)$/i)
    if (relMatch) {
      relations.push({
        parentUc: relMatch[1].trim(),
        type: relMatch[2].toLowerCase(),
        childUc: relMatch[3].trim()
      })
    }
  }

  if (newActors.length === 0) {
    showToast('未识别到参与者，请检查格式', 'warn')
    return
  }

  for (const rel of relations) {
    for (const actor of newActors) {
      const parent = actor.usecases.find(uc => uc.name === rel.parentUc && uc.type === 'main')
      if (parent) {
        actor.usecases.push({
          name: rel.childUc,
          type: rel.type,
          parentUc: rel.parentUc
        })
        break
      }
    }
  }

  actors.value = newActors
  extraRelations.value = []
  showParsePanel.value = false
  showToast(`解析成功，识别到 ${newActors.length} 个参与者`)
}

function saveAiConfig() {
  saveDiagramAiSettings(aiSettings.value)
  showAiConfig.value = false
  showToast('AI 配置已保存到浏览器本地')
}

function changeAiPreset(presetId) {
  aiSettings.value = applyAiPreset(presetId, aiSettings.value)
}

const AI_SYSTEM_PROMPT = `你是一个UML用例图专家。用户会描述一个系统，你需要分析并输出该系统的参与者(Actor)和用例(UseCase)。

输出要求：
1. 严格输出JSON格式，不要输出其他内容
2. 用例名必须是动词短语（如"注册账号""发布文章"），不能是名词或模块名
3. 每个Actor的用例数量控制在5-10个
4. 合理使用include和extend关系，但不要滥用
5. include表示必须执行的子步骤，extend表示可选的扩展功能

JSON格式：
{
  "actors": [
    {
      "name": "参与者名称",
      "usecases": [
        { "name": "用例名称", "type": "main" },
        { "name": "子用例名称", "type": "include", "parentUc": "父用例名称" },
        { "name": "扩展用例名称", "type": "extend", "parentUc": "父用例名称" }
      ]
    }
  ],
  "relations": [
    { "from": "用例A", "to": "用例B", "type": "association" }
  ]
}

type 只能是 main、include、extend、association、generalization。`

async function aiGenerate() {
  if (!aiPrompt.value.trim()) {
    showToast('请输入系统描述', 'warn')
    return
  }
  aiLoading.value = true
  try {
    const data = await requestAiChatCompletion({
      settings: aiSettings.value,
      body: {
        model: aiSettings.value.model,
        temperature: typeof aiSettings.value.temperature === 'number' ? aiSettings.value.temperature : 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: aiPrompt.value }
        ]
      }
    })

    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('AI 返回内容为空')

    const result = JSON.parse(content)
    if (!Array.isArray(result.actors)) throw new Error('返回格式不正确，缺少 actors 数组')

    actors.value = result.actors
    extraRelations.value = Array.isArray(result.relations) ? result.relations : []
    saveDiagramAiSettings(aiSettings.value)
    showAiPanel.value = false
    await applyToCanvas()
    showToast(`AI 生成成功，识别到 ${result.actors.length} 个参与者`)
  } catch (error) {
    showToast(`AI 生成失败: ${error.message}`, 'error')
  } finally {
    aiLoading.value = false
  }
}

function exportJSON() {
  const data = JSON.stringify({ actors: actors.value, relations: extraRelations.value }, null, 2)
  saveAs(new Blob([data], { type: 'application/json' }), 'usecase-data.json')
  showToast('JSON 已导出')
}

function importJSON() {
  jsonFileInput.value?.click()
}

function onJSONImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result)
      if (Array.isArray(data.actors)) actors.value = data.actors
      if (Array.isArray(data.relations)) extraRelations.value = data.relations
      await applyToCanvas()
      showToast('JSON 导入成功')
    } catch {
      showToast('JSON 格式错误', 'error')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(buildCaption())
    showToast('图注已复制')
  } catch {
    showToast('复制失败，请手动复制', 'warn')
  }
}

function handleCanvasReady() {
  canvasReady.value = true
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then(r => r.blob())
}

function convertPngDataUrlToJpeg(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')
      if (!ctx) { reject(new Error('JPEG 转换失败')); return }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = () => reject(new Error('PNG→JPEG 失败'))
    img.src = dataUrl
  })
}

async function exportDiagram(type) {
  showExportMenu.value = false
  if (!canvasRef.value) { showToast('画布尚未准备好', 'warn'); return }
  try {
    if (type === 'svg') {
      const svgStr = canvasRef.value.exportSvgString()
      saveAs(new Blob([svgStr], { type: 'image/svg+xml' }), `${exportBaseName()}.svg`)
      showToast('已导出 SVG'); return
    }
    const pngDataUrl = await canvasRef.value.exportPngDataUrl(2)
    if (type === 'jpeg') {
      const jpegUrl = await convertPngDataUrlToJpeg(pngDataUrl)
      saveAs(await dataUrlToBlob(jpegUrl), `${exportBaseName()}.jpg`)
      showToast('已导出 JPG'); return
    }
    saveAs(await dataUrlToBlob(pngDataUrl), `${exportBaseName()}.png`)
    showToast('已导出 PNG')
  } catch (error) {
    showToast(`导出失败: ${error.message}`, 'error')
  }
}

watch([actors, extraRelations, chapterNo, figureNo, captionTitle], () => {}, { deep: true })

onMounted(() => {
  applyToCanvas()
})
</script>

<template>
  <div class="uc-page">
    <div class="uc-left">
      <div class="uc-left-header">
        <div class="uc-left-title">
          <span class="icon">👤</span>
          <span>用例图编辑器</span>
        </div>
        <div class="uc-left-actions">
          <button class="btn-sm btn-parse" @click="showParsePanel = !showParsePanel; showAiPanel = false">粘贴生成</button>
          <button class="btn-sm btn-ai" @click="showAiPanel = !showAiPanel; showParsePanel = false">AI生成</button>
          <button class="btn-sm btn-primary" @click="applyToCanvas">应用到画布</button>
          <button class="btn-sm" @click="exportJSON">导出JSON</button>
          <button class="btn-sm" @click="importJSON">导入JSON</button>
          <input ref="jsonFileInput" type="file" accept=".json" style="display:none" @change="onJSONImport" />
        </div>
      </div>

      <div class="paper-note">
        <span class="paper-tag">最佳实践</span>
        <span class="paper-text">左侧结构化编辑参与者和用例，右侧在可编辑画布里继续微调布局和连线。</span>
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

      <div class="sync-bar" :class="{ dirty: canvasDirty }">
        <span>{{ canvasDirty ? '结构已修改，尚未同步到画布' : '结构与画布已同步' }}</span>
        <span class="sync-meta">{{ allUcNames.length }} 个用例</span>
      </div>

      <div class="uc-editor-body">
        <div v-if="showParsePanel" class="parse-panel">
          <div class="parse-panel-header">
            <span class="parse-panel-title">粘贴文本快速生成</span>
            <button class="btn-icon" @click="showParsePanel = false">✕</button>
          </div>
          <textarea v-model="parseInput" class="parse-textarea" rows="8"></textarea>
          <div class="parse-format-hint">
            <div class="hint-title">格式说明</div>
            <div class="hint-row"><span class="hint-tag tag-actor">角色</span> <code>角色名: 功能1, 功能2, 功能3</code></div>
            <div class="hint-row"><span class="hint-tag tag-include">include</span> <code>主用例 include 子用例</code></div>
            <div class="hint-row"><span class="hint-tag tag-extend">extend</span> <code>主用例 extend 扩展用例</code></div>
          </div>
          <div class="parse-panel-footer">
            <button class="btn-sm btn-primary" @click="parseText">生成用例图</button>
          </div>
        </div>

        <div v-if="showAiPanel" class="ai-panel">
          <div class="ai-panel-header">
            <span class="ai-panel-title">AI 智能生成用例图</span>
            <button class="btn-icon" @click="showAiConfig = !showAiConfig">⚙</button>
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
              <input v-model="aiSettings.model" placeholder="LongCat-Flash-Thinking / glm-4.7" />
            </div>
            <button class="btn-sm btn-primary" @click="saveAiConfig">保存配置</button>
          </div>
          <textarea v-model="aiPrompt" class="ai-textarea" rows="5" placeholder="描述你的系统，例如：心理健康助手系统，包含用户和管理员两个角色..."></textarea>
          <div class="ai-panel-footer">
            <span class="ai-hint">AI 会直接生成参与者、主用例以及 include/extend 结构。</span>
            <button class="btn-sm btn-primary" @click="aiGenerate" :disabled="aiLoading">
              {{ aiLoading ? '生成中...' : '开始生成' }}
            </button>
          </div>
        </div>

        <div v-for="(actor, ai) in actors" :key="ai" class="actor-card">
          <div class="actor-header">
            <span class="actor-icon">🧑</span>
            <input v-model="actor.name" class="actor-name-input" placeholder="参与者名称" />
            <button class="btn-icon btn-danger" @click="removeActor(ai)">✕</button>
          </div>

          <div v-for="(uc, ui) in actor.usecases" :key="ui" class="uc-item">
            <div class="uc-item-row">
              <select v-model="uc.type" class="uc-type-select">
                <option value="main">主用例</option>
                <option value="include">«include»</option>
                <option value="extend">«extend»</option>
              </select>
              <input v-model="uc.name" class="uc-name-input" placeholder="用例名称" />
              <button class="btn-icon btn-danger" @click="removeUseCase(ai, ui)">✕</button>
            </div>
            <div v-if="uc.type === 'include' || uc.type === 'extend'" class="uc-parent-row">
              <span class="uc-parent-label">关联主用例</span>
              <select v-model="uc.parentUc" class="uc-parent-select">
                <option value="">选择...</option>
                <option v-for="muc in actor.usecases.filter(item => item.type === 'main')" :key="muc.name" :value="muc.name">
                  {{ muc.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="actor-footer">
            <button class="btn-sm btn-add-uc" @click="addUseCase(ai, 'main')">+ 用例</button>
            <button class="btn-sm btn-add-sub" @click="addUseCase(ai, 'include')">+ include</button>
            <button class="btn-sm btn-add-sub" @click="addUseCase(ai, 'extend')">+ extend</button>
          </div>
        </div>

        <div class="toolbar-inline">
          <button class="btn-sm btn-primary" @click="addActor">+ 参与者</button>
          <button class="btn-sm" @click="showRelPanel = !showRelPanel">跨参与者关系</button>
        </div>

        <div v-if="showRelPanel" class="rel-panel">
          <div class="rel-title">跨参与者关系</div>
          <div v-for="(rel, ri) in extraRelations" :key="ri" class="rel-item">
            <span>{{ rel.from }}</span>
            <span class="rel-arrow">→ {{ rel.type }} →</span>
            <span>{{ rel.to }}</span>
            <button class="btn-icon btn-danger" @click="removeRelation(ri)">✕</button>
          </div>
          <div class="rel-add-row">
            <select v-model="newRel.from" class="rel-select">
              <option value="">从...</option>
              <option v-for="name in allUcNames" :key="name" :value="name">{{ name }}</option>
            </select>
            <select v-model="newRel.type" class="rel-type-select">
              <option value="association">关联</option>
              <option value="include">include</option>
              <option value="extend">extend</option>
              <option value="generalization">泛化</option>
            </select>
            <select v-model="newRel.to" class="rel-select">
              <option value="">到...</option>
              <option v-for="name in allUcNames" :key="name" :value="name">{{ name }}</option>
            </select>
            <button class="btn-sm btn-primary" @click="addRelation">添加</button>
          </div>
        </div>
      </div>
    </div>

    <div class="uc-right">
      <div class="uc-toolbar">
        <div class="uc-toolbar-left">
          <span class="toolbar-title">可编辑用例图画布</span>
          <span class="toolbar-hint">支持手动调整参与者、用例位置和连线细节。</span>
        </div>
        <div class="uc-toolbar-right">
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
            </div>
          </div>
        </div>
      </div>

      <div class="canvas-note">
        <span>include / extend / 泛化 会自动用 UML 关系样式初始化，后续可以直接在画布里继续调整。</span>
      </div>

      <div class="uc-canvas">
        <div v-if="renderError" class="render-error">{{ renderError }}</div>
        <UseCaseDiagram
          v-else-if="layoutData"
          :key="layoutRevision"
          ref="canvasRef"
          :nodes="layoutData.nodes"
          :edges="layoutData.edges"
          :canvasWidth="layoutData.width"
          :canvasHeight="layoutData.height"
          @ready="handleCanvasReady"
        />
        <div v-else class="placeholder">请先在左侧生成用例结构并应用到画布</div>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.uc-page { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.uc-left {
  width: 400px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e2e8f0;
}
.uc-left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}
.uc-left-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
.uc-left-actions { display: flex; gap: 4px; flex-wrap: wrap; }
.paper-note, .caption-box, .parse-panel, .ai-panel, .rel-panel {
  margin: 10px 12px 0;
  padding: 10px;
  border-radius: 10px;
}
.paper-note {
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid #dbeafe;
  background: #f8fbff;
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
.paper-text { font-size: 12px; color: #334155; line-height: 1.6; }
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
.sync-meta { color: #64748b; }
.uc-editor-body { flex: 1; overflow-y: auto; padding-bottom: 12px; }
.actor-card {
  margin: 10px 12px 0;
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.actor-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.actor-name-input, .uc-name-input, .parse-textarea, .ai-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  background: #fff;
}
.actor-name-input { font-size: 14px; font-weight: 600; }
.uc-item { margin-bottom: 6px; }
.uc-item-row { display: flex; gap: 4px; align-items: center; }
.uc-type-select, .uc-parent-select, .rel-select, .rel-type-select {
  height: 32px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 8px;
  font-size: 11px;
  background: #fff;
}
.uc-type-select { width: 100px; flex-shrink: 0; }
.uc-parent-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 106px;
  margin-top: 4px;
}
.uc-parent-label { font-size: 11px; color: #64748b; white-space: nowrap; }
.actor-footer, .toolbar-inline, .parse-panel-footer, .ai-panel-footer, .rel-add-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.toolbar-inline { margin: 10px 12px 0; }
.btn-sm, .btn-export, .btn-export-more {
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.btn-sm {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  background: #fff;
}
.btn-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}
.btn-add-uc { color: #2563eb; border-color: #bfdbfe; }
.btn-add-sub { color: #7c3aed; border-color: #ddd6fe; }
.btn-parse { color: #0284c7; border-color: #bae6fd; }
.btn-ai { color: #7c3aed; border-color: #ddd6fe; }
.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: #e2e8f0;
  cursor: pointer;
}
.btn-danger:hover { background: #fee2e2; color: #dc2626; }
.parse-panel {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}
.parse-panel-header, .ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.parse-panel-title, .ai-panel-title { font-size: 13px; font-weight: 700; color: #0f172a; }
.parse-textarea, .ai-textarea {
  font-family: 'Consolas', 'JetBrains Mono', monospace;
  line-height: 1.6;
  resize: vertical;
}
.parse-format-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #e0f2fe;
  font-size: 11px;
}
.hint-title { font-weight: 700; color: #0369a1; margin-bottom: 4px; }
.hint-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.hint-row code { background: #fff; padding: 1px 6px; border-radius: 4px; }
.hint-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.tag-actor { background: #3b82f6; }
.tag-include { background: #d97706; }
.tag-extend { background: #7c3aed; }
.ai-panel {
  background: #faf5ff;
  border: 1px solid #e9d5ff;
}
.ai-config {
  display: grid;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e9d5ff;
  margin-bottom: 8px;
}
.ai-config-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #475569;
}
.ai-hint { font-size: 11px; color: #7c3aed; }
.rel-panel {
  background: #fffbeb;
  border: 1px solid #fcd34d;
}
.rel-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.rel-item { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }
.rel-arrow { color: #94a3b8; font-size: 11px; }

.uc-right { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.uc-toolbar, .canvas-note {
  padding: 10px 14px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.uc-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.uc-toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-title { font-size: 14px; font-weight: 700; color: #0f172a; }
.toolbar-hint, .canvas-note { font-size: 12px; color: #64748b; }
.uc-toolbar-right { display: flex; align-items: center; gap: 10px; }
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
.uc-canvas {
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
  .uc-page { flex-direction: column; }
  .uc-left {
    width: 100%;
    min-width: 0;
    max-height: 58vh;
  }
}
</style>
