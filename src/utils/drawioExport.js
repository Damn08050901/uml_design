/**
 * 导出draw.io格式(.drawio XML)
 * 将ER图节点和边转换为draw.io可识别的mxGraph XML
 */
export function toDrawioXml(nodes, edges) {
  let cellId = 2
  const cells = []

  // 节点
  for (const n of nodes) {
    const id = cellId++
    n._drawioId = id
    if (n.type === 'entity') {
      cells.push(`<mxCell id="${id}" value="${esc(n.label)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontStyle=1;fontSize=14;" vertex="1" parent="1"><mxGeometry x="${n.x - 60}" y="${n.y - 20}" width="120" height="40" as="geometry"/></mxCell>`)
    } else {
      const style = n.type === 'pk'
        ? 'ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontStyle=4;fontSize=12;'
        : 'ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=12;'
      cells.push(`<mxCell id="${id}" value="${esc(n.label)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${n.x - 50}" y="${n.y - 20}" width="100" height="40" as="geometry"/></mxCell>`)
    }
  }

  // 属性连线
  for (const n of nodes) {
    if (!n.parentId) continue
    const parent = nodes.find(p => p.id === n.parentId)
    if (!parent) continue
    const id = cellId++
    cells.push(`<mxCell id="${id}" value="" style="endArrow=none;html=1;strokeColor=#000000;" edge="1" parent="1" source="${parent._drawioId}" target="${n._drawioId}"><mxGeometry relative="1" as="geometry"/></mxCell>`)
  }

  // 关系菱形+连线
  for (const e of edges) {
    const fromNode = nodes.find(n => n.id === e.fromId)
    const toNode = nodes.find(n => n.id === e.toId)
    if (!fromNode || !toNode) continue
    // 菱形
    const did = cellId++
    cells.push(`<mxCell id="${did}" value="${esc(e.label)}" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=12;" vertex="1" parent="1"><mxGeometry x="${e.mx - 25}" y="${e.my - 20}" width="50" height="40" as="geometry"/></mxCell>`)
    // 连线
    const lid1 = cellId++
    cells.push(`<mxCell id="${lid1}" value="1" style="endArrow=none;html=1;strokeColor=#000000;fontSize=11;" edge="1" parent="1" source="${fromNode._drawioId}" target="${did}"><mxGeometry relative="1" as="geometry"/></mxCell>`)
    const lid2 = cellId++
    cells.push(`<mxCell id="${lid2}" value="N" style="endArrow=none;html=1;strokeColor=#000000;fontSize=11;" edge="1" parent="1" source="${did}" target="${toNode._drawioId}"><mxGeometry relative="1" as="geometry"/></mxCell>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram name="ER图">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
