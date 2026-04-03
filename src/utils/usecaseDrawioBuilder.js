import { layoutUseCase } from './usecaseLayout.js'

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
  <diagram name="${esc(diagramName || '用例图')}">
    <mxGraphModel dx="1320" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${Math.max(1200, Math.ceil(width))}" pageHeight="${Math.max(800, Math.ceil(height))}" math="0" shadow="0">
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

export function buildUseCaseDrawioXml({ actors, relations = [], diagramName = '用例图' }) {
  const layout = layoutUseCase(actors, relations)
  const cells = []
  const nodeMap = new Map()

  for (const node of layout.nodes) {
    if (node.type === 'actor') {
      const width = 54
      const height = 94
      const x = node.x - width / 2
      const y = node.y - 40
      cells.push(vertexCell({
        id: node.id,
        value: node.name,
        x,
        y,
        w: width,
        h: height,
        style: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;strokeColor=#111111;fillColor=none;fontColor=#111111;fontStyle=1;'
      }))
      nodeMap.set(node.id, { x, y, w: width, h: height })
      continue
    }

    const width = (node.rx || 78) * 2
    const height = (node.ry || 24) * 2
    const x = node.x - width / 2
    const y = node.y - height / 2
    const fillColor = node.ucType === 'include' || node.ucType === 'extend' ? '#FAFAFA' : '#FFFFFF'
    cells.push(vertexCell({
      id: node.id,
      value: node.name,
      x,
      y,
      w: width,
      h: height,
      style: `ellipse;whiteSpace=wrap;html=1;fillColor=${fillColor};strokeColor=#111111;fontColor=#111111;align=center;verticalAlign=middle;`
    }))
    nodeMap.set(node.id, { x, y, w: width, h: height })
  }

  let edgeIndex = 0
  for (const edge of layout.edges) {
    const style = edge.type === 'include'
      ? 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111111;fontColor=#555555;dashed=1;dashPattern=8 6;endArrow=open;endFill=0;'
      : edge.type === 'extend'
        ? 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111111;fontColor=#555555;dashed=1;dashPattern=8 6;endArrow=open;endFill=0;'
        : edge.type === 'generalization'
          ? 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111111;fontColor=#555555;endArrow=block;endFill=0;'
          : 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111111;fontColor=#555555;endArrow=none;'

    const label = edge.type === 'include'
      ? '&lt;&lt;include&gt;&gt;'
      : edge.type === 'extend'
        ? '&lt;&lt;extend&gt;&gt;'
        : ''

    cells.push(edgeCell({
      id: `edge_${edgeIndex++}`,
      source: edge.fromId,
      target: edge.toId,
      value: label,
      style
    }))
  }

  return wrapFile(diagramName, cells, layout.width + 140, layout.height + 140)
}
