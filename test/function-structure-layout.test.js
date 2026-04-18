import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDiagramDrawioXml, buildDiagramLayout } from '../src/utils/umlDrawioBuilder.js'

const SPEC = `基于SpringBoot的非遗文创社区的设计与实现: 用户模块,管理员模块
用户模块: 文化社区,地图导航,非遗申报,AI工具,聊天室,个人中心
管理员模块: 图片管理,聊天室管理,对话管理,留言管理,评论管理,文化管理`

test('function structure layout uses thesis-style top grouping and vertical feature bars', async () => {
  const layout = await buildDiagramLayout('function_structure', SPEC)

  const root = layout.nodes.find(node => node.label.includes('基于SpringBoot'))
  const groups = layout.nodes.filter(node => node.label === '用户模块' || node.label === '管理员模块')
  const verticalNodes = layout.nodes.filter(node => node.shape === 'verticalRect')

  assert.ok(root, 'expected root node')
  assert.equal(root.shape, 'rect')
  assert.ok(groups.length >= 2, 'expected second-level group nodes')
  assert.ok(verticalNodes.length >= 6, 'expected vertical feature bars')
  assert.ok(verticalNodes.every(node => node.style?.verticalText === true))
  assert.ok(verticalNodes.every(node => node.style?.radius === 0))
  assert.ok(verticalNodes.every(node => node.style?.fill === '#FFFFFF'))

  const distinctY = unique(verticalNodes.map(node => node.y))
  assert.ok(distinctY.length >= 1, 'expected positioned vertical nodes')
  assert.ok(groups.every(node => node.y > root.y + root.h), 'groups should be below root')
})

test('function structure drawio export keeps rectangular white thesis boxes', async () => {
  const xml = await buildDiagramDrawioXml('function_structure', SPEC, '系统功能结构图')

  assert.match(xml, /rounded=0/)
  assert.match(xml, /fillColor=#FFFFFF/)
  assert.match(xml, /用户模块/)
  assert.match(xml, /文&lt;br\/&gt;化&lt;br\/&gt;社&lt;br\/&gt;区/)
})

function unique(items) {
  return [...new Set(items)]
}
