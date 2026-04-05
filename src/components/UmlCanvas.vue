<template>
  <div class="uml-wrap" :class="{fullscreen: isFullscreen}" ref="wrap"
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
        <marker id="arr-block" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#111"/></marker>
        <marker id="arr-block-empty" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff" stroke="#111" stroke-width="1"/></marker>
        <marker id="arr-open" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke="#111" stroke-width="1.5"/></marker>
        <marker id="arr-diamond" viewBox="0 0 14 10" refX="14" refY="5" markerWidth="10" markerHeight="8" orient="auto"><path d="M0 5L7 0L14 5L7 10z" fill="#111"/></marker>
        <marker id="arr-diamond-empty" viewBox="0 0 14 10" refX="14" refY="5" markerWidth="10" markerHeight="8" orient="auto"><path d="M0 5L7 0L14 5L7 10z" fill="#fff" stroke="#111" stroke-width="1"/></marker>
      </defs>

      <!-- Edges -->
      <g v-for="e in localEdges" :key="e.id">
        <polyline :points="routeStr(e)" fill="none"
          :stroke="edgeStroke(e)" :stroke-width="edgeSW(e)" :stroke-dasharray="edgeDash(e)"
          :marker-end="edgeMarkerEnd(e)" :marker-start="edgeMarkerStart(e)"/>
        <text v-if="e.label" :x="labelPos(e).x" :y="labelPos(e).y" text-anchor="middle" font-size="11" fill="#444" :font-style="e.labelItalic?'italic':'normal'">
          <tspan dy="-8">{{e.label}}</tspan>
        </text>
        <text v-if="e.fromLabel" :x="multPos(e,'from').x" :y="multPos(e,'from').y" text-anchor="middle" font-size="11" fill="#444">{{e.fromLabel}}</text>
        <text v-if="e.toLabel" :x="multPos(e,'to').x" :y="multPos(e,'to').y" text-anchor="middle" font-size="11" fill="#444">{{e.toLabel}}</text>
      </g>

      <!-- Nodes -->
      <g v-for="node in localNodes" :key="node.id"
        :transform="`translate(${node.x},${node.y})`"
        @mousedown.stop="onDragStart($event, node)" style="cursor:move">

        <!-- classBox -->
        <template v-if="node.shape==='classBox'">
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#111" stroke-width="1.5" rx="0"/>
          <text v-if="node.stereotype" :x="node.w/2" y="16" text-anchor="middle" font-size="11" fill="#111">&laquo;{{node.stereotype}}&raquo;</text>
          <text :x="node.w/2" :y="node.stereotype?34:20" text-anchor="middle" font-size="14" font-weight="bold" fill="#111"
            :font-style="node.stereotype==='abstract'?'italic':'normal'"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <line :x1="0" :y1="classHdrH(node)" :x2="node.w" :y2="classHdrH(node)" stroke="#111" stroke-width="1"/>
          <text v-for="(a,i) in (node.compartments?.[0]?.items||[])" :key="'a'+i" x="8" :y="classHdrH(node)+16+i*18" font-size="12" fill="#111">{{a}}</text>
          <line :x1="0" :y1="classAttrY(node)" :x2="node.w" :y2="classAttrY(node)" stroke="#111" stroke-width="1"/>
          <text v-for="(m,i) in (node.compartments?.[1]?.items||[])" :key="'m'+i" x="8" :y="classAttrY(node)+16+i*18" font-size="12" fill="#111">{{m}}</text>
        </template>

        <!-- rect -->
        <template v-else-if="node.shape==='rect'">
          <rect :width="node.w" :height="node.h" :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#111')" :stroke-width="ns(node,'strokeWidth',1.5)" rx="0"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle" :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','normal')" :fill="ns(node,'fontColor','#111')"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else x="2" :y="node.h/2-10" :width="node.w-4" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- roundedRect -->
        <template v-else-if="node.shape==='roundedRect'">
          <rect :width="node.w" :height="node.h" :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#111')" :stroke-width="ns(node,'strokeWidth',1.5)" rx="8"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle" :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','bold')" fill="#111"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else x="2" :y="node.h/2-10" :width="node.w-4" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- ellipse -->
        <template v-else-if="node.shape==='ellipse'">
          <ellipse :cx="node.w/2" :cy="node.h/2" :rx="node.w/2" :ry="node.h/2" :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#111')" stroke-width="1.5"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle" font-size="13" fill="#111"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else :x="node.w*0.15" :y="node.h/2-10" :width="node.w*0.7" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- diamond -->
        <template v-else-if="node.shape==='diamond'">
          <polygon :points="`${node.w/2},0 ${node.w},${node.h/2} ${node.w/2},${node.h} 0,${node.h/2}`" fill="#fff" stroke="#111" stroke-width="1.5"/>
          <text :x="node.w/2" :y="node.h/2+5" text-anchor="middle" font-size="12" fill="#111">{{node.label}}</text>
        </template>

        <!-- startState -->
        <template v-else-if="node.shape==='startState'">
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2" fill="#111" stroke="#111"/>
        </template>

        <!-- endState -->
        <template v-else-if="node.shape==='endState'">
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2" fill="none" stroke="#111" stroke-width="2"/>
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2-5" fill="#111"/>
        </template>

        <!-- forkjoin -->
        <template v-else-if="node.shape==='forkjoin'">
          <rect :width="node.w" :height="node.h" fill="#111" stroke="#111" rx="2"/>
        </template>

        <!-- actor -->
        <template v-else-if="node.shape==='actor'">
          <circle :cx="node.w/2" cy="12" r="10" fill="none" stroke="#111" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="22" :x2="node.w/2" y2="46" stroke="#111" stroke-width="1.5"/>
          <line :x1="node.w/2-16" y1="30" :x2="node.w/2+16" y2="30" stroke="#111" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="46" :x2="node.w/2-12" y2="64" stroke="#111" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="46" :x2="node.w/2+12" y2="64" stroke="#111" stroke-width="1.5"/>
          <text :x="node.w/2" :y="node.h-2" text-anchor="middle" font-size="13" font-weight="bold" fill="#111"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
        </template>

        <!-- cube -->
        <template v-else-if="node.shape==='cube'">
          <path :d="cubePath(node.w,node.h)" fill="#fcfcfc" stroke="#111" stroke-width="1.5"/>
          <text v-if="node.stereotype" :x="node.w/2" y="18" text-anchor="middle" font-size="11" font-style="italic" fill="#111">{{node.stereotype}}</text>
          <text :x="node.w/2" :y="node.stereotype?34:22" text-anchor="middle" font-size="14" font-weight="bold" fill="#111">{{node.label}}</text>
          <template v-for="(child,ci) in (node.children||[])" :key="ci">
            <rect :x="child.x" :y="child.y" :width="child.w" :height="child.h" fill="#fff" stroke="#111" stroke-width="1" rx="2"/>
            <text :x="child.x+child.w/2" :y="child.y+child.h/2+4" text-anchor="middle" font-size="12" fill="#111">{{child.label}}</text>
          </template>
        </template>

        <!-- swimlane -->
        <template v-else-if="node.shape==='swimlane'">
          <rect :width="node.w" :height="node.h" fill="#fafafa" stroke="#111" stroke-width="1.2" rx="0"/>
          <rect width="28" :height="node.h" fill="#f0f0f0" stroke="#111" stroke-width="1.2"/>
          <text x="14" :y="node.h/2" text-anchor="middle" font-size="13" font-weight="bold" fill="#111" :transform="`rotate(-90,14,${node.h/2})`">{{node.label}}</text>
          <template v-for="(child,ci) in (node.children||[])" :key="ci">
            <rect :x="child.x" :y="child.y" :width="child.w" :height="child.h" fill="#fff" stroke="#111" stroke-width="1.2" rx="8"/>
            <text :x="child.x+child.w/2" :y="child.y+child.h/2+5" text-anchor="middle" font-size="13" fill="#111">{{child.label}}</text>
          </template>
        </template>

        <!-- cylinder -->
        <template v-else-if="node.shape==='cylinder'">
          <path :d="cylinderPath(node.w,node.h)" fill="#fff" stroke="#111" stroke-width="1.5"/>
          <text :x="node.w/2" :y="node.h/2+8" text-anchor="middle" font-size="13" font-weight="bold" fill="#111">{{node.label}}</text>
        </template>

        <!-- lifeline (dashed vertical) -->
        <template v-else-if="node.shape==='lifeline'">
          <line x1="0" y1="0" x2="0" :y2="node.h" stroke="#111" stroke-width="1" stroke-dasharray="8 6"/>
        </template>

        <!-- frame -->
        <template v-else-if="node.shape==='frame'">
          <rect :width="node.w" :height="node.h" fill="none" stroke="#111" stroke-width="1.2"/>
          <text x="8" y="16" font-size="12" font-weight="bold" fill="#111">{{node.label}}</text>
        </template>

        <!-- note -->
        <template v-else-if="node.shape==='note'">
          <polygon :points="`0,0 ${node.w-10},0 ${node.w},10 ${node.w},${node.h} 0,${node.h}`" fill="#ffffcc" stroke="#999" stroke-width="1"/>
          <text x="6" :y="node.h/2+4" font-size="11" fill="#333">{{node.label}}</text>
        </template>

        <!-- component -->
        <template v-else-if="node.shape==='component'">
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#111" stroke-width="1.2" rx="2"/>
          <rect x="-6" :y="node.h*0.25-4" width="12" height="8" fill="#fff" stroke="#111" stroke-width="1"/>
          <rect x="-6" :y="node.h*0.65-4" width="12" height="8" fill="#fff" stroke="#111" stroke-width="1"/>
          <text :x="node.w/2" :y="node.h/2+4" text-anchor="middle" font-size="12" fill="#111">{{node.label}}</text>
        </template>

        <!-- fallback rect -->
        <template v-else>
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#111" stroke-width="1.5" rx="4"/>
          <text :x="node.w/2" :y="node.h/2+5" text-anchor="middle" font-size="13" fill="#111">{{node.label}}</text>
        </template>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  width: { type: Number, default: 1200 },
  height: { type: Number, default: 800 }
})

const emit = defineEmits(['update:nodes', 'update:edges', 'ready'])

const wrap = ref(null)
const svgEl = ref(null)
const isFullscreen = ref(false)
const svgW = ref(1200)
const svgH = ref(800)
const vb = ref({ x: -30, y: -30, w: 1400, h: 900 })

const localNodes = ref([])
const localEdges = ref([])

watch(() => props.nodes, v => {
  localNodes.value = v.map(n => ({ ...n, children: n.children ? n.children.map(c => ({ ...c })) : undefined }))
  fitView()
}, { immediate: true, deep: true })

watch(() => props.edges, v => {
  localEdges.value = v.map(e => ({ ...e }))
}, { immediate: true, deep: true })

function nd(id) { return localNodes.value.find(n => n.id === id) || { x: 0, y: 0, w: 0, h: 0 } }

// --- class box helpers ---
function classHdrH(node) { return node.stereotype ? 42 : 28 }
function classAttrY(node) {
  const items = node.compartments?.[0]?.items || []
  return classHdrH(node) + 6 + items.length * 18
}

// --- node style helper ---
function ns(node, key, def) { return node.style?.[key] ?? def }

// --- edge helpers ---
function edgeStroke(e) { return e.style?.stroke || '#111' }
function edgeSW(e) { return e.style?.strokeWidth || 1.3 }
function edgeDash(e) { return e.style?.dashed ? '8 6' : 'none' }
function markerRef(type) {
  if (type === 'block') return 'url(#arr-block)'
  if (type === 'blockEmpty') return 'url(#arr-block-empty)'
  if (type === 'open') return 'url(#arr-open)'
  if (type === 'diamond') return 'url(#arr-diamond)'
  if (type === 'diamondEmpty') return 'url(#arr-diamond-empty)'
  return ''
}
function edgeMarkerEnd(e) { return markerRef(e.style?.arrowEnd) }
function edgeMarkerStart(e) { return markerRef(e.style?.arrowStart) }

function edgeRoute(e) {
  if (e.sourcePoint && e.targetPoint) {
    const pts = [e.sourcePoint]
    if (e.points) pts.push(...e.points)
    pts.push(e.targetPoint)
    return pts
  }
  const src = nd(e.from), tgt = nd(e.to)
  const sc = { x: src.x + src.w / 2, y: src.y + src.h / 2 }
  const tc = { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 }
  const dx = tc.x - sc.x, dy = tc.y - sc.y
  const absDx = Math.abs(dx), absDy = Math.abs(dy)
  let sx, sy, tx, ty
  if (absDx >= absDy) {
    sx = dx >= 0 ? src.x + src.w : src.x; sy = sc.y
    tx = dx >= 0 ? tgt.x : tgt.x + tgt.w; ty = tc.y
  } else {
    sx = sc.x; sy = dy >= 0 ? src.y + src.h : src.y
    tx = tc.x; ty = dy >= 0 ? tgt.y : tgt.y + tgt.h
  }
  if (Math.abs(sx - tx) < 3 || Math.abs(sy - ty) < 3) {
    return [{ x: sx, y: sy }, { x: tx, y: ty }]
  }
  if (absDx >= absDy) {
    const mx = (sx + tx) / 2
    return [{ x: sx, y: sy }, { x: mx, y: sy }, { x: mx, y: ty }, { x: tx, y: ty }]
  }
  const my = (sy + ty) / 2
  return [{ x: sx, y: sy }, { x: sx, y: my }, { x: tx, y: my }, { x: tx, y: ty }]
}

function routeStr(e) { return edgeRoute(e).map(p => `${p.x},${p.y}`).join(' ') }

function labelPos(e) {
  const pts = edgeRoute(e)
  if (pts.length >= 4) return { x: (pts[1].x + pts[2].x) / 2, y: (pts[1].y + pts[2].y) / 2 }
  return { x: (pts[0].x + pts[pts.length - 1].x) / 2, y: (pts[0].y + pts[pts.length - 1].y) / 2 }
}

function multPos(e, side) {
  const pts = edgeRoute(e)
  if (side === 'from') {
    const p0 = pts[0], p1 = pts[Math.min(1, pts.length - 1)]
    return { x: p0.x + (p1.x - p0.x) * 0.18, y: p0.y + (p1.y - p0.y) * 0.18 - 10 }
  }
  const pn = pts[pts.length - 1], pp = pts[Math.max(pts.length - 2, 0)]
  return { x: pn.x + (pp.x - pn.x) * 0.18, y: pn.y + (pp.y - pn.y) * 0.18 - 10 }
}

// --- shape path helpers ---
function cubePath(w, h) {
  const d = 10
  return `M0,${d} L${d},0 L${w},0 L${w},${h-d} L${w-d},${h} L0,${h} Z M0,${d} L${w-d},${d} L${w},0 M${w-d},${d} L${w-d},${h}`
}
function cylinderPath(w, h) {
  const ry = 10
  return `M0,${ry} A${w/2},${ry} 0 0,1 ${w},${ry} L${w},${h-ry} A${w/2},${ry} 0 0,1 0,${h-ry} Z M0,${ry} A${w/2},${ry} 0 0,0 ${w},${ry}`
}

// --- drag ---
let drag = null, off = { x: 0, y: 0 }
function onDragStart(ev, node) {
  drag = { target: node }
  const p = s2svg(ev.clientX, ev.clientY)
  off = { x: p.x - node.x, y: p.y - node.y }
}

let pan = false, ps = { x: 0, y: 0 }, pvb = { x: 0, y: 0 }
function onPanStart(ev) {
  if (drag) return
  pan = true; ps = { x: ev.clientX, y: ev.clientY }
  pvb = { x: vb.value.x, y: vb.value.y }
}

function onMove(ev) {
  if (drag) {
    const p = s2svg(ev.clientX, ev.clientY)
    drag.target.x = p.x - off.x
    drag.target.y = p.y - off.y
    return
  }
  if (pan) {
    const z = vb.value.w / svgW.value
    vb.value.x = pvb.x - (ev.clientX - ps.x) * z
    vb.value.y = pvb.y - (ev.clientY - ps.y) * z
  }
}

function onEnd() { drag = null; pan = false }

function onWheel(ev) {
  const f = ev.deltaY > 0 ? 1.1 : 0.9
  const r = wrap.value.getBoundingClientRect()
  const mx = (ev.clientX - r.left) / r.width
  const my = (ev.clientY - r.top) / r.height
  const ow = vb.value.w, oh = vb.value.h
  vb.value.w *= f; vb.value.h *= f
  vb.value.x += (ow - vb.value.w) * mx
  vb.value.y += (oh - vb.value.h) * my
}

function s2svg(cx, cy) {
  const r = wrap.value.getBoundingClientRect()
  return {
    x: vb.value.x + ((cx - r.left) / r.width) * vb.value.w,
    y: vb.value.y + ((cy - r.top) / r.height) * vb.value.h
  }
}

// --- edit ---
const editing = ref(null)
function startEdit(node, field) { editing.value = node.id }
function finishEdit(ev, node, field) {
  const val = ev.target.value.trim()
  if (val && val !== node[field]) node[field] = val
  editing.value = null
}

// --- fit view ---
function fitView() {
  if (!localNodes.value.length) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of localNodes.value) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w)
    maxY = Math.max(maxY, n.y + n.h)
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

function updateSize() {
  if (!wrap.value) return
  svgW.value = wrap.value.clientWidth || 1200
  svgH.value = wrap.value.clientHeight || 800
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

// --- export ---
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

defineExpose({ svgEl, exportSvgString, exportPngDataUrl, localNodes, localEdges })
</script>

<style scoped>
.uml-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #f8fafc;
  cursor: grab;
}
.uml-wrap:active { cursor: grabbing; }
.uml-wrap.fullscreen {
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
.edit-input {
  width: 100%;
  height: 100%;
  border: 1px solid #2563eb;
  border-radius: 3px;
  text-align: center;
  font-size: 13px;
  padding: 0 4px;
  outline: none;
}
</style>
