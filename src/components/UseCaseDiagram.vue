<template>
  <div class="uc-wrap" ref="wrap"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onMove"
    @mouseup="onEnd" @mouseleave="onEnd">

    <svg ref="svgEl" :width="svgW" :height="svgH"
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      xmlns="http://www.w3.org/2000/svg"
      style="font-family:'Microsoft YaHei','SimSun',sans-serif;display:block">

      <defs>
        <marker id="uc-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="none" :stroke="theme.line || '#666'" stroke-width="1"/>
        </marker>
        <marker id="uc-gen-arrow" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="#fff" :stroke="theme.line || '#666'" stroke-width="1.2"/>
        </marker>
      </defs>

      <!-- 连线 -->
      <template v-for="e in localEdges" :key="e.id">
        <!-- 关联: 实线无箭头 -->
        <line v-if="e.type==='association'"
          :x1="nd(e.fromId)?.x" :y1="nd(e.fromId)?.y"
          :x2="edgeTarget(e).x" :y2="edgeTarget(e).y"
          :stroke="theme.line||'#555'" stroke-width="1.3"/>

        <!-- Include: 虚线+箭头 -->
        <template v-if="e.type==='include'">
          <line :x1="nd(e.fromId)?.x" :y1="nd(e.fromId)?.y"
            :x2="edgeTarget(e).x" :y2="edgeTarget(e).y"
            :stroke="theme.includeLine||'#888'" stroke-width="1.2"
            stroke-dasharray="6,3" marker-end="url(#uc-arrow)"/>
          <text :x="edgeMid(e).x" :y="edgeMid(e).y - 6"
            text-anchor="middle" :font-size="10" :fill="theme.includeLine||'#888'"
            font-style="italic">&lt;&lt;include&gt;&gt;</text>
        </template>

        <!-- Extend: 虚线+箭头 -->
        <template v-if="e.type==='extend'">
          <line :x1="nd(e.fromId)?.x" :y1="nd(e.fromId)?.y"
            :x2="edgeTarget(e).x" :y2="edgeTarget(e).y"
            :stroke="theme.extendLine||'#9673a6'" stroke-width="1.2"
            stroke-dasharray="6,3" marker-end="url(#uc-arrow)"/>
          <text :x="edgeMid(e).x" :y="edgeMid(e).y - 6"
            text-anchor="middle" :font-size="10" :fill="theme.extendLine||'#9673a6'"
            font-style="italic">&lt;&lt;extend&gt;&gt;</text>
        </template>

        <!-- 泛化: 实线+空心三角 -->
        <line v-if="e.type==='generalization'"
          :x1="nd(e.fromId)?.x" :y1="nd(e.fromId)?.y"
          :x2="edgeTarget(e).x" :y2="edgeTarget(e).y"
          :stroke="theme.line||'#555'" stroke-width="1.3"
          marker-end="url(#uc-gen-arrow)"/>
      </template>

      <!-- 用例椭圆 -->
      <g v-for="n in ucNodes" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <ellipse :rx="n.rx" :ry="n.ry"
          :fill="ucFill(n)" :stroke="ucStroke(n)" stroke-width="1.5"/>
        <text text-anchor="middle" dy="5" :font-size="fontSize" :fill="theme.ucText||'#333'">
          {{ n.name }}
        </text>
      </g>

      <!-- Actor火柴人 -->
      <g v-for="n in actorNodes" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <!-- 头 -->
        <circle cx="0" cy="-24" r="14" fill="none" :stroke="theme.actorStroke||'#333'" stroke-width="2.5"/>
        <!-- 身体 -->
        <line x1="0" y1="-10" x2="0" y2="18" :stroke="theme.actorStroke||'#333'" stroke-width="2.5"/>
        <!-- 手臂 -->
        <line x1="-22" y1="2" x2="22" y2="2" :stroke="theme.actorStroke||'#333'" stroke-width="2.5"/>
        <!-- 左腿 -->
        <line x1="0" y1="18" x2="-16" y2="40" :stroke="theme.actorStroke||'#333'" stroke-width="2.5"/>
        <!-- 右腿 -->
        <line x1="0" y1="18" x2="16" y2="40" :stroke="theme.actorStroke||'#333'" stroke-width="2.5"/>
        <!-- 名字 -->
        <text x="0" y="60" text-anchor="middle" :font-size="fontSize + 1" font-weight="bold"
          :fill="theme.actorText||'#333'">{{ n.name }}</text>
      </g>

    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineExpose } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  canvasWidth: { type: Number, default: 800 },
  canvasHeight: { type: Number, default: 600 },
  theme: { type: Object, default: () => ({}) },
  fontSize: { type: Number, default: 13 }
})

const wrap = ref(null)
const svgEl = ref(null)
defineExpose({ svgEl })

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

function edgeTarget(e) {
  const to = nd(e.toId)
  return { x: to.x, y: to.y }
}

function edgeMid(e) {
  const f = nd(e.fromId)
  const t = nd(e.toId)
  return { x: (f.x + t.x) / 2, y: (f.y + t.y) / 2 }
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

// ─── 视口与缩放 ───
const svgW = ref(800)
const svgH = ref(600)
const vb = ref({ x: 0, y: 0, w: 800, h: 600 })

onMounted(() => {
  if (wrap.value) {
    svgW.value = wrap.value.clientWidth
    svgH.value = wrap.value.clientHeight
    vb.value = { x: -20, y: -20, w: svgW.value, h: svgH.value }
  }
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
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  background: #fafbfc;
  background-image: radial-gradient(circle, #e2e8f0 1px, transparent 1px);
  background-size: 20px 20px;
}
.uc-wrap:active { cursor: grabbing; }
</style>
