<template>
  <div class="er-wrap" :class="{fullscreen: isFullscreen}" ref="wrap"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onMove"
    @mouseup="onEnd" @mouseleave="onEnd">

    <!-- 全屏按钮 -->
    <button class="btn-fullscreen" @click.stop="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
      {{ isFullscreen ? '⊠' : '⛶' }}
    </button>

    <svg ref="svgEl" :width="svgW" :height="svgH"
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      xmlns="http://www.w3.org/2000/svg"
      style="font-family:'Microsoft YaHei','SimSun',sans-serif;display:block">

      <!-- 属性连线 -->
      <line v-for="n in attrs" :key="'l'+n.id"
        :x1="parent(n).x" :y1="parent(n).y"
        :x2="n.x" :y2="n.y"
        :stroke="props.theme.line" stroke-width="1"/>

      <!-- 关系连线+菱形（菱形可拖动） -->
      <template v-for="e in localEdges" :key="e.id">
        <line :x1="nd(e.fromId).x" :y1="nd(e.fromId).y"
          :x2="e.mx" :y2="e.my" :stroke="props.theme.line" stroke-width="1.5"/>
        <line :x1="e.mx" :y1="e.my"
          :x2="nd(e.toId).x" :y2="nd(e.toId).y" :stroke="props.theme.line" stroke-width="1.5"/>
        <!-- 菱形可拖动 -->
        <g :transform="`translate(${e.mx},${e.my})`"
          @mousedown.stop="onEdgeDragStart($event, e)" style="cursor:move">
          <polygon :points="diaPts()" :fill="props.theme.diamond" :stroke="props.theme.diamondStroke" stroke-width="1.5"/>
          <text v-if="editing !== e.id" text-anchor="middle" dy="5" :font-size="props.styleConfig.fontSize-1" :fill="props.theme.entityText"
            @dblclick.stop="startEdit(e)">{{e.label}}</text>
          <foreignObject v-else x="-22" y="-10" width="44" height="20">
            <input class="edit-input" :value="e.label" @blur="finishEdit($event,e)"
              @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </g>
        <!-- 1:N 标注 -->
        <text :x="lp(e,'f').x" :y="lp(e,'f').y" text-anchor="middle" :font-size="props.styleConfig.fontSize" :fill="props.theme.line" font-weight="bold">1</text>
        <text :x="lp(e,'t').x" :y="lp(e,'t').y" text-anchor="middle" :font-size="props.styleConfig.fontSize" :fill="props.theme.line" font-weight="bold">N</text>
      </template>

      <!-- 属性椭圆 -->
      <g v-for="n in attrs" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <ellipse :rx="props.styleConfig.attrRx" :ry="props.styleConfig.attrRy"
          :fill="props.theme.attr" :stroke="props.theme.attrStroke" stroke-width="1.5"/>
        <text v-if="editing!==n.id" text-anchor="middle" dy="5" :font-size="props.styleConfig.fontSize" :fill="props.theme.attrText"
          @dblclick.stop="startEdit(n)">{{n.label}}</text>
        <foreignObject v-else :x="-props.styleConfig.attrRx+2" y="-12" :width="(props.styleConfig.attrRx-2)*2" height="24">
          <input class="edit-input" :value="n.label" @blur="finishEdit($event,n)"
            @keydown.enter="$event.target.blur()" autofocus/>
        </foreignObject>
        <line v-if="n.type==='pk' && props.styleConfig.showPkUnderline" :x1="-tw(n.label)" y1="7" :x2="tw(n.label)" y2="7" :stroke="props.theme.attrStroke" stroke-width="1"/>
      </g>

      <!-- 实体矩形 -->
      <g v-for="n in entities" :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        @mousedown.stop="onDragStart($event,n)" style="cursor:move">
        <rect :x="-props.styleConfig.entityW/2" :y="-props.styleConfig.entityH/2"
          :width="props.styleConfig.entityW" :height="props.styleConfig.entityH"
          :fill="props.theme.entity" :stroke="props.theme.entityStroke" stroke-width="2" rx="2"/>
        <text v-if="editing!==n.id" text-anchor="middle" dy="5" :font-size="props.styleConfig.fontSize+1" font-weight="bold" :fill="props.theme.entityText"
          @dblclick.stop="startEdit(n)">{{n.label}}</text>
        <foreignObject v-else :x="-props.styleConfig.entityW/2+2" :y="-props.styleConfig.entityH/2+4"
          :width="props.styleConfig.entityW-4" :height="props.styleConfig.entityH-8">
          <input class="edit-input bold" :value="n.label" @blur="finishEdit($event,n)"
            @keydown.enter="$event.target.blur()" autofocus/>
        </foreignObject>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  theme: { type: Object, default: () => ({ entity:'#fff', entityStroke:'#000', entityText:'#000', attr:'#fff', attrStroke:'#000', attrText:'#000', line:'#000', diamond:'#fff', diamondStroke:'#000' }) },
  styleConfig: { type: Object, default: () => ({ entityW:120, entityH:40, attrRx:50, attrRy:20, fontSize:13, showPkUnderline:true }) }
})

const wrap = ref(null)
const svgEl = ref(null)
const isFullscreen = ref(false)
const svgW = ref(1200)
const svgH = ref(800)
const vb = ref({ x: -50, y: -50, w: 1800, h: 1200 })

// 节点本地副本
const local = ref([])
watch(() => props.nodes, v => { local.value = v.map(n => ({...n})) }, { immediate: true, deep: true })

// 边本地副本（含可拖动的mx/my）
const localEdges = ref([])
watch(() => props.edges, v => { localEdges.value = v.map(e => ({...e})) }, { immediate: true, deep: true })

const entities = computed(() => local.value.filter(n => n.type === 'entity'))
const attrs = computed(() => local.value.filter(n => n.type === 'attr' || n.type === 'pk'))

function nd(id) { return local.value.find(n => n.id === id) || { x: 0, y: 0 } }
function parent(n) { return nd(n.parentId) }
function tw(label) { return Math.min(label.length * 6.5, 42) }
function diaPts() {
  const s = 20
  return `0,${-s} ${s},0 0,${s} ${-s},0`
}
function lp(e, side) {
  const f = nd(e.fromId), t = nd(e.toId)
  if (side === 'f') return { x: (f.x + e.mx) / 2, y: (f.y + e.my) / 2 - 12 }
  return { x: (t.x + e.mx) / 2, y: (t.y + e.my) / 2 - 12 }
}

// 节点拖拽
let drag = null, off = { x: 0, y: 0 }
function onDragStart(e, node) {
  drag = { type: 'node', target: node }
  const p = s2svg(e.clientX, e.clientY)
  off = { x: p.x - node.x, y: p.y - node.y }
}

// 菱形边拖拽
function onEdgeDragStart(e, edge) {
  drag = { type: 'edge', target: edge }
  const p = s2svg(e.clientX, e.clientY)
  off = { x: p.x - edge.mx, y: p.y - edge.my }
}

// 画布平移
let pan = false, ps = { x: 0, y: 0 }, pvb = { x: 0, y: 0 }
function onPanStart(e) {
  if (drag) return
  pan = true; ps = { x: e.clientX, y: e.clientY }
  pvb = { x: vb.value.x, y: vb.value.y }
}

function onMove(e) {
  if (drag) {
    const p = s2svg(e.clientX, e.clientY)
    if (drag.type === 'node') {
      const node = drag.target
      const nx = p.x - off.x, ny = p.y - off.y
      const dx = nx - node.x, dy = ny - node.y
      node.x = nx; node.y = ny
      if (node.type === 'entity') {
        for (const n of local.value) {
          if (n.parentId === node.id) { n.x += dx; n.y += dy }
        }
      }
    } else if (drag.type === 'edge') {
      drag.target.mx = p.x - off.x
      drag.target.my = p.y - off.y
    }
    return
  }
  if (pan) {
    const z = vb.value.w / svgW.value
    vb.value.x = pvb.x - (e.clientX - ps.x) * z
    vb.value.y = pvb.y - (e.clientY - ps.y) * z
  }
}

function onEnd() { drag = null; pan = false }

function onWheel(e) {
  const f = e.deltaY > 0 ? 1.1 : 0.9
  const r = wrap.value.getBoundingClientRect()
  const mx = (e.clientX - r.left) / r.width
  const my = (e.clientY - r.top) / r.height
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

// 全屏
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}
function onKeydown(e) {
  if (e.key === 'Escape' && isFullscreen.value) isFullscreen.value = false
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  updateSize()
  window.addEventListener('resize', updateSize)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateSize)
})
function updateSize() {
  if (!wrap.value) return
  svgW.value = wrap.value.clientWidth || 1200
  svgH.value = wrap.value.clientHeight || 800
}

// 双击编辑
const editing = ref(null)
function startEdit(node) { editing.value = node.id }
function finishEdit(e, node) {
  const val = e.target.value.trim()
  if (val && val !== node.label) node.label = val
  editing.value = null
}

defineExpose({ svgEl, local, localEdges })
</script>

<style scoped>
.er-wrap {
  width: 100%; height: 100%; overflow: hidden; position: relative;
  background: #fff; cursor: grab; user-select: none;
}
.er-wrap:active { cursor: grabbing; }
.er-wrap.fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  width: 100vw; height: 100vh;
}
.btn-fullscreen {
  position: absolute; top: 10px; right: 10px; z-index: 10;
  width: 32px; height: 32px; border: 1px solid #ccc; border-radius: 4px;
  background: #fff; font-size: 16px; cursor: pointer; line-height: 30px;
  text-align: center; padding: 0; color: #333;
}
.btn-fullscreen:hover { background: #f3f4f6; }
.edit-input {
  width: 100%; height: 100%; border: 1px solid #666; border-radius: 2px;
  text-align: center; font-size: 12px; padding: 2px; outline: none;
  font-family: 'Microsoft YaHei',sans-serif; background: #ffffdd;
}
.edit-input.bold { font-weight: bold; font-size: 13px; }
</style>
