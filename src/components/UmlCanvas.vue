<template>
  <div class="uml-wrap" :class="{fullscreen: isFullscreen}" ref="wrap"
    @wheel.prevent="onWheel"
    @mousedown="onPanStart"
    @mousemove="onMove"
    @mouseup="onEnd" @mouseleave="onEnd">

    <div class="zoom-controls">
      <button class="zoom-btn" @click.stop="zoomIn" title="放大">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
      </button>
      <span class="zoom-pct">{{ zoomPct }}%</span>
      <button class="zoom-btn" @click.stop="zoomOut" title="缩小">
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
      </button>
      <button class="zoom-btn" @click.stop="fitView" title="适应画布">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/></svg>
      </button>
      <button class="zoom-btn" @click.stop="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
        <svg width="16" height="16" viewBox="0 0 16 16"><path v-if="!isFullscreen" d="M2 6V3a1 1 0 011-1h3M10 2h3a1 1 0 011 1v3M14 10v3a1 1 0 01-1 1h-3M6 14H3a1 1 0 01-1-1v-3" stroke="currentColor" stroke-width="1.4" fill="none"/><path v-else d="M6 2v3a1 1 0 01-1 1H2M10 2v3a1 1 0 001 1h3M14 10h-3a1 1 0 00-1 1v3M2 10h3a1 1 0 011 1v3" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>
      </button>
    </div>

    <!-- MiniMap -->
    <div class="minimap" v-if="localNodes.length > 0" @mousedown.stop="onMinimapClick">
      <svg :width="minimapW" :height="minimapH" :viewBox="minimapViewBox">
        <rect v-for="node in localNodes" :key="'mm'+node.id"
          :x="node.x" :y="node.y" :width="node.w" :height="node.h"
          :fill="mmNodeColor(node)" stroke="none" rx="2"/>
        <rect :x="vb.x" :y="vb.y" :width="vb.w" :height="vb.h"
          fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="6" rx="3"/>
      </svg>
    </div>

    <svg ref="svgEl" :width="svgW" :height="svgH"
      :viewBox="`${vb.x} ${vb.y} ${vb.w} ${vb.h}`"
      xmlns="http://www.w3.org/2000/svg"
      style="font-family:'Microsoft YaHei','SimSun',sans-serif;display:block;text-rendering:geometricPrecision;shape-rendering:geometricPrecision">

      <defs>
        <marker id="arr-block" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
        <marker id="arr-block-empty" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff" stroke="context-stroke" stroke-width="1"/></marker>
        <marker id="arr-open" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker>
        <marker id="arr-diamond" viewBox="0 0 14 10" refX="14" refY="5" markerWidth="10" markerHeight="8" orient="auto"><path d="M0 5L7 0L14 5L7 10z" fill="context-stroke"/></marker>
        <marker id="arr-diamond-empty" viewBox="0 0 14 10" refX="14" refY="5" markerWidth="10" markerHeight="8" orient="auto"><path d="M0 5L7 0L14 5L7 10z" fill="#fff" stroke="context-stroke" stroke-width="1"/></marker>
        <!-- shadow removed: SVG filters rasterize content, causing blurry text -->
      </defs>
      <rect :x="vb.x" :y="vb.y" :width="vb.w" :height="vb.h" fill="#FFFFFF"/>

      <!-- Edges -->
      <g v-for="e in localEdges" :key="e.id">
        <!-- Invisible fat hit area for selection -->
        <polyline :points="routeStr(e)" fill="none"
          stroke="transparent" stroke-width="12"
          @click.stop="selectEdge(e)" @contextmenu.prevent.stop="deleteEdge(e)"
          style="cursor:pointer"/>
        <polyline :points="routeStr(e)" fill="none"
          :stroke="selectedEdge===e.id ? '#3b82f6' : edgeStroke(e)"
          :stroke-width="selectedEdge===e.id ? 1.8 : edgeSW(e)" :stroke-dasharray="edgeDash(e)"
          :marker-end="edgeMarkerEnd(e)" :marker-start="edgeMarkerStart(e)"
          stroke-linejoin="round" stroke-linecap="round"
          style="pointer-events:none"/>
        <!-- Edge labels -->
        <text v-if="e.label" :x="labelPos(e).x" :y="labelPos(e).y"
          text-anchor="middle" font-size="13" :fill="edgeLabelColor(e)" :font-style="e.labelItalic?'italic':'normal'">
          <tspan dy="-8" style="paint-order:stroke" stroke="#fff" stroke-width="3">{{e.label}}</tspan>
        </text>
        <text v-if="e.fromLabel" :x="multPos(e,'from').x" :y="multPos(e,'from').y" text-anchor="middle" font-size="13" :fill="edgeLabelColor(e, '#555')">{{e.fromLabel}}</text>
        <text v-if="e.toLabel" :x="multPos(e,'to').x" :y="multPos(e,'to').y" text-anchor="middle" font-size="13" :fill="edgeLabelColor(e, '#555')">{{e.toLabel}}</text>
      </g>

      <!-- Drawing line preview -->
      <polyline v-if="drawing" :points="drawingPreviewStr" fill="none"
        stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4"
        marker-end="url(#arr-block)" stroke-linejoin="round"/>

      <!-- Nodes -->
      <g v-for="node in localNodes" :key="node.id"
        :transform="`translate(${node.x},${node.y})`"
        @mousedown.stop="onDragStart($event, node)"
        @mouseenter="hoverNode = node.id" @mouseleave="hoverNode = null"
        style="cursor:move">

        <!-- classBox -->
        <template v-if="node.shape==='classBox'">
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#333" stroke-width="1.2" rx="3"/>
          <rect :width="node.w" :height="classHdrH(node)" fill="#ffffff" stroke="none" rx="3"/>
          <rect :width="node.w" :height="classHdrH(node)" fill="#ffffff" stroke="none"
            :style="`clip-path:inset(${classHdrH(node)-3}px 0 0 0)`"/>
          <text v-if="node.stereotype" :x="node.w/2" y="16" text-anchor="middle" font-size="10" fill="#555">&laquo;{{node.stereotype}}&raquo;</text>
          <text :x="node.w/2" :y="node.stereotype?32:20" text-anchor="middle" font-size="13" font-weight="bold" fill="#111"
            :font-style="node.stereotype==='abstract'?'italic':'normal'"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <line :x1="0" :y1="classHdrH(node)" :x2="node.w" :y2="classHdrH(node)" stroke="#111" stroke-width="0.8"/>
          <text v-for="(a,i) in (node.compartments?.[0]?.items||[])" :key="'a'+i" x="10" :y="classHdrH(node)+16+i*18" font-size="12" fill="#333">{{a}}</text>
          <line :x1="0" :y1="classAttrY(node)" :x2="node.w" :y2="classAttrY(node)" stroke="#111" stroke-width="0.8"/>
          <text v-for="(m,i) in (node.compartments?.[1]?.items||[])" :key="'m'+i" x="10" :y="classAttrY(node)+16+i*18" font-size="12" fill="#333">{{m}}</text>
        </template>

        <!-- rect -->
        <template v-else-if="node.shape==='rect'">
          <rect :width="node.w" :height="node.h"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)" :rx="ns(node,'radius',0)"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle"
            :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','normal')"
            :fill="ns(node,'fontColor','#000')"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else x="2" :y="node.h/2-10" :width="node.w-4" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <template v-else-if="node.shape==='verticalRect'">
          <rect :width="node.w" :height="node.h"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)" :rx="ns(node,'radius',0)"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="verticalTextStartY(node)" text-anchor="middle"
            :font-size="ns(node,'fontSize',12)" :font-weight="ns(node,'fontWeight','normal')"
            :fill="ns(node,'fontColor','#000')">
            <tspan v-for="(line, index) in verticalTextLines(node.label)" :key="`${node.id}-${index}`"
              :x="node.w/2" :dy="index===0 ? 0 : ns(node,'verticalTextGap',16)">{{ line }}</tspan>
          </text>
          <foreignObject v-else x="2" :y="node.h/2-10" :width="node.w-4" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- roundedRect -->
        <template v-else-if="node.shape==='roundedRect'">
          <rect :width="node.w" :height="node.h"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)" :rx="node.h/2"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle"
            :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','normal')"
            :fill="ns(node,'fontColor','#000')"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else x="2" :y="node.h/2-10" :width="node.w-4" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- parallelogram (IO shape) -->
        <template v-else-if="node.shape==='parallelogram'">
          <polygon :points="`${node.h*0.3},0 ${node.w},0 ${node.w-node.h*0.3},${node.h} 0,${node.h}`"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)"/>
          <text :x="node.w/2" :y="node.h/2+5" text-anchor="middle"
            :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','normal')" :fill="ns(node,'fontColor','#000')">{{node.label}}</text>
        </template>

        <!-- ellipse -->
        <template v-else-if="node.shape==='ellipse'">
          <ellipse :cx="node.w/2" :cy="node.h/2" :rx="node.w/2" :ry="node.h/2"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)"/>
          <text v-if="editing!==node.id" :x="node.w/2" :y="node.h/2+5" text-anchor="middle"
            font-size="13" :fill="ns(node,'fontColor','#000')"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
          <foreignObject v-else :x="node.w*0.15" :y="node.h/2-10" :width="node.w*0.7" height="22">
            <input class="edit-input" :value="node.label" @blur="finishEdit($event,node,'label')" @keydown.enter="$event.target.blur()" autofocus/>
          </foreignObject>
        </template>

        <!-- diamond -->
        <template v-else-if="node.shape==='diamond'">
          <polygon :points="`${node.w/2},0 ${node.w},${node.h/2} ${node.w/2},${node.h} 0,${node.h/2}`"
            :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')"
            :stroke-width="ns(node,'strokeWidth',1.2)"/>
          <text :x="node.w/2" :y="node.h/2+5" text-anchor="middle" :font-size="ns(node,'fontSize',12)" :font-weight="ns(node,'fontWeight','normal')"
            :fill="ns(node,'fontColor','#000')">{{node.label}}</text>
        </template>

        <!-- startState -->
        <template v-else-if="node.shape==='startState'">
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2" fill="#3b3f5c" stroke="#3b3f5c"/>
        </template>

        <!-- endState -->
        <template v-else-if="node.shape==='endState'">
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2" fill="none" stroke="#3b3f5c" stroke-width="2"/>
          <circle :cx="node.w/2" :cy="node.h/2" :r="node.w/2-5" fill="#3b3f5c"/>
        </template>

        <!-- forkjoin -->
        <template v-else-if="node.shape==='forkjoin'">
          <rect :width="node.w" :height="node.h" fill="#3b3f5c" stroke="#3b3f5c" rx="2"/>
        </template>

        <!-- actor -->
        <template v-else-if="node.shape==='actor'">
          <circle :cx="node.w/2" cy="12" r="10" fill="none" stroke="#333" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="22" :x2="node.w/2" y2="46" stroke="#333" stroke-width="1.5"/>
          <line :x1="node.w/2-16" y1="30" :x2="node.w/2+16" y2="30" stroke="#333" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="46" :x2="node.w/2-12" y2="64" stroke="#333" stroke-width="1.5"/>
          <line :x1="node.w/2" y1="46" :x2="node.w/2+12" y2="64" stroke="#333" stroke-width="1.5"/>
          <text :x="node.w/2" :y="node.h-2" text-anchor="middle" font-size="13" font-weight="bold" fill="#333"
            @dblclick.stop="startEdit(node,'label')">{{node.label}}</text>
        </template>

        <!-- cube -->
        <template v-else-if="node.shape==='cube'">
          <path :d="cubePath(node.w,node.h)" fill="#fcfcfc" stroke="#333" stroke-width="1.2"/>
          <text v-if="node.stereotype" :x="node.w/2" y="18" text-anchor="middle" font-size="11" font-style="italic" fill="#666">{{node.stereotype}}</text>
          <text :x="node.w/2" :y="node.stereotype?34:22" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">{{node.label}}</text>
          <template v-for="(child,ci) in (node.children||[])" :key="ci">
            <rect :x="child.x" :y="child.y" :width="child.w" :height="child.h" fill="#fff" stroke="#555" stroke-width="1" rx="3"/>
            <text :x="child.x+child.w/2" :y="child.y+child.h/2+4" text-anchor="middle" font-size="12" fill="#333">{{child.label}}</text>
          </template>
        </template>

        <!-- swimlane -->
        <template v-else-if="node.shape==='swimlane'">
          <rect :width="node.w" :height="node.h" fill="#ffffff" stroke="#111" stroke-width="1" rx="0"/>
          <rect width="30" :height="node.h" fill="#ffffff" stroke="#111" stroke-width="1" rx="0"/>
          <text x="15" :y="node.h/2" text-anchor="middle" font-size="13" font-weight="bold" fill="#111" :transform="`rotate(-90,15,${node.h/2})`">{{node.label}}</text>
          <template v-for="(child,ci) in (node.children||[])" :key="ci">
            <rect :x="child.x" :y="child.y" :width="child.w" :height="child.h" fill="#fff" stroke="#111" stroke-width="1" rx="0"/>
            <text :x="child.x+child.w/2" :y="child.y+child.h/2+5" text-anchor="middle" font-size="13" fill="#333">{{child.label}}</text>
          </template>
        </template>

        <!-- cylinder -->
        <template v-else-if="node.shape==='cylinder'">
          <path :d="cylinderPath(node.w,node.h)" :fill="ns(node,'fill','#fff')" :stroke="ns(node,'stroke','#000')" :stroke-width="ns(node,'strokeWidth',1.2)"/>
          <text :x="node.w/2" :y="node.h/2+8" text-anchor="middle" :font-size="ns(node,'fontSize',13)" :font-weight="ns(node,'fontWeight','normal')" :fill="ns(node,'fontColor','#000')">{{node.label}}</text>
        </template>

        <!-- lifeline -->
        <template v-else-if="node.shape==='lifeline'">
          <line x1="0" y1="0" x2="0" :y2="node.h" stroke="#999" stroke-width="1" stroke-dasharray="8 6"/>
        </template>

        <!-- frame -->
        <template v-else-if="node.shape==='frame'">
          <rect :width="node.w" :height="node.h" fill="none" stroke="#999" stroke-width="1"/>
          <text x="8" y="16" font-size="12" font-weight="bold" fill="#555">{{node.label}}</text>
        </template>

        <!-- note -->
        <template v-else-if="node.shape==='note'">
          <polygon :points="`0,0 ${node.w-10},0 ${node.w},10 ${node.w},${node.h} 0,${node.h}`" fill="#fffde7" stroke="#bbb" stroke-width="1"/>
          <text x="6" :y="node.h/2+4" font-size="11" fill="#555">{{node.label}}</text>
        </template>

        <!-- component -->
        <template v-else-if="node.shape==='component'">
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#333" stroke-width="1" rx="3"/>
          <rect x="-6" :y="node.h*0.25-4" width="12" height="8" fill="#fff" stroke="#333" stroke-width="1"/>
          <rect x="-6" :y="node.h*0.65-4" width="12" height="8" fill="#fff" stroke="#333" stroke-width="1"/>
          <text :x="node.w/2" :y="node.h/2+4" text-anchor="middle" font-size="12" fill="#333">{{node.label}}</text>
        </template>

        <!-- fallback rect -->
        <template v-else>
          <rect :width="node.w" :height="node.h" fill="#fff" stroke="#333" stroke-width="1.2" rx="4"/>
          <text :x="node.w/2" :y="node.h/2+5" text-anchor="middle" font-size="13" fill="#333">{{node.label}}</text>
        </template>

        <!-- Resize handles (4 corners) -->
        <g v-if="hoverNode === node.id && !drawing && !hideAnchors(node)" class="resize-handles">
          <rect :x="-4" :y="-4" width="8" height="8"
            fill="#fff" stroke="#3b82f6" stroke-width="1.2" style="cursor:nw-resize"
            @mousedown.stop="startResize($event, node, 'tl')"/>
          <rect :x="node.w-4" :y="-4" width="8" height="8"
            fill="#fff" stroke="#3b82f6" stroke-width="1.2" style="cursor:ne-resize"
            @mousedown.stop="startResize($event, node, 'tr')"/>
          <rect :x="-4" :y="node.h-4" width="8" height="8"
            fill="#fff" stroke="#3b82f6" stroke-width="1.2" style="cursor:sw-resize"
            @mousedown.stop="startResize($event, node, 'bl')"/>
          <rect :x="node.w-4" :y="node.h-4" width="8" height="8"
            fill="#fff" stroke="#3b82f6" stroke-width="1.2" style="cursor:se-resize"
            @mousedown.stop="startResize($event, node, 'se')"/>
        </g>

        <!-- Anchor points (4 ports: top/right/bottom/left) -->
        <g v-if="(hoverNode === node.id || drawing?.fromId === node.id) && !hideAnchors(node)" class="anchor-group">
          <circle :cx="node.w/2" :cy="0" r="4"
            fill="#fff" stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mousedown.stop="startDrawing($event, node, 'T')"/>
          <circle :cx="node.w" :cy="node.h/2" r="4"
            fill="#fff" stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mousedown.stop="startDrawing($event, node, 'R')"/>
          <circle :cx="node.w/2" :cy="node.h" r="4"
            fill="#fff" stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mousedown.stop="startDrawing($event, node, 'B')"/>
          <circle :cx="0" :cy="node.h/2" r="4"
            fill="#fff" stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mousedown.stop="startDrawing($event, node, 'L')"/>
        </g>
        <!-- Drop target anchors (shown on other nodes when drawing) -->
        <g v-if="drawing && drawing.fromId !== node.id && !hideAnchors(node)" class="anchor-group drop-anchors">
          <circle :cx="node.w/2" :cy="0" r="5"
            :fill="dropTarget?.nodeId===node.id&&dropTarget?.port==='T'?'#3b82f6':'#fff'"
            stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mouseenter="dropTarget={nodeId:node.id,port:'T'}" @mouseleave="dropTarget=null"
            @mouseup.stop="finishDrawing(node,'T')"/>
          <circle :cx="node.w" :cy="node.h/2" r="5"
            :fill="dropTarget?.nodeId===node.id&&dropTarget?.port==='R'?'#3b82f6':'#fff'"
            stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mouseenter="dropTarget={nodeId:node.id,port:'R'}" @mouseleave="dropTarget=null"
            @mouseup.stop="finishDrawing(node,'R')"/>
          <circle :cx="node.w/2" :cy="node.h" r="5"
            :fill="dropTarget?.nodeId===node.id&&dropTarget?.port==='B'?'#3b82f6':'#fff'"
            stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mouseenter="dropTarget={nodeId:node.id,port:'B'}" @mouseleave="dropTarget=null"
            @mouseup.stop="finishDrawing(node,'B')"/>
          <circle :cx="0" :cy="node.h/2" r="5"
            :fill="dropTarget?.nodeId===node.id&&dropTarget?.port==='L'?'#3b82f6':'#fff'"
            stroke="#3b82f6" stroke-width="1.5" class="anchor-dot"
            @mouseenter="dropTarget={nodeId:node.id,port:'L'}" @mouseleave="dropTarget=null"
            @mouseup.stop="finishDrawing(node,'L')"/>
        </g>
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
const hoverNode = ref(null)

function hideAnchors(node) {
  return node.shape === 'lifeline' || node.shape === 'frame' || node.shape === 'note' || node.shape === 'forkjoin'
}

const zoomPct = computed(() => {
  if (!svgW.value || !vb.value.w) return 100
  return Math.round((svgW.value / vb.value.w) * 100)
})

const minimapW = 180
const minimapH = 120
const minimapViewBox = computed(() => {
  if (!localNodes.value.length) return '0 0 100 100'
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of localNodes.value) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w)
    maxY = Math.max(maxY, n.y + n.h)
  }
  const pad = 100
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
})

function mmNodeColor(node) {
  if (node.shape === 'swimlane') return '#e2e8f0'
  if (node.shape === 'lifeline') return 'transparent'
  if (node.shape === 'frame' || node.shape === 'note') return '#ddd'
  return node.style?.fill || '#94a3b8'
}

function onMinimapClick(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  const parts = minimapViewBox.value.split(' ').map(Number)
  const ratioX = (ev.clientX - rect.left) / rect.width
  const ratioY = (ev.clientY - rect.top) / rect.height
  vb.value.x = parts[0] + ratioX * parts[2] - vb.value.w / 2
  vb.value.y = parts[1] + ratioY * parts[3] - vb.value.h / 2
}

watch(() => props.nodes, v => {
  localNodes.value = v.map(n => ({ ...n, children: n.children ? n.children.map(c => ({ ...c })) : undefined }))
  fitView()
}, { immediate: true, deep: true })

watch(() => props.edges, v => {
  localEdges.value = v.map(e => ({ ...e }))
}, { immediate: true, deep: true })

function nd(id) { return localNodes.value.find(n => n.id === id) || { x: 0, y: 0, w: 0, h: 0 } }

function classHdrH(node) { return node.stereotype ? 42 : 28 }
function classAttrY(node) {
  const items = node.compartments?.[0]?.items || []
  return classHdrH(node) + 6 + items.length * 18
}

function verticalTextLines(label) {
  const chars = [...String(label || '').replace(/\s+/g, '').trim()]
  return chars.length ? chars : ['']
}

function verticalTextStartY(node) {
  const lines = verticalTextLines(node.label)
  const gap = ns(node, 'verticalTextGap', 16)
  const totalHeight = (lines.length - 1) * gap
  return Math.max(18, (node.h - totalHeight) / 2)
}

function ns(node, key, def) { return node.style?.[key] ?? def }

function edgeStroke(e) { return e.style?.stroke || '#000' }
function edgeSW(e) { return e.style?.strokeWidth || 1.3 }
function edgeDash(e) { return e.style?.dashed ? '8 5' : 'none' }
function edgeLabelColor(e, fallback = '#000') { return e.style?.fontColor || fallback }
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

function portOf(n, side) {
  if (side === 'T') return { x: n.x + n.w / 2, y: n.y }
  if (side === 'R') return { x: n.x + n.w,     y: n.y + n.h / 2 }
  if (side === 'B') return { x: n.x + n.w / 2, y: n.y + n.h }
  return { x: n.x, y: n.y + n.h / 2 }
}

function boxesEqual(a, b, tolerance = 0.5) {
  if (!a || !b) return false
  return Math.abs(a.x - b.x) <= tolerance
    && Math.abs(a.y - b.y) <= tolerance
    && Math.abs(a.w - b.w) <= tolerance
    && Math.abs(a.h - b.h) <= tolerance
}

function shouldReuseFixedRoute(e, src, tgt) {
  if (!e.sourcePoint || !e.targetPoint) return false
  if (!e.layoutSourceBox || !e.layoutTargetBox) return true
  return boxesEqual(e.layoutSourceBox, src) && boxesEqual(e.layoutTargetBox, tgt)
}

function orthoRouteByPorts(s, t, sourcePort, targetPort) {
  if (Math.abs(s.x - t.x) < 3 || Math.abs(s.y - t.y) < 3) return [s, t]

  const sourceVertical = sourcePort === 'T' || sourcePort === 'B'
  const targetVertical = targetPort === 'T' || targetPort === 'B'

  if (sourceVertical && targetVertical) {
    const midY = (s.y + t.y) / 2
    return [s, { x: s.x, y: midY }, { x: t.x, y: midY }, t]
  }
  if (!sourceVertical && !targetVertical) {
    const midX = (s.x + t.x) / 2
    return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]
  }
  if (!sourceVertical && targetVertical) {
    return [s, { x: t.x, y: s.y }, t]
  }
  return [s, { x: s.x, y: t.y }, t]
}

function edgeRoute(e) {
  if (e.sourcePoint && e.targetPoint && (!e.from || !e.to)) {
    const pts = [e.sourcePoint]
    if (e.points) pts.push(...e.points)
    pts.push(e.targetPoint)
    return pts
  }

  const src = nd(e.from)
  const tgt = nd(e.to)

  if (!src.w || !tgt.w) return [{ x: 0, y: 0 }, { x: 0, y: 0 }]

  if (shouldReuseFixedRoute(e, src, tgt)) {
    const pts = [e.sourcePoint]
    if (e.points) pts.push(...e.points)
    pts.push(e.targetPoint)
    return pts
  }

  if (e.sourcePort || e.targetPort) {
    const sourcePort = e.sourcePort || 'B'
    const targetPort = e.targetPort || 'T'
    const s = portOf(src, sourcePort)
    const t = portOf(tgt, targetPort)
    if (sourcePort === 'L' && targetPort === 'L' && s.y > t.y) {
      let leftBound = Infinity
      for (const n of localNodes.value) {
        if (n.x < leftBound) leftBound = n.x
      }
      const vertDist = Math.abs(s.y - t.y)
      const detourX = leftBound - 20 - Math.min(vertDist * 0.15, 50)
      return [s, { x: detourX, y: s.y }, { x: detourX, y: t.y }, t]
    }
    return orthoRouteByPorts(s, t, sourcePort, targetPort)
  }

  const scx = src.x + src.w / 2, scy = src.y + src.h / 2
  const tcx = tgt.x + tgt.w / 2, tcy = tgt.y + tgt.h / 2

  const tgtIsBelow = tgt.y > src.y + src.h * 0.3
  const tgtIsAbove = tgt.y + tgt.h < src.y + src.h * 0.5
  const tgtIsRight = tgt.x > src.x + src.w * 0.5
  const tgtIsLeft  = tgt.x + tgt.w < src.x + src.w * 0.5

  // Case 1: target below source (normal forward flow)
  if (tgtIsBelow) {
    const s = portOf(src, 'B'), t = portOf(tgt, 'T')
    if (Math.abs(s.x - t.x) < 3) return [s, t]
    const midY = (s.y + t.y) / 2
    return [s, { x: s.x, y: midY }, { x: t.x, y: midY }, t]
  }

  // Case 2: target above source (back-edge / loop-back)
  if (tgtIsAbove) {
    let leftBound = Infinity
    for (const n of localNodes.value) {
      if (n.x < leftBound) leftBound = n.x
    }
    const vertDist = Math.abs(scy - tcy)
    const detourX = leftBound - 20 - Math.min(vertDist * 0.15, 50)
    const s = portOf(src, 'L')
    const t = portOf(tgt, 'L')
    return [s, { x: detourX, y: s.y }, { x: detourX, y: t.y }, t]
  }

  // Case 3: target roughly same row, to the right
  if (tgtIsRight) {
    const s = portOf(src, 'R'), t = portOf(tgt, 'L')
    if (Math.abs(s.y - t.y) < 3) return [s, t]
    const midX = (s.x + t.x) / 2
    return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]
  }

  // Case 4: target roughly same row, to the left
  if (tgtIsLeft) {
    const s = portOf(src, 'L'), t = portOf(tgt, 'R')
    if (Math.abs(s.y - t.y) < 3) return [s, t]
    const midX = (s.x + t.x) / 2
    return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]
  }

  // Fallback: use centers
  const dx = tcx - scx, dy = tcy - scy
  if (Math.abs(dy) >= Math.abs(dx)) {
    const sp = dy >= 0 ? 'B' : 'T', tp = dy >= 0 ? 'T' : 'B'
    const s = portOf(src, sp), t = portOf(tgt, tp)
    if (Math.abs(s.x - t.x) < 3) return [s, t]
    const midY = (s.y + t.y) / 2
    return [s, { x: s.x, y: midY }, { x: t.x, y: midY }, t]
  }
  const sp = dx >= 0 ? 'R' : 'L', tp = dx >= 0 ? 'L' : 'R'
  const s = portOf(src, sp), t = portOf(tgt, tp)
  if (Math.abs(s.y - t.y) < 3) return [s, t]
  const midX = (s.x + t.x) / 2
  return [s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]
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

function cubePath(w, h) {
  const d = 10
  return `M0,${d} L${d},0 L${w},0 L${w},${h-d} L${w-d},${h} L0,${h} Z M0,${d} L${w-d},${d} L${w},0 M${w-d},${d} L${w-d},${h}`
}
function cylinderPath(w, h) {
  const ry = 10
  return `M0,${ry} A${w/2},${ry} 0 0,1 ${w},${ry} L${w},${h-ry} A${w/2},${ry} 0 0,1 0,${h-ry} Z M0,${ry} A${w/2},${ry} 0 0,0 ${w},${ry}`
}

let drag = null, off = { x: 0, y: 0 }
let resizing = null
const MIN_NODE_W = 40
const MIN_NODE_H = 24

function onDragStart(ev, node) {
  drag = { target: node }
  const p = s2svg(ev.clientX, ev.clientY)
  off = { x: p.x - node.x, y: p.y - node.y }
}

function startResize(ev, node, handle) {
  const p = s2svg(ev.clientX, ev.clientY)
  resizing = {
    node,
    handle,
    startMouse: p,
    startX: node.x,
    startY: node.y,
    startW: node.w,
    startH: node.h
  }
}

let pan = false, ps = { x: 0, y: 0 }, pvb = { x: 0, y: 0 }
function onPanStart(ev) {
  if (drag || drawing.value || resizing) return
  selectedEdge.value = null
  pan = true; ps = { x: ev.clientX, y: ev.clientY }
  pvb = { x: vb.value.x, y: vb.value.y }
}

function onMove(ev) {
  if (drawing.value) {
    drawMouse.value = s2svg(ev.clientX, ev.clientY)
    return
  }
  if (resizing) {
    const p = s2svg(ev.clientX, ev.clientY)
    const dx = p.x - resizing.startMouse.x
    const dy = p.y - resizing.startMouse.y
    const h = resizing.handle
    const n = resizing.node
    if (h === 'se') {
      n.w = Math.max(MIN_NODE_W, resizing.startW + dx)
      n.h = Math.max(MIN_NODE_H, resizing.startH + dy)
    } else if (h === 'sw') {
      const newW = Math.max(MIN_NODE_W, resizing.startW - dx)
      n.x = resizing.startX + resizing.startW - newW
      n.w = newW
      n.h = Math.max(MIN_NODE_H, resizing.startH + dy)
    } else if (h === 'ne') {
      n.w = Math.max(MIN_NODE_W, resizing.startW + dx)
      const newH = Math.max(MIN_NODE_H, resizing.startH - dy)
      n.y = resizing.startY + resizing.startH - newH
      n.h = newH
    } else if (h === 'tl') {
      const newW = Math.max(MIN_NODE_W, resizing.startW - dx)
      const newH = Math.max(MIN_NODE_H, resizing.startH - dy)
      n.x = resizing.startX + resizing.startW - newW
      n.y = resizing.startY + resizing.startH - newH
      n.w = newW
      n.h = newH
    }
    return
  }
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

function onEnd() {
  if (drawing.value) { drawing.value = null; dropTarget.value = null }
  drag = null; pan = false; resizing = null
}

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

const selectedEdge = ref(null)
function selectEdge(e) { selectedEdge.value = selectedEdge.value === e.id ? null : e.id }
function deleteEdge(e) {
  const idx = localEdges.value.findIndex(x => x.id === e.id)
  if (idx >= 0) localEdges.value.splice(idx, 1)
  selectedEdge.value = null
}

const drawing = ref(null)
const drawMouse = ref({ x: 0, y: 0 })
const dropTarget = ref(null)

const drawingPreviewStr = computed(() => {
  if (!drawing.value) return ''
  const src = nd(drawing.value.fromId)
  const s = portOf(src, drawing.value.fromPort)
  const m = drawMouse.value
  if (Math.abs(s.x - m.x) < 3 || Math.abs(s.y - m.y) < 3) {
    return `${s.x},${s.y} ${m.x},${m.y}`
  }
  if (drawing.value.fromPort === 'B' || drawing.value.fromPort === 'T') {
    const midY = (s.y + m.y) / 2
    return `${s.x},${s.y} ${s.x},${midY} ${m.x},${midY} ${m.x},${m.y}`
  }
  const midX = (s.x + m.x) / 2
  return `${s.x},${s.y} ${midX},${s.y} ${midX},${m.y} ${m.x},${m.y}`
})

function startDrawing(ev, node, port) {
  drawing.value = { fromId: node.id, fromPort: port }
  drawMouse.value = s2svg(ev.clientX, ev.clientY)
}

function finishDrawing(targetNode, targetPort) {
  if (!drawing.value || drawing.value.fromId === targetNode.id) {
    drawing.value = null
    dropTarget.value = null
    return
  }
  const newId = 'e_' + Date.now()
  localEdges.value.push({
    id: newId,
    from: drawing.value.fromId,
    to: targetNode.id,
    sourcePort: drawing.value.fromPort,
    targetPort,
    label: '',
    style: { arrowEnd: 'block', strokeWidth: 1, stroke: '#000' }
  })
  drawing.value = null
  dropTarget.value = null
}

const editing = ref(null)
function startEdit(node, field) { editing.value = node.id }
function finishEdit(ev, node, field) {
  const val = ev.target.value.trim()
  if (val && val !== node[field]) node[field] = val
  editing.value = null
}

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
  if (e.key === 'Escape' && drawing.value) { drawing.value = null; dropTarget.value = null }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge.value && !editing.value) {
    const idx = localEdges.value.findIndex(x => x.id === selectedEdge.value)
    if (idx >= 0) localEdges.value.splice(idx, 1)
    selectedEdge.value = null
  }
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
  background: #ffffff;
  cursor: grab;
  overflow: hidden;
}
.uml-wrap:active { cursor: grabbing; }
.uml-wrap.fullscreen {
  position: fixed; inset: 0; z-index: 9999;
  width: 100vw; height: 100vh;
}

.zoom-controls {
  position: absolute; bottom: 14px; left: 14px; z-index: 10;
  display: flex; align-items: center; gap: 2px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 3px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.zoom-btn {
  width: 30px; height: 30px;
  border: none; border-radius: 8px;
  background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #475569;
  transition: background 0.15s;
}
.zoom-btn:hover { background: #f1f5f9; color: #1e293b; }
.zoom-pct {
  font-size: 11px;
  color: #64748b;
  min-width: 36px;
  text-align: center;
  font-weight: 600;
  user-select: none;
}

.minimap {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 10;
  width: 180px;
  height: 120px;
  background: rgba(255,255,255,0.92);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.minimap svg { width: 100%; height: 100%; }

.edit-input {
  width: 100%;
  height: 100%;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  text-align: center;
  font-size: 13px;
  padding: 0 4px;
  outline: none;
  background: #fff;
}

.anchor-dot {
  cursor: crosshair;
  transition: r 0.15s, fill 0.15s;
  pointer-events: all;
}
.anchor-dot:hover {
  r: 5.5;
  fill: #3b82f6;
}
.drop-anchors .anchor-dot {
  r: 5;
  opacity: 0.9;
}
.resize-handles rect { opacity: 0.6; transition: opacity 0.15s; }
.resize-handles rect:hover { opacity: 1; }
</style>
