import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDiagramDrawioXml, buildDiagramLayout } from '../src/utils/umlDrawioBuilder.js'

const SPEC = `开始 -> 审核是否通过？
审核是否通过？ ->|是| 结束
审核是否通过？ ->|否| 重新提交
重新提交 -> 审核是否通过？`

test('activity layout infers flow semantics and applies themed styles', async () => {
  const layout = await buildDiagramLayout('activity', SPEC)

  const startNode = layout.nodes.find(node => node.label === '开始')
  const decisionNode = layout.nodes.find(node => node.label === '审核是否通过？')
  const processNode = layout.nodes.find(node => node.label === '重新提交')

  assert.ok(startNode, 'expected a start node')
  assert.equal(startNode.shape, 'roundedRect')
  assert.equal(startNode.style.fill, '#FFFFFF')
  assert.equal(startNode.style.stroke, '#111111')
  assert.equal(startNode.style.fontColor, '#111111')

  assert.ok(decisionNode, 'expected a decision node')
  assert.equal(decisionNode.shape, 'diamond')
  assert.equal(decisionNode.style.fill, '#FFFFFF')
  assert.equal(decisionNode.style.stroke, '#111111')
  assert.equal(decisionNode.style.fontColor, '#111111')

  assert.ok(processNode, 'expected a process node')
  assert.equal(processNode.shape, 'rect')
  assert.equal(processNode.style.radius, 0)

  assert.ok(layout.edges.some(edge => edge.sourcePoint && edge.targetPoint), 'expected ELK-routed edge geometry')
  assert.ok(layout.edges.every(edge => edge.sourcePort && edge.targetPort), 'expected edges to preserve explicit ports')
  assert.ok(layout.edges.every(edge => edge.style.stroke === '#111111'))
})

test('activity drawio export keeps the flow theme', async () => {
  const xml = await buildDiagramDrawioXml('activity', SPEC, '示例流程图')

  assert.match(xml, /shape=rhombus/)
  assert.match(xml, /fillColor=#FFFFFF/)
  assert.match(xml, /strokeColor=#111111/)
  assert.match(xml, /endArrow=block/)
})
