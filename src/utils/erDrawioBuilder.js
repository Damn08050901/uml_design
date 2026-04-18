import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapFile(diagramName, cells, width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Codex" version="24.7.17">
  <diagram name="${esc(diagramName || 'ER图')}">
    <mxGraphModel dx="1320" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${Math.max(1200, Math.ceil(width))}" pageHeight="${Math.max(900, Math.ceil(height))}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}

function vertexCell({ id, value, style, x, y, w, h, parent = '1' }) {
  return `<mxCell id="${id}" value="${esc(value)}" style="${style}" vertex="1" parent="${parent}"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/></mxCell>`
}

function edgeCell({ id, value = '', style, source, target, parent = '1' }) {
  return `<mxCell id="${id}" value="${esc(value)}" style="${style}" edge="1" parent="${parent}" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`
}

function tableHtml(table, showAttrs = true) {
  const title = esc(table.comment || table.name)
  if (!showAttrs) {
    return `<div style="text-align:center;font-weight:700;font-size:14px;line-height:1.6;">${title}</div>`
  }
  const rows = table.columns.map(col => {
    const label = col.comment || col.name
    const prefix = col.isPK ? '<span style="font-weight:700;text-decoration:underline;">PK</span> ' : ''
    return `<div style="line-height:1.55;">${prefix}${esc(label)} <span style="color:#64748b;">${esc(col.type)}</span></div>`
  }).join('')
  return `<div style="font-weight:700;font-size:14px;text-align:center;line-height:1.6;">${title}</div><hr/>${rows}`
}

function measureWidth(table, showAttrs) {
  const titleLen = String(table.comment || table.name).length
  if (!showAttrs) return Math.max(180, Math.min(280, 60 + titleLen * 14))
  const maxColLen = table.columns.reduce((acc, col) => {
    const text = `${col.comment || col.name} ${col.type || ''}`
    return Math.max(acc, text.length)
  }, titleLen)
  return Math.max(220, Math.min(340, 70 + maxColLen * 10))
}

function measureHeight(table, showAttrs) {
  if (!showAttrs) return 58
  return Math.max(96, 54 + table.columns.length * 22)
}

async function layoutTables(nodes, edges) {
  if (nodes.length === 0) return { width: 1200, height: 900, nodes: new Map() }
  try {
    // Use stress algorithm for ER diagrams: it places connected tables closer
    // and naturally minimizes edge crossings for non-hierarchical graphs
    const isSmall = nodes.length <= 3
    const graph = {
      id: 'root',
      layoutOptions: isSmall ? {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.padding': '[left=80, top=80, right=80, bottom=80]',
        'elk.spacing.nodeNode': '90',
        'elk.layered.spacing.nodeNodeBetweenLayers': '140',
        'elk.spacing.componentComponent': '110',
        'elk.separateConnectedComponents': 'true'
      } : {
        'elk.algorithm': 'stress',
        'elk.padding': '[left=80, top=80, right=80, bottom=80]',
        'elk.spacing.nodeNode': '120',
        'elk.spacing.componentComponent': '130',
        'elk.separateConnectedComponents': 'true',
        'elk.stress.desiredEdgeLength': '280',
        'elk.stress.epsilon': '0.001'
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
    const result = await elk.layout(graph)
    const map = new Map()
    for (const child of result.children || []) {
      const source = nodes.find(node => node.id === child.id)
      if (!source) continue
      map.set(child.id, { ...source, x: child.x || 0, y: child.y || 0 })
    }
    return { width: (result.width || 1200) + 120, height: (result.height || 900) + 120, nodes: map }
  } catch {
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
    const map = new Map()
    let maxX = 0
    let maxY = 0
    for (let i = 0; i < nodes.length; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 80 + col * 360
      const y = 80 + row * 240
      map.set(nodes[i].id, { ...nodes[i], x, y })
      maxX = Math.max(maxX, x + nodes[i].w)
      maxY = Math.max(maxY, y + nodes[i].h)
    }
    return { width: maxX + 80, height: maxY + 80, nodes: map }
  }
}

export async function buildErDrawioXml({ parsed, diagramName = 'ER图', showAttrs = true }) {
  const tables = parsed?.tables || []
  const relationships = parsed?.relationships || []
  if (tables.length === 0) throw new Error('请先输入有效的建表 SQL')

  const nodes = tables.map((table, index) => ({
    id: `table_${index}`,
    key: table.name,
    table,
    w: measureWidth(table, showAttrs),
    h: measureHeight(table, showAttrs)
  }))
  const nodeMap = new Map(nodes.map(node => [node.key, node]))
  const edges = relationships
    .filter(rel => nodeMap.has(rel.from) && nodeMap.has(rel.to))
    .map((rel, index) => ({
      id: `rel_${index}`,
      from: nodeMap.get(rel.from).id,
      to: nodeMap.get(rel.to).id,
      label: rel.fromCol ? `${rel.fromCol} -> ${rel.toCol || 'id'}` : (rel.label || '关联')
    }))

  const placed = await layoutTables(nodes, edges)
  const cells = []

  for (const node of nodes) {
    const box = placed.nodes.get(node.id) || { ...node, x: 80, y: 80 }
    cells.push(vertexCell({
      id: node.id,
      x: box.x,
      y: box.y,
      w: node.w,
      h: node.h,
      value: tableHtml(node.table, showAttrs),
      style: 'rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#111111;fontColor=#111111;spacing=10;verticalAlign=top;align=left;overflow=fill;'
    }))
  }

  for (const edge of edges) {
    cells.push(edgeCell({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      value: edge.label,
      style: 'edgeStyle=entityRelationEdgeStyle;rounded=0;html=1;strokeColor=#111111;fontColor=#555555;startArrow=manyOptional;startFill=0;endArrow=dash;endFill=0;'
    }))
  }

  return wrapFile(diagramName, cells, placed.width, placed.height)
}
