<script setup>
import { ref, computed, watch } from 'vue'
import { layoutUseCase } from '../utils/usecaseLayout.js'
import UseCaseDiagram from './UseCaseDiagram.vue'
import { toPng, toJpeg } from 'html-to-image'
import { saveAs } from 'file-saver'

// ─── 主题 ───
const UC_THEMES = {
  color: {
    name: '彩色分类',
    ucFill: '#dae8fc', ucStroke: '#6c8ebf', ucText: '#333',
    includeFill: '#fff2cc', includeStroke: '#d6b656',
    extendFill: '#e1d5e7', extendStroke: '#9673a6',
    actorStroke: '#333', actorText: '#333',
    line: '#555', includeLine: '#888', extendLine: '#9673a6'
  },
  bw: {
    name: '经典黑白',
    ucFill: '#f5f5f5', ucStroke: '#333', ucText: '#000',
    includeFill: '#e8e8e8', includeStroke: '#666',
    extendFill: '#e8e8e8', extendStroke: '#666',
    actorStroke: '#333', actorText: '#000',
    line: '#333', includeLine: '#666', extendLine: '#666'
  },
  blue: {
    name: '蓝灰简约',
    ucFill: '#E3F2FD', ucStroke: '#1976D2', ucText: '#1a237e',
    includeFill: '#FFF3E0', includeStroke: '#F57C00',
    extendFill: '#F3E5F5', extendStroke: '#7B1FA2',
    actorStroke: '#555', actorText: '#333',
    line: '#666', includeLine: '#F57C00', extendLine: '#7B1FA2'
  }
}

const currentTheme = ref('color')
const theme = computed(() => UC_THEMES[currentTheme.value])

// ─── 数据模型 ───
const actors = ref([
  {
    name: '用户',
    usecases: [
      { name: '注册账号', type: 'main' },
      { name: '登录系统', type: 'main' },
      { name: '浏览商品', type: 'main' },
      { name: '下单购买', type: 'main' },
      { name: '验证身份', type: 'include', parentUc: '登录系统' },
    ]
  }
])

const extraRelations = ref([])

// ─── 布局计算 ───
const layout = computed(() => {
  return layoutUseCase(actors.value, extraRelations.value)
})

const ucRef = ref(null)

// ─── Actor管理 ───
function addActor() {
  actors.value.push({ name: '新参与者', usecases: [] })
}

function removeActor(idx) {
  if (actors.value.length <= 1) return
  actors.value.splice(idx, 1)
}

function addUseCase(actorIdx, type = 'main', parentUc = '') {
  actors.value[actorIdx].usecases.push({
    name: '新用例',
    type,
    parentUc: parentUc || undefined
  })
}

function removeUseCase(actorIdx, ucIdx) {
  actors.value[actorIdx].usecases.splice(ucIdx, 1)
}

// ─── 关系管理 ───
const showRelPanel = ref(false)
const newRel = ref({ from: '', to: '', type: 'include' })

function addRelation() {
  if (newRel.value.from && newRel.value.to) {
    extraRelations.value.push({ ...newRel.value })
    newRel.value = { from: '', to: '', type: 'include' }
    showRelPanel.value = false
  }
}

function removeRelation(idx) {
  extraRelations.value.splice(idx, 1)
}

// 所有用例名(用于关系选择下拉)
const allUcNames = computed(() => {
  const names = []
  for (const a of actors.value) {
    for (const uc of a.usecases) {
      names.push(uc.name)
    }
  }
  return [...new Set(names)]
})

// ─── 导出 ───
const showExportMenu = ref(false)

async function exportImg(type) {
  showExportMenu.value = false
  const svgEl = ucRef.value?.svgEl
  if (!svgEl) return
  try {
    const bg = currentTheme.value === 'bw' ? '#fff' : '#fff'
    if (type === 'png') {
      const url = await toPng(svgEl, { backgroundColor: bg, pixelRatio: 3 })
      saveAs(url, 'usecase-diagram.png')
    } else if (type === 'jpeg') {
      const url = await toJpeg(svgEl, { backgroundColor: bg, pixelRatio: 3 })
      saveAs(url, 'usecase-diagram.jpg')
    }
  } catch (e) {
    alert('导出失败: ' + e.message)
  }
}

// ─── 文本快速解析（粘贴格式直接生成，无需API） ───
const showParsePanel = ref(true)
const parseInput = ref(`用户: 注册账号, 登录系统, 浏览商品, 下单购买
管理员: 管理用户, 查看数据统计, 管理知识文章
登录系统 include 验证身份
下单购买 extend 使用优惠券`)

function parseText() {
  const text = parseInput.value.trim()
  if (!text) { showToast('请输入内容'); return }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const newActors = []
  const relations = [] // include/extend 关系行

  for (const line of lines) {
    // 格式1: "角色: 功能1, 功能2, 功能3" 或 "角色：功能1、功能2、功能3"
    const actorMatch = line.match(/^(.+?)[：:]\s*(.+)$/)
    if (actorMatch) {
      const actorName = actorMatch[1].trim()
      const ucList = actorMatch[2].split(/[,，、;；]/).map(s => s.trim()).filter(Boolean)
      newActors.push({
        name: actorName,
        usecases: ucList.map(name => ({ name, type: 'main' }))
      })
      continue
    }

    // 格式2: "用例A include 用例B" 或 "用例A extend 用例B"
    const relMatch = line.match(/^(.+?)\s+(include|extend)\s+(.+)$/i)
    if (relMatch) {
      relations.push({
        parentUc: relMatch[1].trim(),
        type: relMatch[2].toLowerCase(),
        childUc: relMatch[3].trim()
      })
      continue
    }
  }

  if (newActors.length === 0) {
    showToast('未识别到参与者，请检查格式')
    return
  }

  // 把 include/extend 关系绑定到对应的Actor
  for (const rel of relations) {
    // 找到 parentUc 所在的 actor
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
  showToast(`解析成功！${newActors.length}个参与者`)
}

// ─── AI 自动生成 ───
const showAiPanel = ref(false)
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiConfig = ref({
  baseUrl: localStorage.getItem('uc_ai_baseUrl') || 'https://api.deepseek.com',
  apiKey: localStorage.getItem('uc_ai_apiKey') || '',
  model: localStorage.getItem('uc_ai_model') || 'deepseek-chat'
})
const showAiConfig = ref(false)

function saveAiConfig() {
  localStorage.setItem('uc_ai_baseUrl', aiConfig.value.baseUrl)
  localStorage.setItem('uc_ai_apiKey', aiConfig.value.apiKey)
  localStorage.setItem('uc_ai_model', aiConfig.value.model)
  showAiConfig.value = false
  showToast('API配置已保存')
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
  ]
}

type只能是 main、include、extend 三种。include和extend必须有parentUc指向同一Actor下的某个main用例。`

async function aiGenerate() {
  if (!aiConfig.value.apiKey) {
    showAiConfig.value = true
    showToast('请先配置API Key')
    return
  }
  if (!aiPrompt.value.trim()) {
    showToast('请输入系统描述')
    return
  }

  aiLoading.value = true
  try {
    const baseUrl = aiConfig.value.baseUrl.replace(/\/+$/, '')
    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.value.apiKey}`
      },
      body: JSON.stringify({
        model: aiConfig.value.model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: aiPrompt.value }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`API错误 ${resp.status}: ${errText.substring(0, 200)}`)
    }

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI返回内容为空')

    const result = JSON.parse(content)
    if (result.actors && Array.isArray(result.actors)) {
      actors.value = result.actors
      extraRelations.value = result.relations || []
      showAiPanel.value = false
      showToast(`AI生成成功！${result.actors.length}个参与者`)
    } else {
      throw new Error('返回格式不正确，缺少actors数组')
    }
  } catch (e) {
    showToast('AI生成失败: ' + e.message)
  } finally {
    aiLoading.value = false
  }
}

// ─── Toast ───
const toast = ref({ show: false, msg: '' })
function showToast(msg) {
  toast.value = { show: true, msg }
  setTimeout(() => { toast.value.show = false }, 2500)
}

// ─── JSON导入导出 ───
function exportJSON() {
  const data = JSON.stringify({ actors: actors.value, relations: extraRelations.value }, null, 2)
  saveAs(new Blob([data], { type: 'application/json' }), 'usecase-data.json')
  showToast('JSON已导出')
}

const jsonFileInput = ref(null)
function importJSON() {
  jsonFileInput.value?.click()
}
function onJSONImport(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (data.actors) actors.value = data.actors
      if (data.relations) extraRelations.value = data.relations
      showToast('导入成功')
    } catch { showToast('JSON格式错误') }
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>

<template>
  <div class="uc-page">
    <!-- 左侧编辑器 -->
    <div class="uc-left">
      <div class="uc-left-header">
        <div class="uc-left-title">
          <span class="icon">👤</span>
          <span>用例图编辑器</span>
        </div>
        <div class="uc-left-actions">
          <button class="btn-sm btn-parse" @click="showParsePanel = !showParsePanel; showAiPanel = false">📋 粘贴生成</button>
          <button class="btn-sm btn-ai" @click="showAiPanel = !showAiPanel; showParsePanel = false">✦ AI生成</button>
          <button class="btn-sm btn-primary" @click="addActor">+ 参与者</button>
          <button class="btn-sm" @click="showRelPanel = !showRelPanel">🔗 关系</button>
          <button class="btn-sm" @click="exportJSON">💾</button>
          <button class="btn-sm" @click="importJSON">📂</button>
          <input type="file" ref="jsonFileInput" accept=".json" style="display:none" @change="onJSONImport"/>
        </div>
      </div>

      <div class="uc-editor-body">
        <!-- 粘贴文本快速生成面板 -->
        <div v-if="showParsePanel" class="parse-panel">
          <div class="parse-panel-header">
            <span class="parse-panel-title">📋 粘贴文本快速生成</span>
            <button class="btn-icon" @click="showParsePanel = false">✕</button>
          </div>
          <textarea v-model="parseInput" class="parse-textarea"
            placeholder="按以下格式输入，一行一条：&#10;&#10;角色: 功能1, 功能2, 功能3&#10;角色: 功能1、功能2、功能3&#10;用例A include 子用例B&#10;用例A extend 扩展用例C&#10;&#10;示例：&#10;用户: 注册账号, 登录系统, AI智能咨询, 记录情绪日记&#10;管理员: 管理用户, 查看数据统计, 管理知识文章&#10;登录系统 include 验证身份&#10;AI智能咨询 extend 查看历史记录"
            rows="8"></textarea>
          <div class="parse-format-hint">
            <div class="hint-title">格式说明：</div>
            <div class="hint-row"><span class="hint-tag tag-actor">角色</span> <code>角色名: 功能1, 功能2, 功能3</code></div>
            <div class="hint-row"><span class="hint-tag tag-include">include</span> <code>主用例 include 子用例</code></div>
            <div class="hint-row"><span class="hint-tag tag-extend">extend</span> <code>主用例 extend 扩展用例</code></div>
          </div>
          <div class="parse-panel-footer">
            <button class="btn-sm btn-parse-go" @click="parseText">▶ 生成用例图</button>
          </div>
        </div>

        <!-- AI生成面板 -->
        <div v-if="showAiPanel" class="ai-panel">
          <div class="ai-panel-header">
            <span class="ai-panel-title">✦ AI智能生成用例图</span>
            <button class="btn-icon" @click="showAiConfig = !showAiConfig" title="API配置">⚙</button>
          </div>
          <!-- API配置 -->
          <div v-if="showAiConfig" class="ai-config">
            <div class="ai-config-row">
              <label>API地址</label>
              <input v-model="aiConfig.baseUrl" placeholder="https://api.deepseek.com"/>
            </div>
            <div class="ai-config-row">
              <label>API Key</label>
              <input v-model="aiConfig.apiKey" type="password" placeholder="sk-..."/>
            </div>
            <div class="ai-config-row">
              <label>模型</label>
              <input v-model="aiConfig.model" placeholder="deepseek-chat"/>
            </div>
            <button class="btn-sm btn-primary" @click="saveAiConfig" style="margin-top:6px">保存配置</button>
          </div>
          <textarea v-model="aiPrompt" class="ai-textarea"
            placeholder="描述你的系统，例如：&#10;心理健康助手系统，包含用户和管理员两个角色。用户可以注册登录、AI智能咨询、记录情绪日记、查看情绪统计、浏览心理知识文章。管理员可以管理用户、查看数据统计、管理知识库文章。"
            rows="5"></textarea>
          <div class="ai-panel-footer">
            <button class="btn-sm btn-ai-go" @click="aiGenerate" :disabled="aiLoading">
              {{ aiLoading ? '⏳ 生成中...' : '✦ 开始生成' }}
            </button>
            <span class="ai-hint">支持DeepSeek/OpenAI等兼容接口</span>
          </div>
        </div>

        <!-- 参与者列表 -->
        <div v-for="(actor, ai) in actors" :key="ai" class="actor-card">
          <div class="actor-header">
            <span class="actor-icon">🧑</span>
            <input class="actor-name-input" v-model="actor.name" placeholder="参与者名称"/>
            <button class="btn-icon btn-danger" @click="removeActor(ai)" title="删除参与者">✕</button>
          </div>

          <!-- 用例列表 -->
          <div v-for="(uc, ui) in actor.usecases" :key="ui" class="uc-item">
            <div class="uc-item-row">
              <select v-model="uc.type" class="uc-type-select">
                <option value="main">主用例</option>
                <option value="include">«include»</option>
                <option value="extend">«extend»</option>
              </select>
              <input class="uc-name-input" v-model="uc.name" placeholder="用例名称"/>
              <button class="btn-icon btn-danger" @click="removeUseCase(ai, ui)" title="删除">✕</button>
            </div>
            <div v-if="uc.type === 'include' || uc.type === 'extend'" class="uc-parent-row">
              <span class="uc-parent-label">关联主用例:</span>
              <select v-model="uc.parentUc" class="uc-parent-select">
                <option value="">选择...</option>
                <option v-for="muc in actor.usecases.filter(u => u.type === 'main')" :key="muc.name" :value="muc.name">
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

        <!-- 额外关系面板 -->
        <div v-if="showRelPanel" class="rel-panel">
          <div class="rel-title">跨参与者关系</div>
          <div v-for="(r, ri) in extraRelations" :key="ri" class="rel-item">
            <span>{{ r.from }}</span>
            <span class="rel-arrow">→ {{ r.type }} →</span>
            <span>{{ r.to }}</span>
            <button class="btn-icon btn-danger" @click="removeRelation(ri)">✕</button>
          </div>
          <div class="rel-add-row">
            <select v-model="newRel.from" class="rel-select">
              <option value="">从...</option>
              <option v-for="n in allUcNames" :key="n" :value="n">{{ n }}</option>
            </select>
            <select v-model="newRel.type" class="rel-type-select">
              <option value="association">关联</option>
              <option value="include">include</option>
              <option value="extend">extend</option>
              <option value="generalization">泛化</option>
            </select>
            <select v-model="newRel.to" class="rel-select">
              <option value="">到...</option>
              <option v-for="n in allUcNames" :key="n" :value="n">{{ n }}</option>
            </select>
            <button class="btn-sm btn-primary" @click="addRelation">添加</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧预览 -->
    <div class="uc-right">
      <div class="uc-toolbar">
        <div class="uc-toolbar-left">
          <span class="icon">🖼</span>
          <span class="toolbar-title">用例图预览</span>
          <span class="toolbar-hint">节点可拖拽、滚轮缩放</span>
        </div>
        <div class="uc-toolbar-right">
          <!-- 主题 -->
          <select v-model="currentTheme" class="theme-select">
            <option v-for="(t, k) in UC_THEMES" :key="k" :value="k">🎨 {{ t.name }}</option>
          </select>

          <!-- 导出 -->
          <div class="dropdown-wrap" @click.stop>
            <button class="btn-export" @click="exportImg('png')">📥 导出PNG</button>
            <button class="btn-export-more" @click="showExportMenu=!showExportMenu">▾</button>
            <div class="dropdown-panel" v-if="showExportMenu">
              <div class="export-item" @click="exportImg('png')">📷 导出 PNG</div>
              <div class="export-item" @click="exportImg('jpeg')">🖼 导出 JPEG</div>
            </div>
          </div>
        </div>
      </div>

      <div class="uc-canvas">
        <UseCaseDiagram
          ref="ucRef"
          :nodes="layout.nodes"
          :edges="layout.edges"
          :canvasWidth="layout.width"
          :canvasHeight="layout.height"
          :theme="theme"
        />
        <div v-if="actors.length === 0 || actors.every(a => a.usecases.length === 0)" class="placeholder">
          <div class="placeholder-icon">👤</div>
          <p>在左侧添加参与者和用例</p>
          <p class="placeholder-sub">自动生成UML用例图</p>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.show" class="toast">{{ toast.msg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.uc-page { display: flex; flex: 1; overflow: hidden; min-height: 0; }

/* ── 左侧 ── */
.uc-left {
  width: 380px; min-width: 280px; display: flex; flex-direction: column;
  border-right: 1px solid #e2e8f0; background: #fff; flex-shrink: 0;
}
.uc-left-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; gap: 6px; flex-wrap: wrap;
}
.uc-left-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }
.uc-left-actions { display: flex; gap: 4px; flex-wrap: wrap; }

.uc-editor-body { flex: 1; overflow-y: auto; padding: 10px 12px; }

/* Actor卡片 */
.actor-card {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 10px; margin-bottom: 12px;
}
.actor-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
}
.actor-icon { font-size: 18px; }
.actor-name-input {
  flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;
  font-size: 14px; font-weight: 600; background: #fff;
}
.actor-footer { display: flex; gap: 4px; margin-top: 8px; }

/* 用例条目 */
.uc-item { margin-bottom: 6px; }
.uc-item-row { display: flex; align-items: center; gap: 4px; }
.uc-type-select {
  width: 95px; padding: 3px 4px; border: 1px solid #cbd5e1; border-radius: 4px;
  font-size: 11px; background: #fff; flex-shrink: 0;
}
.uc-name-input {
  flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;
  font-size: 13px; background: #fff;
}
.uc-parent-row {
  display: flex; align-items: center; gap: 4px; margin-top: 3px; padding-left: 99px;
}
.uc-parent-label { font-size: 11px; color: #64748b; white-space: nowrap; }
.uc-parent-select {
  flex: 1; padding: 2px 4px; border: 1px solid #cbd5e1; border-radius: 4px;
  font-size: 11px; background: #fff;
}

/* 关系面板 */
.rel-panel {
  background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
  padding: 10px; margin-top: 8px;
}
.rel-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.rel-item { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }
.rel-arrow { color: #94a3b8; font-size: 11px; }
.rel-add-row { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
.rel-select, .rel-type-select {
  padding: 3px 4px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; background: #fff;
}
.rel-select { flex: 1; min-width: 70px; }

/* ── 右侧 ── */
.uc-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

.uc-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; border-bottom: 1px solid #e2e8f0; background: #fff; flex-shrink: 0;
}
.uc-toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-title { font-size: 14px; font-weight: 600; }
.toolbar-hint { font-size: 11px; color: #94a3b8; }
.uc-toolbar-right { display: flex; align-items: center; gap: 6px; }

.theme-select {
  padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
  font-size: 12px; background: #fff; cursor: pointer;
}

.uc-canvas { flex: 1; position: relative; overflow: hidden; }

/* 按钮 */
.btn-sm {
  padding: 4px 10px; border: 1px solid #e2e8f0; border-radius: 5px;
  background: #fff; font-size: 11px; cursor: pointer; white-space: nowrap;
}
.btn-sm:hover { background: #f1f5f9; }
.btn-sm.btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.btn-sm.btn-primary:hover { background: #2563eb; }
.btn-sm.btn-add-uc { color: #3b82f6; border-color: #bfdbfe; }
.btn-sm.btn-add-sub { color: #7c3aed; border-color: #ddd6fe; font-size: 10px; }

.btn-icon {
  width: 22px; height: 22px; border: none; border-radius: 4px;
  background: transparent; cursor: pointer; font-size: 12px; display: flex;
  align-items: center; justify-content: center;
}
.btn-icon.btn-danger:hover { background: #fee2e2; color: #dc2626; }

.btn-export {
  padding: 5px 12px; border: 1px solid #3b82f6; border-right: none; border-radius: 6px 0 0 6px;
  background: #3b82f6; color: #fff; font-size: 12px; cursor: pointer; font-weight: 600;
}
.btn-export:hover { background: #2563eb; }
.btn-export-more {
  padding: 5px 8px; border: 1px solid #3b82f6; border-radius: 0 6px 6px 0;
  background: #2563eb; color: #fff; font-size: 12px; cursor: pointer;
}

.dropdown-wrap { position: relative; display: flex; }
.dropdown-panel {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 200;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); min-width: 150px;
}
.export-item { padding: 8px 14px; font-size: 13px; cursor: pointer; }
.export-item:hover { background: #f1f5f9; }

.placeholder {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
}
.placeholder-icon { font-size: 48px; color: #cbd5e1; margin-bottom: 10px; }
.placeholder p { font-size: 15px; color: #94a3b8; }
.placeholder-sub { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

.icon { font-size: 16px; }

.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 24px; font-size: 14px; font-weight: 500;
  background: #22c55e; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,.15); z-index: 9999;
}
.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }

/* ── 粘贴解析面板 ── */
.parse-panel {
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
  padding: 10px; margin-bottom: 12px;
}
.parse-panel-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.parse-panel-title { font-size: 13px; font-weight: 600; color: #0369a1; }
.parse-textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #bae6fd; border-radius: 6px;
  font-family: 'Consolas', 'JetBrains Mono', monospace; font-size: 12px;
  line-height: 1.6; resize: vertical; background: #fff; color: #334155;
}
.parse-textarea:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 2px rgba(2,132,199,.15); }
.parse-format-hint {
  margin-top: 8px; padding: 8px 10px; background: #e0f2fe; border-radius: 6px; font-size: 11px;
}
.hint-title { font-weight: 600; color: #0369a1; margin-bottom: 4px; }
.hint-row { margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
.hint-row code { color: #475569; background: #fff; padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.hint-tag {
  display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; color: #fff;
}
.tag-actor { background: #3b82f6; }
.tag-include { background: #d97706; }
.tag-extend { background: #7c3aed; }
.parse-panel-footer { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.btn-parse-go {
  padding: 6px 18px; border: none; border-radius: 6px;
  background: #0284c7; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-parse-go:hover { background: #0369a1; }
.btn-sm.btn-parse { color: #0284c7; border-color: #bae6fd; font-weight: 500; }
.btn-sm.btn-parse:hover { background: #f0f9ff; }

/* ── AI生成面板 ── */
.ai-panel {
  background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px;
  padding: 10px; margin-bottom: 12px;
}
.ai-panel-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.ai-panel-title { font-size: 13px; font-weight: 600; color: #7c3aed; }
.ai-config {
  background: #f5f3ff; border: 1px solid #e9d5ff; border-radius: 6px;
  padding: 8px; margin-bottom: 8px;
}
.ai-config-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 12px;
}
.ai-config-row label { width: 60px; color: #64748b; flex-shrink: 0; }
.ai-config-row input {
  flex: 1; padding: 4px 8px; border: 1px solid #ddd6fe; border-radius: 4px;
  font-size: 12px; background: #fff;
}
.ai-textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #e9d5ff; border-radius: 6px;
  font-size: 12px; line-height: 1.6; resize: vertical; background: #fff; color: #334155;
}
.ai-textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,.15); }
.ai-panel-footer { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.ai-hint { font-size: 10px; color: #a78bfa; }
.btn-ai-go {
  padding: 6px 18px; border: none; border-radius: 6px;
  background: #7c3aed; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-ai-go:hover { background: #6d28d9; }
.btn-ai-go:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm.btn-ai { color: #7c3aed; border-color: #ddd6fe; font-weight: 500; }
.btn-sm.btn-ai:hover { background: #faf5ff; }
</style>
