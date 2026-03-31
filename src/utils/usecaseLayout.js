/**
 * 用例图布局算法
 * 输入: actors数组, 每个actor包含usecases数组
 * 输出: 布局后的节点和连线坐标
 */

const ACTOR_W = 40
const ACTOR_H = 80 // 火柴人总高度(含文字)
const UC_RX = 85   // 用例椭圆水平半径
const UC_RY = 26   // 用例椭圆垂直半径
const UC_GAP_Y = 60 // 用例之间垂直间距
const ACTOR_UC_GAP = 180 // Actor到第一列用例的水平距离
const UC_COL_GAP = 220 // 主用例列到子用例列的水平距离
const PADDING = 60

/**
 * 计算用例图布局
 * @param {Array} actors - [{name, usecases: [{name, type:'main'|'include'|'extend', parentUc?}]}]
 * @param {Array} relations - [{from, to, type:'association'|'include'|'extend'|'generalization'}]
 * @returns {{nodes, edges, width, height}}
 */
export function layoutUseCase(actors, relations = []) {
  const nodes = []
  const edges = []
  let globalY = PADDING

  for (let ai = 0; ai < actors.length; ai++) {
    const actor = actors[ai]
    const mainUcs = actor.usecases.filter(uc => uc.type === 'main' || !uc.type)
    const subUcs = actor.usecases.filter(uc => uc.type === 'include' || uc.type === 'extend')

    // 主用例纵向排列
    const mainStartY = globalY
    const mainX = PADDING + ACTOR_W / 2 + ACTOR_UC_GAP

    for (let i = 0; i < mainUcs.length; i++) {
      const uc = mainUcs[i]
      const y = mainStartY + i * UC_GAP_Y + UC_RY
      nodes.push({
        id: `uc_${ai}_${uc.name}`,
        type: 'usecase',
        ucType: 'main',
        name: uc.name,
        x: mainX,
        y,
        rx: UC_RX,
        ry: UC_RY,
        actorId: `actor_${ai}`
      })
    }

    // 子用例(include/extend)放在更右侧，按父用例分组对齐
    const subX = mainX + UC_COL_GAP
    // 按parentUc分组
    const subByParent = {}
    for (const uc of subUcs) {
      const key = uc.parentUc || '_none'
      if (!subByParent[key]) subByParent[key] = []
      subByParent[key].push(uc)
    }
    for (const parentName in subByParent) {
      const subs = subByParent[parentName]
      const parentNode = nodes.find(n => n.name === parentName && n.actorId === `actor_${ai}`)
      const baseY = parentNode ? parentNode.y : mainStartY + UC_RY
      for (let si = 0; si < subs.length; si++) {
        const uc = subs[si]
        // 子用例围绕父用例Y坐标上下分布
        const offset = (si - (subs.length - 1) / 2) * (UC_GAP_Y * 0.7)
        const y = baseY + offset

        nodes.push({
          id: `uc_${ai}_${uc.name}`,
          type: 'usecase',
          ucType: uc.type,
          name: uc.name,
          x: subX,
          y,
          rx: UC_RX * 0.85,
          ry: UC_RY * 0.85,
          actorId: `actor_${ai}`,
          parentUc: uc.parentUc
        })
      }
    }

    // Actor居中于其所有用例
    const actorUcNodes = nodes.filter(n => n.actorId === `actor_${ai}`)
    const minY = Math.min(...actorUcNodes.map(n => n.y))
    const maxY = Math.max(...actorUcNodes.map(n => n.y))
    const actorY = (minY + maxY) / 2

    nodes.push({
      id: `actor_${ai}`,
      type: 'actor',
      name: actor.name,
      x: PADDING + ACTOR_W / 2,
      y: actorY
    })

    // 关联线: Actor → 主用例 (实线)
    for (const ucNode of nodes.filter(n => n.ucType === 'main' && n.actorId === `actor_${ai}`)) {
      edges.push({
        id: `e_${actor.name}_${ucNode.name}`,
        fromId: `actor_${ai}`,
        toId: ucNode.id,
        type: 'association'
      })
    }

    // Include/Extend线: 主用例 → 子用例
    for (const ucNode of nodes.filter(n => (n.ucType === 'include' || n.ucType === 'extend') && n.actorId === `actor_${ai}`)) {
      const parentId = nodes.find(n => n.name === ucNode.parentUc && n.actorId === `actor_${ai}`)?.id
      if (parentId) {
        edges.push({
          id: `e_${parentId}_${ucNode.id}`,
          fromId: ucNode.ucType === 'extend' ? ucNode.id : parentId, // extend箭头反向
          toId: ucNode.ucType === 'extend' ? parentId : ucNode.id,
          type: ucNode.ucType
        })
      }
    }

    // 更新globalY
    const allY = actorUcNodes.map(n => n.y + (n.ry || UC_RY))
    globalY = Math.max(...allY) + UC_GAP_Y + 20
  }

  // 额外的手动关系
  for (const rel of relations) {
    const fromNode = nodes.find(n => n.name === rel.from)
    const toNode = nodes.find(n => n.name === rel.to)
    if (fromNode && toNode) {
      edges.push({
        id: `rel_${rel.from}_${rel.to}`,
        fromId: fromNode.id,
        toId: toNode.id,
        type: rel.type || 'association'
      })
    }
  }

  // 计算画布大小
  const allNodes = nodes
  const maxX = Math.max(...allNodes.map(n => n.x + (n.rx || ACTOR_W) + PADDING), 600)
  const maxYAll = Math.max(...allNodes.map(n => n.y + (n.ry || ACTOR_H / 2) + PADDING), 400)

  return { nodes, edges, width: maxX, height: maxYAll }
}

export const DEFAULTS = { ACTOR_W, ACTOR_H, UC_RX, UC_RY, UC_GAP_Y, ACTOR_UC_GAP, UC_COL_GAP, PADDING }
