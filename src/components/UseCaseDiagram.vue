<template>
  <div class="uc-wrap" :class="{fullscreen: isFullscreen}" ref="wrap"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onMove"
    @mouseup="onEnd" @mouseleave="onEnd">

    <div class="zoom-controls">
      <button class="zoom-btn" @click.stop="zoomIn" title="放大">＋</button>
      <button class="zoom-btn" @click.stop="zoomOut" title="缩小">－</button>
      <button class="zoom-btn" @click.stop="fitView" title="适应画布">⊡</button>
      <button class="zoom-btn" @click.stop="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">{{ isFullscreen ? '⊠' : '⛶' }}</button>
    </div>

    <svg ref="svgEl" :width="svgW" :height="svgH"
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      xmlns="http://www.w3.org/2000/svg"
      style="font-family:'Microsoft YaHei','SimSun',sans-serif;display:block">

      <defs>
        <marker id="uc-arrow-include" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="none" :stroke="theme.includeLine || '#666'" stroke-width="1"/>
        </marker>
        <marker id="uc-arrow-extend" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="none" :stroke="theme.extendLine || '#666'" stroke-width="1"/>
        </marker>
        <marker id="uc-gen-arrow" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#fff" :stroke="theme.line || '#666'" stroke-width="1.2"/>
        </marker>
      </defs>

      <!-- 连线 -->
      <template v-for="e in localEdges" :key="e.id">
        <!-- 关联: 实线无箭头 -->
        <line v-if="e.type==='association'"
          :x1="edgeLine(e).x1" :y1="edgeLine(e).y1"
          :x2="edgeLine(e).x2" :y2="edgeLine(e).y2"
          :stroke="theme.line||'#555'" stroke-width="1.3"/>

        <!-- Include: 虚线+箭头 -->
        <template v-if="e.type==='include'">
          <line :x1="edgeLine(e).x1" :y1="edgeLine(e).y1"
            :x2="edgeLine(e).x2" :y2="edgeLine(e).y2"
            :stroke="theme.includeLine||'#888'" stroke-width="1.2"
            stroke-dasharray="6,3" marker-end="url(#uc-arrow-include)"/>
          <text :x="edgeMid(e).x" :y="edgeMid(e).y - 6"
            text-anchor="middle" :font-size="10" :fill="theme.includeLine||'#888'"
            font-style="italic" paint-order="stroke" stroke="#fff" stroke-width="3">&lt;&lt;include&gt;&gt;</text>
        </template>

        <!-- Extend: 虚线+箭头 -->
        <template v-if="e.type==='extend'">
          <line :x1="edgeLine(e).x1" :y1="edgeLine(e).y1"
            :x2="edgeLine(e).x2" :y2="edgeLine(e).y2"
            :stroke="theme.extendLine||'#9673a6'" stroke-width="1.2"
            stroke-dasharray="6,3" marker-end="url(#uc-arrow-extend)"/>
          <text :x="edgeMid(e).x" :y="edgeMid(e).y - 6"
            text-anchor="middle" :font-size="10" :fill="theme.extendLine||'#9673a6'"
            font-style="italic" paint-order="stroke" stroke="#fff" stroke-width="3">&lt;&lt;extend&gt;&gt;</text>
        </template>

        <!-- 泛化: 实线+空心三角 -->
        <line v-if="e.type==='generalization'"
          :x1="edgeLine(e).x1" :y1="edgeLine(e).y1"
          :x2="edgeLine(e).x2" :y2="edgeLine(e).y2"
          :stroke="theme.line||'#555'" stroke-width="1.3"
          marker-end="url(#uc-gen-arrow)"/>
      </template>

      <!-- 用例椭圆 -->
      <g v-for="n in ucNodes" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <ellipse :rx="n.rx" :ry="n.ry"
          :fill="ucFill(n)" :stroke="ucStroke(n)" stroke-width="1.5"/>
        <text text-anchor="middle" :font-size="fontSize" :fill="theme.ucText||'#333'">
          <tspan
            v-for="(line, idx) in wrapLabel(n.name, n.ucType)"
            :key="`${n.id}_${idx}`"
            x="0"
            :dy="idx===0 ? firstDy(n.name, n.ucType) : 14"
          >
            {{ line }}
          </tspan>
        </text>
      </g>

      <!-- Actor火柴人 -->
      <g v-for="n in actorNodes" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <!-- 头 -->
        <circle cx="0" cy="-24" r="13" fill="none" :stroke="theme.actorStroke||'#333'" stroke-width="2.2"/>
        <!-- 身体 -->
        <line x1="0" y1="-10" x2="0" y2="18" :stroke="theme.actorStroke||'#333'" stroke-width="2.2"/>
        <!-- 手臂 -->
        <line x1="-20" y1="2" x2="20" y2="2" :stroke="theme.actorStroke||'#333'" stroke-width="2.2"/>
        <!-- 左腿 -->
        <line x1="0" y1="18" x2="-15" y2="40" :stroke="theme.actorStroke||'#333'" stroke-width="2.2"/>
        <!-- 右腿 -->
        <line x1="0" y1="18" x2="15" y2="40" :stroke="theme.actorStroke||'#333'" stroke-width="2.2"/>
        <!-- 名字 -->
        <text x="0" y="60" text-anchor="middle" :font-size="fontSize + 1" font-weight="bold"
          :fill="theme.actorText||'#333'">{{ n.name }}</text>
      </g>

    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  canvasWidth: { type: Number, default: 800 },
  canvasHeight: { type: Number, default: 600 },
  theme: { type: Object, default: () => ({}) },
  fontSize: { type: Number, default: 13 }
})

const emit = defineEmits(['ready'])

const wrap = ref(null)
const svgEl = ref(null)
const isFullscreen = ref(false)

// 本地可拖拽副本
const local = ref([])
const localEdges = ref([])

watch(() => props.nodes, (v) => {
  local.value = JSON.parse(JSON.stringify(v))
}, { immediate: true, deep: true })

watch(() => props.edges, (v) => {
  localEdges.value = JSON.parse(JSON.stringify(v))
}, { immediate: true, deep: true })

const actorNodes = computed(() => local.value.filter(n => n.type === 'actor'))
const ucNodes = computed(() => local.value.filter(n => n.type === 'usecase'))

function nd(id) {
  return local.value.find(n => n.id === id) || { x: 0, y: 0 }
}

function nodeRadiusX(node) {
  if (node.type === 'usecase') return node.rx || 78
  return 24
}

function nodeRadiusY(node) {
  if (node.type === 'usecase') return node.ry || 24
  return 42
}

function borderPoint(fromNode, toNode) {
  const dx = (toNode.x || 0) - (fromNode.x || 0)
  const dy = (toNode.y || 0) - (fromNode.y || 0)
  const rx = nodeRadiusX(fromNode)
  const ry = nodeRadiusY(fromNode)
  const scale = 1 / Math.max(Math.abs(dx) / rx, Math.abs(dy) / ry, 1e-5)
  return {
    x: fromNode.x + dx * scale,
    y: fromNode.y + dy * scale
  }
}

function edgeLine(e) {
  const from = nd(e.fromId)
  const to = nd(e.toId)
  const start = borderPoint(from, to)
  const end = borderPoint(to, from)
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
}

function edgeMid(e) {
  const ln = edgeLine(e)
  return { x: (ln.x1 + ln.x2) / 2, y: (ln.y1 + ln.y2) / 2 }
}

function ucFill(n) {
  if (n.ucType === 'include') return props.theme.includeFill || '#fff2cc'
  if (n.ucType === 'extend') return props.theme.extendFill || '#e1d5e7'
  return props.theme.ucFill || '#dae8fc'
}

function ucStroke(n) {
  if (n.ucType === 'include') return props.theme.includeStroke || '#d6b656'
  if (n.ucType === 'extend') return props.theme.extendStroke || '#9673a6'
  return props.theme.ucStroke || '#6c8ebf'
}

function wrapLabel(text, ucType) {
  const raw = String(text || '').trim()
  if (!raw) return ['']
  const maxChars = ucType === 'main' ? 12 : 10
  if (raw.length <= maxChars) return [raw]

  const lines = []
  let cursor = 0
  while (cursor < raw.length && lines.length < 3) {
    lines.push(raw.slice(cursor, cursor + maxChars))
    cursor += maxChars
  }
  if (cursor < raw.length) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`
  }
  return lines
}

function firstDy(text, ucType) {
  const count = wrapLabel(text, ucType).length
  return count === 1 ? 5 : -(count - 1) * 7 + 5
}

// ─── 视口与缩放 ───
const svgW = ref(800)
const svgH = ref(600)
const vb = ref({ x: 0, y: 0, w: 800, h: 600 })

function updateSize() {
  if (!wrap.value) return
  svgW.value = wrap.value.clientWidth || 800
  svgH.value = wrap.value.clientHeight || 600
}

function fitView() {
  if (!local.value.length) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of local.value) {
    if (n.type === 'actor') {
      minX = Math.min(minX, n.x - 30)
      minY = Math.min(minY, n.y - 42)
      maxX = Math.max(maxX, n.x + 30)
      maxY = Math.max(maxY, n.y + 70)
    } else {
      const rx = n.rx || 78, ry = n.ry || 24
      minX = Math.min(minX, n.x - rx)
      minY = Math.min(minY, n.y - ry)
      maxX = Math.max(maxX, n.x + rx)
      maxY = Math.max(maxY, n.y + ry)
    }
  }
  const pad = 80
  const cw = maxX - minX + pad * 2
  const ch = maxY - minY + pad * 2
  const aspect = (svgW.value || 800) / (svgH.value || 600)
  let w = cw, h = ch
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  vb.value = {
    x: minX - pad - (w - cw) / 2,
    y: minY - pad - (h - ch) / 2,
    w, h
  }
}

function zoomIn() {
  const cx = vb.value.x + vb.value.w / 2
  const cy = vb.value.y + vb.value.h / 2
  vb.value.w *= 0.8; vb.value.h *= 0.8
  vb.value.x = cx - vb.value.w / 2
  vb.value.y = cy - vb.value.h / 2
}

function zoomOut() {
  const cx = vb.value.x + vb.value.w / 2
  const cy = vb.value.y + vb.value.h / 2
  vb.value.w *= 1.25; vb.value.h *= 1.25
  vb.value.x = cx - vb.value.w / 2
  vb.value.y = cy - vb.value.h / 2
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => { updateSize(); fitView() })
}

function onKeydown(e) {
  if (e.key === 'Escape' && isFullscreen.value) isFullscreen.value = false
}

onMounted(() => {
  updateSize()
  fitView()
  window.addEventListener('resize', updateSize)
  document.addEventListener('keydown', onKeydown)
  emit('ready')
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSize)
  document.removeEventListener('keydown', onKeydown)
})

watch(() => props.nodes, () => {
  nextTick(() => fitView())
})

function onWheel(e) {
  const scale = e.deltaY > 0 ? 1.08 : 0.93
  const rect = svgEl.value.getBoundingClientRect()
  const mx = (e.clientX - rect.left) / rect.width * vb.value.w + vb.value.x
  const my = (e.clientY - rect.top) / rect.height * vb.value.h + vb.value.y
  vb.value = {
    x: mx - (mx - vb.value.x) * scale,
    y: my - (my - vb.value.y) * scale,
    w: vb.value.w * scale,
    h: vb.value.h * scale
  }
}

// ─── 导出 ───
function exportSvgString() {
  if (!svgEl.value) return ''
  return new XMLSerializer().serializeToString(svgEl.value)
}

async function exportPngDataUrl(scale = 2) {
  const svgStr = exportSvgString()
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('PNG export failed')) }
    img.src = url
  })
}

defineExpose({ svgEl, exportSvgString, exportPngDataUrl })

// ─── 拖拽节点 ───
let dragging = null
let panning = false
let lastPan = { x: 0, y: 0 }

function onDragStart(e, node) {
  dragging = { node, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }
}

function onPanStart(e) {
  if (!dragging) {
    panning = true
    lastPan = { x: e.clientX, y: e.clientY }
  }
}

function onMove(e) {
  if (dragging) {
    const rect = svgEl.value.getBoundingClientRect()
    const scaleX = vb.value.w / rect.width
    const scaleY = vb.value.h / rect.height
    dragging.node.x = dragging.ox + (e.clientX - dragging.sx) * scaleX
    dragging.node.y = dragging.oy + (e.clientY - dragging.sy) * scaleY
  } else if (panning) {
    const rect = svgEl.value.getBoundingClientRect()
    const dx = (e.clientX - lastPan.x) / rect.width * vb.value.w
    const dy = (e.clientY - lastPan.y) / rect.height * vb.value.h
    vb.value.x -= dx
    vb.value.y -= dy
    lastPan = { x: e.clientX, y: e.clientY }
  }
}

function onEnd() {
  dragging = null
  panning = false
}
</script>

<style scoped>
.uc-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background: #fff;
  border-top: 1px solid #f1f5f9;
}
.uc-wrap:active { cursor: grabbing; }
.uc-wrap.fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  width: 100vw; height: 100vh;
}
.zoom-controls {
  position: absolute; top: 10px; right: 10px; z-index: 10;
  display: flex; flex-direction: column; gap: 4px;
}
.zoom-btn {
  width: 32px; height: 32px;
  border: 1px solid #d1d5db; border-radius: 6px;
  background: #fff; font-size: 15px; cursor: pointer;
  line-height: 30px; text-align: center; padding: 0;
  color: #333; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.zoom-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
</style>
