<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { parseSQL } from './utils/sqlParser.js'
import { layoutAll, layoutBeautify } from './utils/erLayout.js'
import ErDiagram from './components/ErDiagram.vue'
import UseCasePage from './components/UseCasePage.vue'
import ClassDiagramPage from './components/ClassDiagramPage.vue'
import SequenceDiagramPage from './components/SequenceDiagramPage.vue'
import FlowDiagramPage from './components/FlowDiagramPage.vue'
import DeploymentDiagramPage from './components/DeploymentDiagramPage.vue'
import ArchitectureDiagramPage from './components/ArchitectureDiagramPage.vue'
import FunctionStructurePage from './components/FunctionStructurePage.vue'
import { toPng, toSvg, toJpeg } from 'html-to-image'
import { saveAs } from 'file-saver'
import { detectRelations } from './utils/aiRelation.js'
import { toDrawioXml } from './utils/drawioExport.js'
import { autoFillComments } from './utils/autoTranslate.js'

// ─── 模式切换：ER图 / 用例图 / 各类UML图 ───
const appMode = ref('er')

// ─── 主题配置 ───────────────────────────────────────────────
const THEMES = {
  classic:  { name:'经典黑白', entity:'#ffffff', entityStroke:'#000000', entityText:'#000000', attr:'#ffffff', attrStroke:'#000000', attrText:'#000000', line:'#000000', diamond:'#ffffff', diamondStroke:'#000000' },
  blue:     { name:'蓝色商务', entity:'#dbeafe', entityStroke:'#3b82f6', entityText:'#1e40af', attr:'#eff6ff', attrStroke:'#93c5fd', attrText:'#1e40af', line:'#3b82f6', diamond:'#dbeafe', diamondStroke:'#3b82f6' },
  green:    { name:'清新绿意', entity:'#dcfce7', entityStroke:'#22c55e', entityText:'#166534', attr:'#f0fdf4', attrStroke:'#86efac', attrText:'#166534', line:'#22c55e', diamond:'#dcfce7', diamondStroke:'#22c55e' },
  purple:   { name:'紫色优雅', entity:'#ede9fe', entityStroke:'#8b5cf6', entityText:'#4c1d95', attr:'#f5f3ff', attrStroke:'#c4b5fd', attrText:'#4c1d95', line:'#8b5cf6', diamond:'#ede9fe', diamondStroke:'#8b5cf6' },
  dark:     { name:'深色模式', entity:'#1e293b', entityStroke:'#475569', entityText:'#f1f5f9', attr:'#0f172a', attrStroke:'#334155', attrText:'#e2e8f0', line:'#64748b', diamond:'#1e293b', diamondStroke:'#475569' },
}

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
const erNodes = ref([])
const erEdges = ref([])
const showAttrs = ref(true)
const erRef = ref(null)
const fileInput = ref(null)
let debounceTimer = null

// 样式状态
const currentThemeName = ref('classic')
const currentTheme = computed(() => THEMES[currentThemeName.value])
const styleConfig = ref({ entityW: 120, entityH: 40, attrRx: 50, attrRy: 20, fontSize: 13, showPkUnderline: true })

// 面板显示状态
const showThemePanel = ref(false)
const showStylePanel = ref(false)
const showExportMenu = ref(false)
const erChapter = ref(3)
const erFigure = ref(1)
const erCaptionTitle = ref('系统E-R图')

// 通知
const toast = ref({ show: false, msg: '', type: 'success' })
function showToast(msg, type = 'success') {
  toast.value = { show: true, msg, type }
  setTimeout(() => { toast.value.show = false }, 2500)
}

function buildErCaption() {
  const title = erCaptionTitle.value.trim() || '系统E-R图'
  return `图${erChapter.value}-${erFigure.value} ${title}`
}

function erBaseName() {
  const title = (erCaptionTitle.value.trim() || '系统E-R图')
    .replace(/\s+/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
  return `fig${erChapter.value}-${erFigure.value}-${title}`
}

async function copyErCaption() {
  const text = buildErCaption()
  try {
    await navigator.clipboard.writeText(text)
    showToast('图注已复制')
  } catch {
    showToast('复制失败，请手动复制图注', 'warn')
  }
}

function generate() {
  try {
    const result = parseSQL(sqlInput.value)
    if (result.tables.length === 0) { parsed.value = null; erNodes.value = []; erEdges.value = []; return }
    parsed.value = result
    const layout = layoutAll(result.tables, result.relationships)
    erNodes.value = layout.nodes
    erEdges.value = layout.edges
  } catch (e) { /* ignore */ }
}

watch(sqlInput, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generate, 600)
}, { immediate: true })

const tableCount = computed(() => parsed.value?.tables?.length || 0)
const relCount = computed(() => parsed.value?.relationships?.length || 0)

const visibleNodes = computed(() => {
  if (showAttrs.value) return erNodes.value
  return erNodes.value.filter(n => n.type === 'entity')
})

// 文件上传
function triggerFileUpload() {
  fileInput.value?.click()
}
function isValidUtf8(buf) {
  const bytes = new Uint8Array(buf)
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    let extraBytes = 0
    if (b === 0xEF && bytes[i+1] === 0xBB && bytes[i+2] === 0xBF) { i += 3; continue } // BOM
    if (b <= 0x7F) { i++; continue }
    else if ((b & 0xE0) === 0xC0) extraBytes = 1
    else if ((b & 0xF0) === 0xE0) extraBytes = 2
    else if ((b & 0xF8) === 0xF0) extraBytes = 3
    else return false // 非法起始字节
    for (let j = 1; j <= extraBytes; j++) {
      if (i + j >= bytes.length || (bytes[i + j] & 0xC0) !== 0x80) return false
    }
    i += 1 + extraBytes
  }
  return true
}

function onFileUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  // 先用 ArrayBuffer 读取，检测是否是合法 UTF-8
  const binReader = new FileReader()
  binReader.onload = (ev) => {
    const encoding = isValidUtf8(ev.target.result) ? 'utf-8' : 'gbk'
    const textReader = new FileReader()
    textReader.onload = (ev2) => {
      sqlInput.value = ev2.target.result
      showToast(`SQL文件导入成功！（${encoding.toUpperCase()}）`)
    }
    textReader.readAsText(file, encoding)
  }
  binReader.readAsArrayBuffer(file)
  e.target.value = ''
}

// 自动补全SQL注释（本地字典，直接修改SQL文本）
function autoTranslate() {
  if (!parsed.value) return
  const { sql, count } = autoFillComments(sqlInput.value)
  if (count === 0) { showToast('所有字段已有注释，无需补全'); return }
  sqlInput.value = sql
  showToast(`已自动补全 ${count} 个注释`)
}

// AI识别关联
function aiDetectRelations() {
  if (!parsed.value) return
  const aiRels = detectRelations(parsed.value.tables)
  const existing = parsed.value.relationships || []
  let added = 0
  for (const r of aiRels) {
    const dup = existing.some(e => e.from === r.from && e.fromCol === r.fromCol && e.to === r.to)
    if (!dup) { existing.push(r); added++ }
  }
  parsed.value.relationships = existing
  const layout = layoutAll(parsed.value.tables, existing)
  erNodes.value = layout.nodes
  erEdges.value = layout.edges
  showToast(added > 0 ? `AI识别到 ${added} 个新关联！` : '未发现新关联关系', added > 0 ? 'success' : 'warn')
}

// 美化排版
function beautifyLayout() {
  if (!parsed.value) return
  const layout = layoutBeautify(parsed.value.tables, parsed.value.relationships)
  erNodes.value = layout.nodes
  erEdges.value = layout.edges
  showToast('排版已优化！')
}

// 重新排版
function relayout() {
  if (!parsed.value) return
  const layout = layoutAll(parsed.value.tables, parsed.value.relationships)
  erNodes.value = layout.nodes
  erEdges.value = layout.edges
}

function toggleAttrs() {
  showAttrs.value = !showAttrs.value
}

// 导出
async function exportImg(type) {
  showExportMenu.value = false
  const svgEl = erRef.value?.svgEl
  if (!svgEl) return
  const filename = erBaseName()
  try {
    if (type === 'png') {
      const url = await toPng(svgEl, { backgroundColor: THEMES[currentThemeName.value].entity === '#1e293b' ? '#0f172a' : '#fff', pixelRatio: 2 })
      saveAs(url, `${filename}.png`)
    } else if (type === 'jpeg') {
      const url = await toJpeg(svgEl, { backgroundColor: '#fff', pixelRatio: 2 })
      saveAs(url, `${filename}.jpg`)
    } else if (type === 'svg') {
      const url = await toSvg(svgEl, { backgroundColor: '#fff' })
      const res = await fetch(url)
      saveAs(await res.blob(), `${filename}.svg`)
    } else if (type === 'drawio') {
      const nodes = erRef.value?.local || erNodes.value
      const xml = toDrawioXml(nodes, erRef.value?.localEdges || erEdges.value)
      saveAs(new Blob([xml], { type: 'application/xml' }), `${filename}.drawio`)
    } else if (type === 'drawio-open') {
      const nodes = erRef.value?.local || erNodes.value
      const xml = toDrawioXml(nodes, erRef.value?.localEdges || erEdges.value)
      window.open(`https://app.diagrams.net/#R${btoa(unescape(encodeURIComponent(xml)))}`, '_blank')
    }
    if (type !== 'drawio-open') showToast('导出成功！')
  } catch (e) { showToast('导出失败: ' + e.message, 'error') }
}

// 关闭面板（点击外部）
function closeAll() {
  showThemePanel.value = false
  showStylePanel.value = false
  showExportMenu.value = false
}
</script>

<template>
  <div class="app" @click="closeAll">

    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">论文图表工具</span>
      </div>
      <div class="mode-tabs">
        <button class="mode-tab" :class="{active: appMode==='er'}" @click="appMode='er'">📊 ER图</button>
        <button class="mode-tab" :class="{active: appMode==='usecase'}" @click="appMode='usecase'">👤 用例图</button>
        <button class="mode-tab" :class="{active: appMode==='class'}" @click="appMode='class'">🏷 类图</button>
        <button class="mode-tab" :class="{active: appMode==='sequence'}" @click="appMode='sequence'">⏱ 时序图</button>
        <button class="mode-tab" :class="{active: appMode==='flow'}" @click="appMode='flow'">🔀 流程图</button>
        <button class="mode-tab" :class="{active: appMode==='deployment'}" @click="appMode='deployment'">🖥 部署图</button>
        <button class="mode-tab" :class="{active: appMode==='architecture'}" @click="appMode='architecture'">🏗 架构图</button>
        <button class="mode-tab" :class="{active: appMode==='function'}" @click="appMode='function'">🧱 功能结构图</button>
      </div>
      <div class="header-stats" v-if="parsed && appMode==='er'">
        <span class="stat-badge">{{ tableCount }} 张表</span>
        <span class="stat-badge">{{ relCount }} 个关联</span>
      </div>
    </header>

    <!-- 用例图模式 -->
    <UseCasePage v-if="appMode==='usecase'" />
    <ClassDiagramPage v-if="appMode==='class'" />
    <SequenceDiagramPage v-if="appMode==='sequence'" />
    <FlowDiagramPage v-if="appMode==='flow'" />
    <DeploymentDiagramPage v-if="appMode==='deployment'" />
    <ArchitectureDiagramPage v-if="appMode==='architecture'" />
    <FunctionStructurePage v-if="appMode==='function'" />

    <!-- ER图模式：主体左右分栏 -->
    <div class="main" v-if="appMode==='er'" @click.stop>

      <!-- ── 左侧 SQL 输入 ── -->
      <div class="left-panel">
        <div class="left-header">
          <div class="left-title">
            <span class="icon">📄</span>
            <span>输入SQL语句</span>
          </div>
          <div class="left-actions">
            <button class="btn-upload" @click="triggerFileUpload" title="上传SQL文件">
              <span>☁</span>
            </button>
            <input type="file" ref="fileInput" accept=".sql,.txt,.SQL" style="display:none" @change="onFileUpload"/>
            <button class="btn-ai" @click="aiDetectRelations" :disabled="!parsed">
              <span>✦</span> AI识别关联
            </button>
            <button class="btn-translate" @click="autoTranslate" :disabled="!parsed">
              🌐 自动注释
            </button>
            <button class="btn-gen" @click="relayout" :disabled="!parsed">
              ▶ 生成ER图
            </button>
          </div>
        </div>
        <textarea
          v-model="sqlInput"
          class="sql-editor"
          placeholder="请输入SQL建表语句，支持多个CREATE TABLE语句..."
          spellcheck="false"
        ></textarea>
        <div class="left-footer">解析成功后可在图中双击修改、拖拽调整位置</div>
      </div>

      <!-- ── 右侧 ER 图 ── -->
      <div class="right-panel">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="icon">🖼</span>
            <span class="toolbar-title">ER 图预览</span>
            <span class="toolbar-hint">论文标准黑白风格，节点可拖拽、双击文本可编辑、滚轮缩放</span>
          </div>
          <div class="toolbar-right">
            <div class="caption-inline">
              <span>图</span>
              <input type="number" min="1" v-model.number="erChapter" />
              <span>-</span>
              <input type="number" min="1" v-model.number="erFigure" />
              <input class="caption-title-input" v-model="erCaptionTitle" placeholder="图标题" />
              <button class="btn-cap" @click="copyErCaption">📋 图注</button>
            </div>

            <!-- 修改样式 -->
            <div class="dropdown-wrap" @click.stop>
              <button class="btn-bar" @click="showStylePanel=!showStylePanel; showThemePanel=false; showExportMenu=false">
                ✏️ 修改样式
              </button>
              <div class="dropdown-panel style-panel" v-if="showStylePanel">
                <div class="style-row">
                  <label>实体宽度</label>
                  <input type="range" min="80" max="200" v-model.number="styleConfig.entityW"/>
                  <span>{{ styleConfig.entityW }}</span>
                </div>
                <div class="style-row">
                  <label>实体高度</label>
                  <input type="range" min="30" max="80" v-model.number="styleConfig.entityH"/>
                  <span>{{ styleConfig.entityH }}</span>
                </div>
                <div class="style-row">
                  <label>属性椭圆宽</label>
                  <input type="range" min="30" max="80" v-model.number="styleConfig.attrRx"/>
                  <span>{{ styleConfig.attrRx }}</span>
                </div>
                <div class="style-row">
                  <label>字体大小</label>
                  <input type="range" min="10" max="18" v-model.number="styleConfig.fontSize"/>
                  <span>{{ styleConfig.fontSize }}</span>
                </div>
                <div class="style-row">
                  <label>主键下划线</label>
                  <input type="checkbox" v-model="styleConfig.showPkUnderline"/>
                </div>
              </div>
            </div>

            <!-- 美化排版 -->
            <button class="btn-bar btn-primary" @click="beautifyLayout" :disabled="!parsed">
              ✦ 美化排版
            </button>

            <!-- 隐藏/显示属性 -->
            <button class="btn-bar" @click="toggleAttrs" :disabled="!parsed">
              {{ showAttrs ? '🔽 隐藏属性' : '🔼 显示属性' }}
            </button>

            <!-- 导出下拉 -->
            <div class="dropdown-wrap" @click.stop>
              <div class="export-btn-group">
                <button class="btn-export-main" @click="exportImg('png')" :disabled="!parsed">
                  📥 导出图片
                </button>
                <button class="btn-export-arrow" @click="showExportMenu=!showExportMenu; showThemePanel=false; showStylePanel=false" :disabled="!parsed">▾</button>
              </div>
              <div class="dropdown-panel export-panel" v-if="showExportMenu">
                <div class="export-item" @click="exportImg('png')">📷 导出 PNG</div>
                <div class="export-item" @click="exportImg('jpeg')">🖼 导出 JPEG</div>
                <div class="export-item" @click="exportImg('svg')">📐 导出 SVG</div>
                <div class="divider"></div>
                <div class="export-item" @click="exportImg('drawio')">💾 下载 Draw.io</div>
                <div class="export-item" @click="exportImg('drawio-open')">✏️ 在 Draw.io 中编辑</div>
              </div>
            </div>

          </div>
        </div>

        <!-- ER 图画布 -->
        <div class="er-canvas">
          <ErDiagram
            ref="erRef"
            :nodes="visibleNodes"
            :edges="erEdges"
            :theme="currentTheme"
            :styleConfig="styleConfig"
          />
          <div v-if="!parsed" class="placeholder">
            <div class="placeholder-icon">◈</div>
            <p>在左侧输入SQL建表语句</p>
            <p class="placeholder-sub">自动解析并生成ER图</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast通知 -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="'toast-'+toast.type">
        {{ toast.msg }}
      </div>
    </transition>

  </div>
</template>

<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; }
body { font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #1e293b; }

#app { height: 100%; }

.app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* ── 顶部导航 ── */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px; min-height: 58px; flex-shrink: 0;
  background: #fff; border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,.06); gap: 12px; flex-wrap: wrap;
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 22px; color: #3b82f6; }
.logo-text { font-size: 18px; font-weight: 700; color: #1e293b; }
.mode-tabs {
  display: flex; gap: 2px; background: #f1f5f9; border-radius: 8px; padding: 3px;
  flex-wrap: wrap; max-width: min(100%, 980px);
}
.mode-tab {
  padding: 5px 16px; border: none; border-radius: 6px; background: transparent;
  font-size: 13px; cursor: pointer; color: #64748b; font-weight: 500; transition: all 0.15s;
}
.mode-tab:hover { color: #334155; }
.mode-tab.active { background: #fff; color: #3b82f6; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.header-stats { display: flex; gap: 8px; }
.stat-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; background: #eff6ff; color: #3b82f6; font-weight: 500; }

/* ── 主体 ── */
.main { display: flex; flex: 1; overflow: hidden; min-height: 0; }

/* ── 左侧 ── */
.left-panel {
  width: 420px; min-width: 300px; max-width: 50%;
  display: flex; flex-direction: column;
  border-right: 1px solid #e2e8f0; background: #fff; flex-shrink: 0;
}
.left-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; gap: 8px; flex-wrap: wrap;
}
.left-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #1e293b; }
.left-actions { display: flex; align-items: center; gap: 6px; }
.btn-upload {
  width: 30px; height: 30px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #fff; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
}
.btn-upload:hover { background: #f1f5f9; }
.btn-ai {
  padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
  font-size: 12px; cursor: pointer; color: #7c3aed; font-weight: 500; display: flex; align-items: center; gap: 4px;
}
.btn-ai:hover { background: #f5f3ff; border-color: #c4b5fd; }
.btn-ai:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-translate {
  padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;
  font-size: 12px; cursor: pointer; color: #0891b2; font-weight: 500; display: flex; align-items: center; gap: 4px;
}
.btn-translate:hover { background: #ecfeff; border-color: #67e8f9; }
.btn-translate:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-gen {
  padding: 5px 14px; border: none; border-radius: 6px; background: #3b82f6;
  font-size: 12px; cursor: pointer; color: #fff; font-weight: 600;
}
.btn-gen:hover { background: #2563eb; }
.btn-gen:disabled { opacity: 0.5; cursor: not-allowed; }

.sql-editor {
  flex: 1; padding: 14px; border: none; outline: none; resize: none;
  font-family: 'Consolas', 'JetBrains Mono', monospace;
  font-size: 13px; line-height: 1.7; color: #334155;
  background: #f8fafc; min-height: 0;
}
.left-footer { padding: 8px 14px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; flex-shrink: 0; }

/* ── 右侧 ── */
.right-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; min-height: 0; }

.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px; border-bottom: 1px solid #e2e8f0;
  background: #fff; flex-shrink: 0; gap: 10px; flex-wrap: wrap;
}
.toolbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.toolbar-title { font-size: 14px; font-weight: 600; white-space: nowrap; }
.toolbar-hint { font-size: 11px; color: #94a3b8; white-space: nowrap; }
.toolbar-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.caption-inline {
  display: flex; align-items: center; gap: 4px;
  padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #fff; font-size: 11px; color: #64748b;
}
.caption-inline input {
  width: 54px; padding: 3px 4px; border: 1px solid #cbd5e1; border-radius: 4px;
  font-size: 11px;
}
.caption-inline .caption-title-input { width: 120px; }
.btn-cap {
  padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 5px;
  background: #fff; font-size: 11px; cursor: pointer; color: #475569;
}
.btn-cap:hover { background: #f1f5f9; }

.btn-bar {
  padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #fff; font-size: 12px; cursor: pointer; color: #475569; white-space: nowrap;
  transition: all 0.15s; display: flex; align-items: center; gap: 4px;
}
.btn-bar:hover { background: #f1f5f9; border-color: #cbd5e1; }
.btn-bar:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-bar.btn-primary { background: #eff6ff; color: #3b82f6; border-color: #bfdbfe; font-weight: 600; }
.btn-bar.btn-primary:hover { background: #dbeafe; }
.btn-bar.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

/* 导出按钮组 */
.export-btn-group { display: flex; }
.btn-export-main {
  padding: 5px 12px; border: 1px solid #3b82f6; border-right: none; border-radius: 6px 0 0 6px;
  background: #3b82f6; color: #fff; font-size: 12px; cursor: pointer; font-weight: 600; white-space: nowrap;
}
.btn-export-main:hover { background: #2563eb; }
.btn-export-main:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-export-arrow {
  padding: 5px 8px; border: 1px solid #3b82f6; border-radius: 0 6px 6px 0;
  background: #2563eb; color: #fff; font-size: 12px; cursor: pointer;
}
.btn-export-arrow:hover { background: #1d4ed8; }
.btn-export-arrow:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── 下拉面板 ── */
.dropdown-wrap { position: relative; }
.dropdown-panel {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 200;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); overflow: hidden; min-width: 160px;
}

/* 主题面板 */
.theme-panel { padding: 6px; }
.theme-item {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px;
  border-radius: 5px; cursor: pointer; font-size: 13px; transition: background 0.1s;
}
.theme-item:hover { background: #f1f5f9; }
.theme-item.active { background: #eff6ff; color: #3b82f6; font-weight: 600; }
.theme-dot { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; }

/* 样式面板 */
.style-panel { padding: 12px 14px; min-width: 240px; }
.style-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; }
.style-row label { width: 80px; color: #64748b; flex-shrink: 0; }
.style-row input[type=range] { flex: 1; cursor: pointer; }
.style-row span { width: 28px; text-align: right; color: #475569; font-weight: 600; }
.style-row input[type=checkbox] { cursor: pointer; width: 16px; height: 16px; }

/* 导出面板 */
.export-panel { min-width: 180px; }
.export-item { padding: 9px 14px; font-size: 13px; cursor: pointer; transition: background 0.1s; }
.export-item:hover { background: #f1f5f9; }
.divider { height: 1px; background: #e2e8f0; margin: 4px 0; }

/* ── ER画布 ── */
.er-canvas { flex: 1; position: relative; overflow: hidden; min-height: 0; min-width: 0; }

.placeholder {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
}
.placeholder-icon { font-size: 52px; color: #cbd5e1; margin-bottom: 12px; }
.placeholder p { font-size: 15px; color: #94a3b8; }
.placeholder-sub { font-size: 12px; color: #cbd5e1; margin-top: 4px; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  padding: 10px 24px; border-radius: 24px; font-size: 14px; font-weight: 500;
  box-shadow: 0 4px 16px rgba(0,0,0,.15); z-index: 9999; pointer-events: none;
}
.toast-success { background: #22c55e; color: #fff; }
.toast-warn { background: #f59e0b; color: #fff; }
.toast-error { background: #ef4444; color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }

/* ── 图标 ── */
.icon { font-size: 16px; }
</style>
