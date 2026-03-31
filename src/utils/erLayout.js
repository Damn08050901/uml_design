/**
 * ER图布局算法 v2：对标sql.cengxuyuan.cn
 * 实体网格分布，属性围绕实体放射排列，不重叠
 */

export function layoutAll(tables, relationships) {
  const nodes = []
  const edges = []
  const n = tables.length
  if (n === 0) return { nodes, edges }

  // 实体网格位置计算
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const spacingX = 450
  const spacingY = 420
  const startX = 300
  const startY = 250

  for (let i = 0; i < n; i++) {
    const t = tables[i]
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = startX + col * spacingX
    const cy = startY + row * spacingY

    // 实体节点
    nodes.push({
      id: `e_${t.name}`, type: 'entity',
      x: cx, y: cy,
      label: t.comment || t.name,
      tableName: t.name
    })

    // 属性围绕实体
    const cn = t.columns.length
    const radius = Math.max(130, 80 + cn * 8)
    for (let j = 0; j < cn; j++) {
      const angle = (2 * Math.PI * j / cn) - Math.PI / 2
      const c = t.columns[j]
      nodes.push({
        id: `a_${t.name}_${c.name}`, type: c.isPK ? 'pk' : 'attr',
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        label: c.comment || c.name,
        parentId: `e_${t.name}`,
        tableName: t.name
      })
    }
  }

  // 关系边
  for (const r of relationships) {
    const f = nodes.find(nd => nd.id === `e_${r.from}`)
    const to = nodes.find(nd => nd.id === `e_${r.to}`)
    if (f && to) {
      edges.push({
        id: `r_${r.from}_${r.to}_${r.fromCol}`,
        fromId: f.id, toId: to.id,
        mx: (f.x + to.x) / 2, my: (f.y + to.y) / 2,
        label: r.label
      })
    }
  }

  return { nodes, edges }
}

/**
 * 美化排版 v3：
 * - 力导向实体定位（更大间距）
 * - 属性放置在「背向邻居」的扇形弧段内，不遮挡关系线
 * - 属性角度间距保证最小弧长，避免互相覆盖
 */
export function layoutBeautify(tables, relationships) {
  const n = tables.length
  if (n === 0) return layoutAll(tables, relationships)

  const MIN_DIST = 650    // 实体间理想距离（增大）
  const REPULSE_K = 120000
  const ATTRACT_K = 0.035
  const ITERATIONS = 300
  const CENTER_X = 700
  const CENTER_Y = 500

  // 初始圆形分布，半径随实体数增大
  const entities = tables.map((t, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const r = Math.max(250, n * 75)
    return {
      id: `e_${t.name}`,
      x: CENTER_X + r * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: CENTER_Y + r * Math.sin(angle) + (Math.random() - 0.5) * 20,
      name: t.name
    }
  })

  // 构建关联索引
  const linked = new Set()
  for (const r of (relationships || [])) {
    linked.add(`${r.from}__${r.to}`)
    linked.add(`${r.to}__${r.from}`)
  }

  // 力导向迭代
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const forces = entities.map(() => ({ fx: 0, fy: 0 }))
    const step = 1 - iter / ITERATIONS

    // 排斥力
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = entities[i].x - entities[j].x
        const dy = entities[i].y - entities[j].y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        if (dist < MIN_DIST * 1.2) {
          const f = REPULSE_K / (dist * dist)
          const fx = (dx / dist) * f
          const fy = (dy / dist) * f
          forces[i].fx += fx; forces[i].fy += fy
          forces[j].fx -= fx; forces[j].fy -= fy
        }
      }
    }

    // 吸引力（有关联的实体对）
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (linked.has(`${entities[i].name}__${entities[j].name}`)) {
          const dx = entities[j].x - entities[i].x
          const dy = entities[j].y - entities[i].y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          if (dist > MIN_DIST * 0.7) {
            const f = ATTRACT_K * (dist - MIN_DIST * 0.7)
            forces[i].fx += (dx / dist) * f; forces[i].fy += (dy / dist) * f
            forces[j].fx -= (dx / dist) * f; forces[j].fy -= (dy / dist) * f
          }
        }
      }
    }

    // 向中心弱引力
    for (let i = 0; i < n; i++) {
      forces[i].fx += (CENTER_X - entities[i].x) * 0.004
      forces[i].fy += (CENTER_Y - entities[i].y) * 0.004
    }

    const maxMove = 90 * step + 3
    for (let i = 0; i < n; i++) {
      const move = Math.sqrt(forces[i].fx ** 2 + forces[i].fy ** 2)
      if (move > maxMove) { forces[i].fx = forces[i].fx / move * maxMove; forces[i].fy = forces[i].fy / move * maxMove }
      entities[i].x += forces[i].fx
      entities[i].y += forces[i].fy
    }
  }

  // ── 属性放置：背向邻居扇形算法 ──────────────────────────────
  const nodes = []
  const edges = []

  // 建立每个实体的邻居列表
  const neighborMap = {}
  for (let i = 0; i < n; i++) neighborMap[entities[i].name] = []
  for (const r of (relationships || [])) {
    neighborMap[r.from] = neighborMap[r.from] || []
    neighborMap[r.to]   = neighborMap[r.to]   || []
    const ef = entities.find(e => e.name === r.from)
    const et = entities.find(e => e.name === r.to)
    if (ef && et) {
      neighborMap[r.from].push({ x: et.x, y: et.y })
      neighborMap[r.to].push({ x: ef.x, y: ef.y })
    }
  }

  for (let i = 0; i < n; i++) {
    const t = tables[i]
    const cx = entities[i].x
    const cy = entities[i].y

    nodes.push({
      id: `e_${t.name}`, type: 'entity',
      x: cx, y: cy,
      label: t.comment || t.name,
      tableName: t.name
    })

    const cn = t.columns.length
    if (cn === 0) continue

    // 计算「占用方向」：所有邻居实体的方向角均值
    const neighbors = neighborMap[t.name] || []

    // 属性半径：列数越多越大，保证属性椭圆不互相挤压
    // 椭圆宽约80px，弧长 = radius * angle_step >= 90px
    const baseRadius = Math.max(150, 90 + cn * 12)

    let arcStart, arcSpan
    if (neighbors.length === 0) {
      // 无邻居：全圆分布
      arcStart = -Math.PI / 2
      arcSpan = 2 * Math.PI
    } else {
      // 计算邻居占据的角度范围
      const neighborAngles = neighbors.map(nb => Math.atan2(nb.y - cy, nb.x - cx))

      // 用向量均值求「邻居方向」
      let sumSin = 0, sumCos = 0
      for (const a of neighborAngles) { sumSin += Math.sin(a); sumCos += Math.cos(a) }
      const avgNeighborAngle = Math.atan2(sumSin, sumCos)

      // 属性放在「背离邻居」的方向（+π），留出扇形给属性
      // 邻居越多扇形越窄，最小保证 150°
      const reserveAngle = Math.min(Math.PI * 2 / 3 * neighbors.length, Math.PI * 7 / 6)
      arcSpan = Math.max(Math.PI * 5 / 6, 2 * Math.PI - reserveAngle)

      // 背离方向为中心
      const freeCenter = avgNeighborAngle + Math.PI
      arcStart = freeCenter - arcSpan / 2

      // 如果列数多（≥9），且扇形 < 240°，直接用全圆双圈更清晰
      if (cn >= 9 && arcSpan < Math.PI * 4 / 3) {
        arcStart = -Math.PI / 2
        arcSpan = 2 * Math.PI
      }
    }

    // 如果扇形内属性太多（弧长不够），扩大扇形范围 或 分两圈放置
    // 每圈最多放 MAX_PER_RING 个，超过则分内外两圈
    const MIN_ARC = 88       // 属性椭圆间最小弧长（px）
    const MAX_PER_RING = Math.max(6, Math.floor(arcSpan * baseRadius / MIN_ARC))

    if (cn <= MAX_PER_RING) {
      // 单圈：保证间距，必要时扩大半径
      let radius = baseRadius
      let angleStep = arcSpan / cn
      const minAngleStep = MIN_ARC / radius
      if (angleStep < minAngleStep) {
        radius = Math.ceil(MIN_ARC * cn / arcSpan) + 15
        angleStep = arcSpan / cn
      }
      for (let j = 0; j < cn; j++) {
        const angle = arcStart + angleStep * (j + 0.5)
        const c = t.columns[j]
        nodes.push({
          id: `a_${t.name}_${c.name}`, type: c.isPK ? 'pk' : 'attr',
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          label: c.comment || c.name,
          parentId: `e_${t.name}`,
          tableName: t.name
        })
      }
    } else {
      // 双圈：内圈放前半，外圈放后半
      const innerR = baseRadius
      const outerR = baseRadius + 95
      const half = Math.ceil(cn / 2)
      // 内圈放 half 个，外圈放剩余
      for (let j = 0; j < cn; j++) {
        const isOuter = j >= half
        const ringCn = isOuter ? cn - half : half
        const ringIdx = isOuter ? j - half : j
        const radius = isOuter ? outerR : innerR
        const angleStep = arcSpan / ringCn
        const angle = arcStart + angleStep * (ringIdx + 0.5)
        const c = t.columns[j]
        nodes.push({
          id: `a_${t.name}_${c.name}`, type: c.isPK ? 'pk' : 'attr',
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          label: c.comment || c.name,
          parentId: `e_${t.name}`,
          tableName: t.name
        })
      }
    }
  }

  for (const r of (relationships || [])) {
    const f = nodes.find(nd => nd.id === `e_${r.from}`)
    const to = nodes.find(nd => nd.id === `e_${r.to}`)
    if (f && to) {
      edges.push({
        id: `r_${r.from}_${r.to}_${r.fromCol}`,
        fromId: f.id, toId: to.id,
        mx: (f.x + to.x) / 2, my: (f.y + to.y) / 2,
        label: r.label
      })
    }
  }

  return { nodes, edges }
}
