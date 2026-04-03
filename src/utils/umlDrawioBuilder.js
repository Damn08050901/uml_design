import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

const BASE_VERTEX_STYLE = 'whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111111;fontColor=#111111;'
const BASE_EDGE_STYLE = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111111;fontColor=#444444;'

function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escHtml(value) {
  return escXml(value).replace(/\n/g, '<br/>')
}

function splitList(value) {
  return String(value || '')
    .split(/[,，、;；]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function lineCount(text) {
  return String(text || '').split('<br/>').length
}

function wrapDrawioFile(diagramName, cells, pageWidth = 1600, pageHeight = 1000) {
  const width = Math.max(1200, Math.ceil(pageWidth))
  const height = Math.max(800, Math.ceil(pageHeight))
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Codex" version="24.7.17">
  <diagram name="${escXml(diagramName || 'UML图')}">
    <mxGraphModel dx="1320" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}

function createIdFactory() {
  let cursor = 2
  return function nextId(prefix = 'cell') {
    return `${prefix}_${cursor++}`
  }
}

function vertexCell({ id, value = '', style = '', x, y, w, h, parent = '1' }) {
  return `<mxCell id="${id}" value="${escXml(value)}" style="${style}" vertex="1" parent="${parent}"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.max(1, Math.round(w))}" height="${Math.max(1, Math.round(h))}" as="geometry"/></mxCell>`
}

function edgeCell({
  id,
  value = '',
  style = '',
  source = null,
  target = null,
  parent = '1',
  points = [],
  sourcePoint = null,
  targetPoint = null
}) {
  const sourceAttr = source ? ` source="${source}"` : ''
  const targetAttr = target ? ` target="${target}"` : ''
  const geometryParts = []
  if (sourcePoint) geometryParts.push(`<mxPoint x="${Math.round(sourcePoint.x)}" y="${Math.round(sourcePoint.y)}" as="sourcePoint"/>`)
  if (targetPoint) geometryParts.push(`<mxPoint x="${Math.round(targetPoint.x)}" y="${Math.round(targetPoint.y)}" as="targetPoint"/>`)
  if (points.length > 0) {
    geometryParts.push(`<Array as="points">${points.map(point => `<mxPoint x="${Math.round(point.x)}" y="${Math.round(point.y)}"/>`).join('')}</Array>`)
  }
  return `<mxCell id="${id}" value="${escXml(value)}" style="${style}" edge="1" parent="${parent}"${sourceAttr}${targetAttr}><mxGeometry relative="1" as="geometry">${geometryParts.join('')}</mxGeometry></mxCell>`
}

function htmlLines(lines, options = {}) {
  const align = options.align || 'left'
  const weight = options.weight || 'normal'
  return `<div style="text-align:${align};font-weight:${weight};line-height:1.6;">${lines.map(line => escHtml(line)).join('<br/>')}</div>`
}

function classCardHtml(item) {
  const attrs = item.attrs.length > 0 ? item.attrs : ['-']
  const methods = item.methods.length > 0 ? item.methods : ['-']
  return [
    `<div style="text-align:center;font-weight:700;font-size:14px;line-height:1.5;">${escHtml(item.name)}</div>`,
    '<hr/>',
    htmlLines(attrs),
    '<hr/>',
    htmlLines(methods)
  ].join('')
}

function deploymentCardHtml(item) {
  const stereotype = guessDeploymentRole(item.name)
  const items = item.items.length > 0 ? item.items : ['-']
  return [
    `<div style="text-align:center;color:#666;font-style:italic;font-size:11px;line-height:1.4;">${escHtml(stereotype)}</div>`,
    `<div style="text-align:center;font-weight:700;font-size:14px;line-height:1.5;">${escHtml(item.name)}</div>`,
    htmlLines(items, { align: 'center' })
  ].join('<br/>')
}

function nodeLabelHtml(label, bold = false, align = 'center') {
  return htmlLines(String(label || '').split('\n'), { align, weight: bold ? '700' : 'normal' })
}

function measureText(value, min = 120, max = 280, factor = 12, padding = 50) {
  const longest = String(value || '')
    .split('\n')
    .reduce((acc, line) => Math.max(acc, line.length), 0)
  return Math.max(min, Math.min(max, padding + longest * factor))
}

function guessDeploymentRole(name) {
  const text = String(name || '').toLowerCase()
  if (text.includes('客户') || text.includes('前端') || text.includes('浏览器') || text.includes('终端')) return '<<客户端>>'
  if (text.includes('数据库') || text.includes('mysql') || text.includes('redis') || text.includes('pg')) return '<<数据库服务器>>'
  if (text.includes('缓存')) return '<<缓存服务器>>'
  if (text.includes('文件') || text.includes('存储') || text.includes('oss') || text.includes('s3')) return '<<文件服务器>>'
  return '<<应用服务器>>'
}

function gridLayout(nodes, options = {}) {
  const margin = options.margin || 80
  const gapX = options.gapX || 90
  const gapY = options.gapY || 90
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const placed = new Map()
  let maxX = 0
  let maxY = 0
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = margin + col * (node.w + gapX)
    const y = margin + row * (node.h + gapY)
    placed.set(node.id, { ...node, x, y })
    maxX = Math.max(maxX, x + node.w)
    maxY = Math.max(maxY, y + node.h)
  }
  return { nodes: placed, width: maxX + margin, height: maxY + margin }
}

async function elkLayout(nodes, edges, options = {}) {
  if (nodes.length === 0) return { nodes: new Map(), width: 1200, height: 800 }
  try {
    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': options.direction || 'RIGHT',
        'elk.edgeRouting': options.edgeRouting || 'ORTHOGONAL',
        'elk.padding': options.padding || '[left=80, top=80, right=80, bottom=80]',
        'elk.spacing.nodeNode': String(options.nodeSpacing || 80),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(options.layerSpacing || 110),
        'elk.spacing.componentComponent': String(options.componentSpacing || 90),
        'elk.separateConnectedComponents': 'true'
      },
      children: nodes.map(node => ({
        id: node.id,
        width: node.w,
        height: node.h
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        sources: [edge.from],
        targets: [edge.to]
      }))
    }
    const layout = await elk.layout(graph)
    const placed = new Map()
    for (const child of layout.children || []) {
      const source = nodes.find(node => node.id === child.id)
      if (!source) continue
      placed.set(child.id, { ...source, x: child.x || 0, y: child.y || 0 })
    }
    return {
      nodes: placed,
      width: (layout.width || 1200) + 120,
      height: (layout.height || 800) + 120
    }
  } catch {
    return gridLayout(nodes, {
      margin: 80,
      gapX: options.nodeSpacing || 100,
      gapY: options.layerSpacing || 100
    })
  }
}

function parseClassSpec(spec) {
  const lines = String(spec || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const classes = []
  const rels = []
  for (const line of lines) {
    const rel = line.match(/^(.+?)\s+(<\|--|\*--|o--|-->|->|--|\.{2}>)\s+(.+?)(?:\s*:\s*(.+))?$/)
    if (rel) {
      rels.push({
        from: rel[1].trim(),
        op: rel[2],
        to: rel[3].trim(),
        label: (rel[4] || '').trim()
      })
      continue
    }
    if (!line.includes('|')) continue
    const parts = line.split('|')
    classes.push({
      name: parts[0].trim(),
      attrs: splitList(parts[1] || ''),
      methods: splitList(parts[2] || '')
    })
  }
  if (classes.length === 0) throw new Error('请先输入类图定义')
  const map = new Map(classes.map(item => [item.name, item]))
  for (const rel of rels) {
    if (!map.has(rel.from)) {
      const node = { name: rel.from, attrs: [], methods: [] }
      map.set(node.name, node)
      classes.push(node)
    }
    if (!map.has(rel.to)) {
      const node = { name: rel.to, attrs: [], methods: [] }
      map.set(node.name, node)
      classes.push(node)
    }
  }
  return { classes, relations: rels }
}

function createFlowNode(raw) {
  const text = raw.trim()
  if (!text) return null
  if (/^\(\((.+)\)\)$/.test(text)) return { key: text, label: text.slice(2, -2).trim(), type: 'connector' }
  if (/^\[\((.+)\)\]$/.test(text)) return { key: text, label: text.slice(2, -2).trim(), type: 'database' }
  if (/^\[\[(.+)\]\]$/.test(text)) return { key: text, label: text.slice(2, -2).trim(), type: 'subprocess' }
  if (/^\{(.+)\}$/.test(text)) return { key: text, label: text.slice(1, -1).trim(), type: 'decision' }
  if (/^\/(.+)\/$/.test(text)) return { key: text, label: text.slice(1, -1).trim(), type: 'io' }
  if (/^\((.+)\)$/.test(text)) return { key: text, label: text.slice(1, -1).trim(), type: 'terminator' }
  if (/^(开始|结束)$/i.test(text)) return { key: text, label: text, type: 'terminator' }
  if (/^\[(.+)\]$/.test(text)) return { key: text, label: text.slice(1, -1).trim(), type: 'process' }
  return { key: text, label: text, type: 'process' }
}

function parseActivitySpec(spec) {
  const nodes = new Map()
  const edges = []
  const lines = String(spec || '').replace(/\r/g, '').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!line.includes('|') && line.split('->').length > 2) {
      const parts = line.split('->').map(item => item.trim()).filter(Boolean)
      for (let i = 0; i < parts.length - 1; i++) {
        const from = createFlowNode(parts[i])
        const to = createFlowNode(parts[i + 1])
        if (!from || !to) continue
        if (!nodes.has(from.key)) nodes.set(from.key, from)
        if (!nodes.has(to.key)) nodes.set(to.key, to)
        edges.push({ from: from.key, to: to.key, label: '' })
      }
      continue
    }
    const match = line.match(/^(.+?)\s*->(?:\|(.+?)\|)?\s*(.+)$/)
    if (!match) continue
    const from = createFlowNode(match[1])
    const to = createFlowNode(match[3])
    if (!from || !to) continue
    if (!nodes.has(from.key)) nodes.set(from.key, from)
    if (!nodes.has(to.key)) nodes.set(to.key, to)
    edges.push({ from: from.key, to: to.key, label: (match[2] || '').trim() })
  }
  return { nodes: [...nodes.values()], edges }
}

function parseNamedBlocks(spec) {
  const nodes = []
  const map = new Map()
  const edges = []
  const lines = String(spec || '').replace(/\r/g, '').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const edge = line.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/)
    if (edge) {
      const from = edge[1].trim()
      const to = edge[2].trim()
      if (!map.has(from)) {
        const node = { name: from, items: [] }
        map.set(from, node)
        nodes.push(node)
      }
      if (!map.has(to)) {
        const node = { name: to, items: [] }
        map.set(to, node)
        nodes.push(node)
      }
      edges.push({ from, to, label: (edge[3] || '').trim() })
      continue
    }
    const nodeMatch = line.match(/^(.+?)\s*:\s*(.+)$/)
    if (!nodeMatch) continue
    const name = nodeMatch[1].trim()
    const items = splitList(nodeMatch[2])
    if (!map.has(name)) {
      const node = { name, items }
      map.set(name, node)
      nodes.push(node)
    } else {
      map.get(name).items = [...new Set([...(map.get(name).items || []), ...items])]
    }
  }
  return { nodes, edges }
}

function parseArchitectureSpec(spec) {
  const layers = []
  const layerMap = new Map()
  const edges = []
  const lines = String(spec || '').replace(/\r/g, '').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const edge = line.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/)
    if (edge) {
      edges.push({ from: edge[1].trim(), to: edge[2].trim(), label: (edge[3] || '').trim() })
      continue
    }
    const layer = line.match(/^(.+?)\s*:\s*(.+)$/)
    if (!layer) continue
    const name = layer[1].trim()
    const items = splitList(layer[2])
    if (!layerMap.has(name)) {
      const item = { name, items }
      layerMap.set(name, item)
      layers.push(item)
    } else {
      layerMap.get(name).items = [...new Set([...(layerMap.get(name).items || []), ...items])]
    }
  }
  return { layers, edges }
}

function parseFunctionStructureSpec(spec) {
  const nodes = new Set()
  const edges = []
  const lines = String(spec || '').replace(/\r/g, '').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const edge = line.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/)
    if (edge) {
      const from = edge[1].trim()
      const to = edge[2].trim()
      if (from && to) {
        nodes.add(from)
        nodes.add(to)
        edges.push({ from, to, label: (edge[3] || '').trim() })
      }
      continue
    }
    const block = line.match(/^(.+?)\s*:\s*(.+)$/)
    if (block) {
      const parent = block[1].trim()
      const children = splitList(block[2])
      nodes.add(parent)
      for (const child of children) {
        nodes.add(child)
        edges.push({ from: parent, to: child, label: '' })
      }
      continue
    }
    nodes.add(line)
  }
  return { nodes: [...nodes], edges }
}

function parseSequenceSpec(spec) {
  const lines = String(spec || '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean)
  const participants = []
  const partMap = new Map()
  const events = []
  const ensureParticipant = (name, type = 'participant') => {
    const key = name.trim()
    if (!key) return
    if (!partMap.has(key)) {
      const item = { name: key, type }
      partMap.set(key, item)
      participants.push(item)
    } else if (type === 'actor') {
      partMap.get(key).type = 'actor'
    }
  }
  for (const line of lines) {
    const part = line.match(/^(actor|participant|database|control|entity|boundary)\s+(.+)$/i)
    if (part) {
      ensureParticipant(part[2].trim(), part[1].toLowerCase())
      continue
    }
    const msg = line.match(/^(.+?)(->>|-->>|->|-->)\s*(.+?)\s*:\s*(.+)$/)
    if (msg) {
      const from = msg[1].trim()
      const to = msg[3].trim()
      ensureParticipant(from)
      ensureParticipant(to)
      events.push({ type: 'msg', from, to, arrow: msg[2], text: msg[4].trim() })
      continue
    }
    const alt = line.match(/^alt\s+(.+)$/i)
    if (alt) {
      events.push({ type: 'alt', text: alt[1].trim() })
      continue
    }
    const els = line.match(/^else(?:\s+(.+))?$/i)
    if (els) {
      events.push({ type: 'else', text: (els[1] || '').trim() })
      continue
    }
    if (/^end$/i.test(line)) {
      events.push({ type: 'end' })
    }
  }
  return { participants, events }
}

async function buildClassDiagram(diagramName, spec) {
  const parsed = parseClassSpec(spec)
  const idOf = createIdFactory()
  const nodes = parsed.classes.map(item => {
    const attrs = item.attrs.length > 0 ? item.attrs : ['-']
    const methods = item.methods.length > 0 ? item.methods : ['-']
    const width = Math.max(
      measureText(item.name, 210, 340, 11, 60),
      measureText(attrs.join('\n'), 210, 340, 9, 46),
      measureText(methods.join('\n'), 210, 340, 9, 46)
    )
    return {
      id: idOf('class'),
      key: item.name,
      name: item.name,
      attrs,
      methods,
      w: width,
      h: 78 + attrs.length * 22 + methods.length * 22
    }
  })
  const nodeMap = new Map(nodes.map(node => [node.key, node]))
  const edges = parsed.relations
    .filter(rel => nodeMap.has(rel.from) && nodeMap.has(rel.to))
    .map(rel => ({
      id: idOf('edge'),
      from: nodeMap.get(rel.from).id,
      to: nodeMap.get(rel.to).id,
      raw: rel
    }))

  const placed = await elkLayout(nodes, edges, {
    direction: 'RIGHT',
    nodeSpacing: 80,
    layerSpacing: 140,
    componentSpacing: 120
  })

  const xmlCells = []
  for (const node of nodes) {
    const box = placed.nodes.get(node.id) || { ...node, x: 80, y: 80 }
    xmlCells.push(vertexCell({
      id: node.id,
      x: box.x,
      y: box.y,
      w: node.w,
      h: node.h,
      style: `${BASE_VERTEX_STYLE}rounded=0;spacing=10;verticalAlign=top;align=left;overflow=fill;`,
      value: classCardHtml(node)
    }))
  }

  for (const edge of edges) {
    const rel = edge.raw
    const style = `${BASE_EDGE_STYLE}${classEdgeStyle(rel.op)}strokeWidth=1.4;`
    xmlCells.push(edgeCell({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      value: rel.label || '',
      style
    }))
  }

  return wrapDrawioFile(diagramName, xmlCells, placed.width, placed.height)
}

function classEdgeStyle(op) {
  if (op === '<|--') return 'endArrow=block;endFill=0;'
  if (op === '-->') return 'endArrow=block;'
  if (op === '->') return 'endArrow=block;'
  if (op === '..>') return 'endArrow=open;dashed=1;dashPattern=8 6;'
  if (op === '*--') return 'startArrow=diamondThin;startFill=1;endArrow=none;'
  if (op === 'o--') return 'startArrow=diamondThin;startFill=0;endArrow=none;'
  return 'endArrow=none;'
}

async function buildActivityDiagram(diagramName, spec) {
  const parsed = parseActivitySpec(spec)
  if (parsed.nodes.length === 0 || parsed.edges.length === 0) throw new Error('请先输入流程图定义')
  const idOf = createIdFactory()
  const nodes = parsed.nodes.map(item => {
    const width = item.type === 'connector'
      ? 40
      : item.type === 'decision'
        ? Math.max(110, measureText(item.label, 110, 180, 10, 30))
        : measureText(item.label, 120, 220, 11, 50)
    const height = item.type === 'connector'
      ? 40
      : item.type === 'decision'
        ? Math.max(84, 40 + lineCount(item.label) * 18)
        : Math.max(54, 38 + lineCount(item.label) * 16)
    return {
      id: idOf('flow'),
      key: item.key,
      label: item.label,
      type: item.type,
      w: width,
      h: height
    }
  })
  const nodeMap = new Map(nodes.map(node => [node.key, node]))
  const edges = parsed.edges
    .filter(edge => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map(edge => ({
      id: idOf('edge'),
      from: nodeMap.get(edge.from).id,
      to: nodeMap.get(edge.to).id,
      label: edge.label
    }))
  const placed = await elkLayout(nodes, edges, {
    direction: 'DOWN',
    nodeSpacing: 80,
    layerSpacing: 110,
    componentSpacing: 110
  })

  const xmlCells = []
  for (const node of nodes) {
    const box = placed.nodes.get(node.id) || { ...node, x: 80, y: 80 }
    xmlCells.push(vertexCell({
      id: node.id,
      x: box.x,
      y: box.y,
      w: node.w,
      h: node.h,
      value: nodeLabelHtml(node.label),
      style: `${BASE_VERTEX_STYLE}${flowNodeStyle(node.type)}`
    }))
  }
  for (const edge of edges) {
    xmlCells.push(edgeCell({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      value: edge.label || '',
      style: `${BASE_EDGE_STYLE}endArrow=block;strokeWidth=1.3;`
    }))
  }
  return wrapDrawioFile(diagramName, xmlCells, placed.width, placed.height)
}

function flowNodeStyle(type) {
  if (type === 'terminator') return 'rounded=1;arcSize=50;align=center;verticalAlign=middle;'
  if (type === 'decision') return 'shape=rhombus;perimeter=rhombusPerimeter;align=center;verticalAlign=middle;'
  if (type === 'io') return 'shape=parallelogram;perimeter=parallelogramPerimeter;align=center;verticalAlign=middle;'
  if (type === 'database') return 'shape=cylinder;boundedLbl=1;backgroundOutline=1;align=center;verticalAlign=middle;'
  if (type === 'connector') return 'shape=ellipse;aspect=fixed;align=center;verticalAlign=middle;'
  if (type === 'subprocess') return 'shape=process;align=center;verticalAlign=middle;'
  return 'rounded=1;arcSize=10;align=center;verticalAlign=middle;'
}

async function buildDeploymentDiagram(diagramName, spec) {
  const parsed = parseNamedBlocks(spec)
  if (parsed.nodes.length < 2) throw new Error('请至少输入 2 个部署节点')
  const idOf = createIdFactory()
  const nodes = parsed.nodes.map(item => {
    const width = Math.max(
      measureText(item.name, 230, 320, 11, 60),
      measureText((item.items || []).join('\n'), 230, 320, 9, 54)
    )
    const items = item.items.length > 0 ? item.items : ['-']
    return {
      id: idOf('deploy'),
      key: item.name,
      name: item.name,
      items,
      w: width,
      h: 92 + items.length * 20
    }
  })
  const nodeMap = new Map(nodes.map(node => [node.key, node]))
  const edges = parsed.edges
    .filter(edge => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map(edge => ({
      id: idOf('edge'),
      from: nodeMap.get(edge.from).id,
      to: nodeMap.get(edge.to).id,
      label: edge.label
    }))
  const placed = await elkLayout(nodes, edges, {
    direction: 'RIGHT',
    nodeSpacing: 90,
    layerSpacing: 150,
    componentSpacing: 120
  })

  const xmlCells = []
  for (const node of nodes) {
    const box = placed.nodes.get(node.id) || { ...node, x: 80, y: 80 }
    xmlCells.push(vertexCell({
      id: node.id,
      x: box.x,
      y: box.y,
      w: node.w,
      h: node.h,
      style: `${BASE_VERTEX_STYLE}rounded=1;arcSize=12;spacing=10;verticalAlign=top;align=center;overflow=fill;fillColor=#FCFCFC;`,
      value: deploymentCardHtml(node)
    }))
  }
  for (const edge of edges) {
    xmlCells.push(edgeCell({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      value: edge.label || '',
      style: `${BASE_EDGE_STYLE}endArrow=block;strokeWidth=1.3;`
    }))
  }
  return wrapDrawioFile(diagramName, xmlCells, placed.width, placed.height)
}

async function buildArchitectureDiagram(diagramName, spec) {
  const parsed = parseArchitectureSpec(spec)
  if (parsed.layers.length === 0) throw new Error('请先定义架构分层')
  const idOf = createIdFactory()
  const xmlCells = []
  const itemIds = new Map()

  const itemWidth = 170
  const itemHeight = 56
  const itemGap = 48
  const lanePadding = 24
  const laneTop = 48
  const laneHeight = 136
  const marginX = 90
  const marginY = 72
  const maxItems = Math.max(...parsed.layers.map(layer => Math.max(1, layer.items.length)))
  const laneWidth = Math.max(960, maxItems * itemWidth + Math.max(0, maxItems - 1) * itemGap + lanePadding * 2)

  let pageHeight = marginY
  for (let index = 0; index < parsed.layers.length; index++) {
    const layer = parsed.layers[index]
    const laneId = idOf('lane')
    const y = marginY + index * (laneHeight + 20)
    xmlCells.push(vertexCell({
      id: laneId,
      x: marginX,
      y,
      w: laneWidth,
      h: laneHeight,
      value: layer.name,
      style: `${BASE_VERTEX_STYLE}swimlane;startSize=28;horizontal=0;container=1;collapsible=0;fillColor=#FAFAFA;rounded=0;strokeWidth=1.2;fontStyle=1;align=left;`
    }))

    const items = layer.items.length > 0 ? layer.items : ['-']
    const totalWidth = items.length * itemWidth + Math.max(0, items.length - 1) * itemGap
    const startX = Math.max(lanePadding, Math.floor((laneWidth - totalWidth) / 2))
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const name = items[itemIndex]
      const cellId = idOf('module')
      itemIds.set(name, cellId)
      xmlCells.push(vertexCell({
        id: cellId,
        parent: laneId,
        x: startX + itemIndex * (itemWidth + itemGap),
        y: laneTop,
        w: itemWidth,
        h: itemHeight,
        value: nodeLabelHtml(name),
        style: `${BASE_VERTEX_STYLE}rounded=1;arcSize=12;align=center;verticalAlign=middle;`
      }))
    }
    pageHeight = y + laneHeight + marginY
  }

  const rels = parsed.edges.length > 0 ? parsed.edges : buildDefaultArchitectureEdges(parsed.layers)
  for (const edge of rels) {
    const source = itemIds.get(edge.from)
    const target = itemIds.get(edge.to)
    if (!source || !target) continue
    xmlCells.push(edgeCell({
      id: idOf('edge'),
      source,
      target,
      value: edge.label || '',
      style: `${BASE_EDGE_STYLE}endArrow=block;strokeWidth=1.3;`
    }))
  }

  return wrapDrawioFile(diagramName, xmlCells, laneWidth + marginX * 2, pageHeight)
}

function buildDefaultArchitectureEdges(layers) {
  const edges = []
  for (let i = 0; i < layers.length - 1; i++) {
    const current = layers[i].items || []
    const next = layers[i + 1].items || []
    for (let j = 0; j < current.length; j++) {
      if (next.length === 0) continue
      edges.push({ from: current[j], to: next[Math.min(j, next.length - 1)], label: '' })
    }
  }
  return edges
}

async function buildFunctionStructureDiagram(diagramName, spec) {
  const parsed = parseFunctionStructureSpec(spec)
  if (parsed.nodes.length === 0) throw new Error('请先输入功能结构定义')
  const idOf = createIdFactory()
  const nodes = parsed.nodes.map(name => ({
    id: idOf('func'),
    key: name,
    name,
    w: measureText(name, 136, 240, 11, 48),
    h: 54
  }))
  const nodeMap = new Map(nodes.map(node => [node.key, node]))
  const edges = parsed.edges
    .filter(edge => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map(edge => ({
      id: idOf('edge'),
      from: nodeMap.get(edge.from).id,
      to: nodeMap.get(edge.to).id,
      label: edge.label
    }))
  const placed = await elkLayout(nodes, edges, {
    direction: 'DOWN',
    nodeSpacing: 60,
    layerSpacing: 120,
    componentSpacing: 100
  })
  const xmlCells = []
  for (const node of nodes) {
    const box = placed.nodes.get(node.id) || { ...node, x: 80, y: 80 }
    xmlCells.push(vertexCell({
      id: node.id,
      x: box.x,
      y: box.y,
      w: node.w,
      h: node.h,
      value: nodeLabelHtml(node.name, true),
      style: `${BASE_VERTEX_STYLE}rounded=1;arcSize=10;align=center;verticalAlign=middle;`
    }))
  }
  for (const edge of edges) {
    xmlCells.push(edgeCell({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      value: edge.label || '',
      style: `${BASE_EDGE_STYLE}endArrow=none;strokeWidth=1.2;`
    }))
  }
  return wrapDrawioFile(diagramName, xmlCells, placed.width, placed.height)
}

async function buildSequenceDiagram(diagramName, spec) {
  const parsed = parseSequenceSpec(spec)
  if (parsed.participants.length < 2) throw new Error('请至少定义 2 个参与者')

  const idOf = createIdFactory()
  const cells = []
  const centerX = new Map()
  const marginX = 110
  const gapX = 220
  const actorY = 30
  const headerY = 44
  const lifelineTop = 136
  let cursorY = 170
  const blocks = []
  const blockStack = []

  for (const event of parsed.events) {
    event.y = cursorY
    if (event.type === 'msg') {
      cursorY += 56
      continue
    }
    if (event.type === 'alt') {
      blockStack.push({ start: cursorY - 18, title: event.text, elseY: null, elseText: '' })
      cursorY += 18
      continue
    }
    if (event.type === 'else') {
      if (blockStack.length > 0) {
        blockStack[blockStack.length - 1].elseY = cursorY - 8
        blockStack[blockStack.length - 1].elseText = event.text || 'else'
      }
      cursorY += 18
      continue
    }
    if (event.type === 'end') {
      if (blockStack.length > 0) {
        const block = blockStack.pop()
        block.end = cursorY + 8
        blocks.push(block)
      }
      cursorY += 10
    }
  }
  while (blockStack.length > 0) {
    const block = blockStack.pop()
    block.end = cursorY + 8
    blocks.push(block)
  }

  const totalWidth = marginX * 2 + gapX * (parsed.participants.length - 1)
  const pageHeight = Math.max(520, cursorY + 110)

  for (let index = 0; index < parsed.participants.length; index++) {
    const participant = parsed.participants[index]
    const x = marginX + index * gapX
    centerX.set(participant.name, x)
    const headerId = idOf('part')
    if (participant.type === 'actor') {
      const width = Math.max(56, measureText(participant.name, 56, 90, 10, 24))
      const height = 88
      cells.push(vertexCell({
        id: headerId,
        x: x - width / 2,
        y: actorY,
        w: width,
        h: height,
        value: participant.name,
        style: `${BASE_VERTEX_STYLE}shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;fillColor=none;strokeWidth=1.5;`
      }))
    } else {
      const width = Math.max(120, measureText(participant.name, 120, 180, 11, 40))
      const height = participant.type === 'database' ? 54 : 40
      cells.push(vertexCell({
        id: headerId,
        x: x - width / 2,
        y: headerY,
        w: width,
        h: height,
        value: nodeLabelHtml(participant.name, true),
        style: `${BASE_VERTEX_STYLE}${sequenceHeaderStyle(participant.type)}`
      }))
    }
    cells.push(vertexCell({
      id: idOf('life'),
      x: x,
      y: lifelineTop,
      w: 1,
      h: pageHeight - lifelineTop - 40,
      value: '',
      style: `${BASE_VERTEX_STYLE}fillColor=none;strokeWidth=1.1;dashed=1;dashPattern=8 6;rounded=0;`
    }))
  }

  for (const block of blocks) {
    const frameX = marginX - 72
    const frameW = (parsed.participants.length - 1) * gapX + 144
    cells.push(vertexCell({
      id: idOf('frame'),
      x: frameX,
      y: block.start,
      w: frameW,
      h: Math.max(46, block.end - block.start),
      value: `alt ${block.title}`,
      style: `${BASE_VERTEX_STYLE}shape=umlFrame;fillColor=none;pointerEvents=0;align=left;verticalAlign=top;spacingTop=4;spacingLeft=8;fontStyle=1;`
    }))
    if (block.elseY) {
      cells.push(edgeCell({
        id: idOf('else'),
        value: `else ${block.elseText}`,
        style: `${BASE_EDGE_STYLE}endArrow=none;startArrow=none;dashed=1;dashPattern=8 6;strokeWidth=1.1;`,
        sourcePoint: { x: frameX, y: block.elseY },
        targetPoint: { x: frameX + frameW, y: block.elseY }
      }))
    }
  }

  for (const event of parsed.events.filter(item => item.type === 'msg' && !item.arrow.includes('--'))) {
    const x = centerX.get(event.to)
    if (x == null) continue
    const height = event.from === event.to ? 38 : 28
    cells.push(vertexCell({
      id: idOf('act'),
      x: x - 8,
      y: event.y - 10,
      w: 16,
      h: height,
      value: '',
      style: `${BASE_VERTEX_STYLE}rounded=0;strokeWidth=1.1;`
    }))
  }

  for (const event of parsed.events.filter(item => item.type === 'msg')) {
    const x1 = centerX.get(event.from)
    const x2 = centerX.get(event.to)
    if (x1 == null || x2 == null) continue
    const isReturn = event.arrow.includes('--')
    const isSelf = event.from === event.to
    const style = `${BASE_EDGE_STYLE}${isReturn ? 'dashed=1;dashPattern=8 6;endArrow=open;' : 'endArrow=block;'}strokeWidth=1.2;`
    if (isSelf) {
      cells.push(edgeCell({
        id: idOf('msg'),
        value: event.text,
        style,
        sourcePoint: { x: x1, y: event.y },
        targetPoint: { x: x1, y: event.y + 24 },
        points: [
          { x: x1 + 42, y: event.y },
          { x: x1 + 42, y: event.y + 24 }
        ]
      }))
      continue
    }
    cells.push(edgeCell({
      id: idOf('msg'),
      value: event.text,
      style,
      sourcePoint: { x: x1, y: event.y },
      targetPoint: { x: x2, y: event.y }
    }))
  }

  return wrapDrawioFile(diagramName, cells, totalWidth + 160, pageHeight + 20)
}

function sequenceHeaderStyle(type) {
  if (type === 'database') return 'shape=cylinder;boundedLbl=1;backgroundOutline=1;align=center;verticalAlign=middle;'
  if (type === 'control') return 'shape=umlControl;align=center;verticalAlign=middle;'
  if (type === 'entity') return 'shape=umlEntity;align=center;verticalAlign=middle;'
  if (type === 'boundary') return 'shape=umlBoundary;align=center;verticalAlign=middle;'
  return 'rounded=1;arcSize=10;align=center;verticalAlign=middle;'
}

export async function buildDiagramDrawioXml(diagramType, spec, diagramName = 'UML图') {
  if (diagramType === 'class') return buildClassDiagram(diagramName, spec)
  if (diagramType === 'sequence') return buildSequenceDiagram(diagramName, spec)
  if (diagramType === 'activity') return buildActivityDiagram(diagramName, spec)
  if (diagramType === 'deployment') return buildDeploymentDiagram(diagramName, spec)
  if (diagramType === 'architecture') return buildArchitectureDiagram(diagramName, spec)
  if (diagramType === 'function_structure') return buildFunctionStructureDiagram(diagramName, spec)
  throw new Error(`暂不支持的图类型: ${diagramType}`)
}
