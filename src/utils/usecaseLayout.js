/**
 * 论文用例图布局算法（UML标准排版倾向）
 * 1) Actor在左侧，主用例单列
 * 2) include 与 extend 分列，减少交叉线
 * 3) 每组Actor上下分区，保证留白
 */

const ACTOR_W = 44
const ACTOR_H = 88
const MAIN_UC_RX = 92
const MAIN_UC_RY = 28
const SUB_UC_RX = 76
const SUB_UC_RY = 22
const MAIN_GAP_Y = 72
const SUB_GAP_Y = 46
const ACTOR_TO_MAIN_GAP = 210
const MAIN_TO_INCLUDE_GAP = 250
const INCLUDE_TO_EXTEND_GAP = 210
const PADDING_X = 78
const PADDING_Y = 78
const GROUP_GAP_Y = 120

function createIdFactory() {
  const used = new Map()
  return (prefix, raw) => {
    const name = String(raw ?? '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    const base = `${prefix}_${name || 'node'}`
    const idx = used.get(base) || 0
    used.set(base, idx + 1)
    return idx === 0 ? base : `${base}_${idx}`
  }
}

function normalizeType(type) {
  if (type === 'include' || type === 'extend') return type
  return 'main'
}

function groupByParent(items) {
  const map = new Map()
  for (const item of items) {
    const key = (item.parentUc || '').trim()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return map
}

function maxNodeBottom(nodes) {
  return Math.max(...nodes.map(n => n.y + (n.ry || ACTOR_H / 2)))
}

function minNodeTop(nodes) {
  return Math.min(...nodes.map(n => n.y - (n.ry || ACTOR_H / 2)))
}

/**
 * @param {Array} actors - [{name, usecases:[{name,type,parentUc}]}]
 * @param {Array} relations - [{from,to,type}]
 * @returns {{nodes:Array,edges:Array,width:number,height:number}}
 */
export function layoutUseCase(actors, relations = []) {
  const nodes = []
  const edges = []
  const makeId = createIdFactory()
  let cursorY = PADDING_Y

  for (let ai = 0; ai < actors.length; ai++) {
    const actor = actors[ai]
    const actorId = makeId('actor', `${ai}_${actor.name || 'actor'}`)

    const normalized = (actor.usecases || []).map(uc => ({
      ...uc,
      name: (uc.name || '').trim(),
      parentUc: (uc.parentUc || '').trim(),
      type: normalizeType(uc.type)
    })).filter(uc => uc.name)

    const mainUcs = normalized.filter(uc => uc.type === 'main')
    const includeUcs = normalized.filter(uc => uc.type === 'include')
    const extendUcs = normalized.filter(uc => uc.type === 'extend')

    // 无主用例时，给出占位，避免页面空结构导致布局崩溃
    if (mainUcs.length === 0) {
      mainUcs.push({ name: '核心业务', type: 'main' })
    }

    const actorX = PADDING_X + ACTOR_W / 2
    const mainX = actorX + ACTOR_TO_MAIN_GAP
    const includeX = mainX + MAIN_TO_INCLUDE_GAP
    const extendX = includeX + INCLUDE_TO_EXTEND_GAP

    const actorNodes = []
    const mainNodes = []
    const includeNodes = []
    const extendNodes = []

    // 1) 主用例单列
    for (let mi = 0; mi < mainUcs.length; mi++) {
      const uc = mainUcs[mi]
      const y = cursorY + mi * MAIN_GAP_Y + MAIN_UC_RY
      const node = {
        id: makeId('uc', `${ai}_main_${uc.name}`),
        type: 'usecase',
        ucType: 'main',
        name: uc.name,
        x: mainX,
        y,
        rx: MAIN_UC_RX,
        ry: MAIN_UC_RY,
        actorId
      }
      mainNodes.push(node)
      actorNodes.push(node)
      nodes.push(node)
    }

    const includeByParent = groupByParent(includeUcs)
    const extendByParent = groupByParent(extendUcs)
    let nextIncludeY = cursorY
    let nextExtendY = cursorY

    // 2) include 与 extend 分列，围绕父用例排布，并避免同列重叠
    for (const parent of mainNodes) {
      const includes = includeByParent.get(parent.name) || []
      if (includes.length > 0) {
        const desiredTop = parent.y - ((includes.length - 1) * SUB_GAP_Y) / 2
        const startY = Math.max(desiredTop, nextIncludeY + SUB_UC_RY)
        for (let i = 0; i < includes.length; i++) {
          const uc = includes[i]
          const y = startY + i * SUB_GAP_Y
          const node = {
            id: makeId('uc', `${ai}_include_${uc.name}`),
            type: 'usecase',
            ucType: 'include',
            name: uc.name,
            x: includeX,
            y,
            rx: SUB_UC_RX,
            ry: SUB_UC_RY,
            actorId,
            parentUc: parent.name
          }
          includeNodes.push(node)
          actorNodes.push(node)
          nodes.push(node)
        }
        nextIncludeY = includeNodes[includeNodes.length - 1].y + SUB_UC_RY + 16
      }

      const extendsList = extendByParent.get(parent.name) || []
      if (extendsList.length > 0) {
        const desiredTop = parent.y - ((extendsList.length - 1) * SUB_GAP_Y) / 2
        const startY = Math.max(desiredTop, nextExtendY + SUB_UC_RY)
        for (let i = 0; i < extendsList.length; i++) {
          const uc = extendsList[i]
          const y = startY + i * SUB_GAP_Y
          const node = {
            id: makeId('uc', `${ai}_extend_${uc.name}`),
            type: 'usecase',
            ucType: 'extend',
            name: uc.name,
            x: extendX,
            y,
            rx: SUB_UC_RX,
            ry: SUB_UC_RY,
            actorId,
            parentUc: parent.name
          }
          extendNodes.push(node)
          actorNodes.push(node)
          nodes.push(node)
        }
        nextExtendY = extendNodes[extendNodes.length - 1].y + SUB_UC_RY + 16
      }
    }

    // 3) Actor 垂直居中
    const minTop = minNodeTop(actorNodes)
    const maxBottom = maxNodeBottom(actorNodes)
    const actorY = (minTop + maxBottom) / 2
    nodes.push({
      id: actorId,
      type: 'actor',
      name: actor.name || `参与者${ai + 1}`,
      x: actorX,
      y: actorY
    })

    // 4) Actor -> 主用例关联
    for (const mainNode of mainNodes) {
      edges.push({
        id: makeId('e', `${actorId}_${mainNode.id}_assoc`),
        fromId: actorId,
        toId: mainNode.id,
        type: 'association'
      })
    }

    // 5) include: 主用例 -> 子用例；extend: 子用例 -> 主用例
    for (const sub of includeNodes) {
      const parent = mainNodes.find(n => n.name === sub.parentUc)
      if (!parent) continue
      edges.push({
        id: makeId('e', `${parent.id}_${sub.id}_include`),
        fromId: parent.id,
        toId: sub.id,
        type: 'include'
      })
    }
    for (const sub of extendNodes) {
      const parent = mainNodes.find(n => n.name === sub.parentUc)
      if (!parent) continue
      edges.push({
        id: makeId('e', `${sub.id}_${parent.id}_extend`),
        fromId: sub.id,
        toId: parent.id,
        type: 'extend'
      })
    }

    cursorY = Math.max(maxBottom + GROUP_GAP_Y, cursorY + MAIN_GAP_Y)
  }

  // 额外手动关系（跨参与者）
  for (const rel of relations) {
    const fromNode = nodes.find(n => n.type === 'usecase' && n.name === rel.from)
    const toNode = nodes.find(n => n.type === 'usecase' && n.name === rel.to)
    if (!fromNode || !toNode) continue
    edges.push({
      id: makeId('e', `rel_${rel.from}_${rel.to}_${rel.type || 'association'}`),
      fromId: fromNode.id,
      toId: toNode.id,
      type: rel.type || 'association'
    })
  }

  const maxX = Math.max(...nodes.map(n => n.x + (n.rx || ACTOR_W) + PADDING_X), 760)
  const maxY = Math.max(...nodes.map(n => n.y + (n.ry || ACTOR_H / 2) + PADDING_Y), 520)

  return { nodes, edges, width: maxX, height: maxY }
}

export const DEFAULTS = {
  ACTOR_W,
  ACTOR_H,
  MAIN_UC_RX,
  MAIN_UC_RY,
  SUB_UC_RX,
  SUB_UC_RY,
  MAIN_GAP_Y,
  SUB_GAP_Y,
  ACTOR_TO_MAIN_GAP,
  MAIN_TO_INCLUDE_GAP,
  INCLUDE_TO_EXTEND_GAP,
  PADDING_X,
  PADDING_Y
}
