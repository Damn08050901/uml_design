const UML_STYLE_PRESETS = {
  academic: {
    name: '黑白学术',
    bg: '#ffffff',
    stroke: '#111111',
    text: '#111111',
    panelFill: '#ffffff',
    softFill: '#f6f6f6',
    muted: '#666666'
  },
  blue: {
    name: '蓝灰简约',
    bg: '#ffffff',
    stroke: '#1f4f8f',
    text: '#1b3557',
    panelFill: '#edf4ff',
    softFill: '#f4f8ff',
    muted: '#4a6c95'
  }
}

const UML_TEMPLATES = {
  class: `用户|id:Long,用户名:String,密码:String|登录(),注册()
订单|id:Long,订单号:String,金额:Decimal|创建订单(),取消订单()
订单明细|id:Long,数量:Integer,小计:Decimal|
用户 -> 订单 : 下单
订单 *-- 订单明细 : 组合`,
  sequence: `actor 用户
participant 前端
participant 后端
database 数据库
用户->前端: 提交登录
前端->后端: POST /login
后端->数据库: 查询用户
数据库-->后端: 返回记录
后端-->前端: 登录结果
前端-->用户: 提示结果`,
  activity: `开始 -> 填写注册信息
填写注册信息 -> {信息是否完整?}
{信息是否完整?} ->|否| 提示补全信息
提示补全信息 -> 填写注册信息
{信息是否完整?} ->|是| 保存用户
保存用户 -> 结束`,
  deployment: `客户端: 浏览器,管理端Web
应用服务器: Nginx,SpringBoot
数据库服务器: MySQL8.0
文件服务器: 对象存储OSS
客户端 -> 应用服务器 : HTTPS
应用服务器 -> 数据库服务器 : JDBC
应用服务器 -> 文件服务器 : S3 API`,
  architecture: `表现层: Web前端,管理端
业务层: 用户服务,订单服务,审核服务
数据层: MySQL,Redis,对象存储
Web前端 -> 用户服务
管理端 -> 审核服务
用户服务 -> MySQL`,
  function_structure: `系统: 用户端,管理端
用户端: 首页浏览,业务办理,结果查询
管理端: 用户管理,审核管理,统计分析`
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitList(v) {
  return String(v || '')
    .split(/[,，、;；]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function wrapLabelLines(value, maxChars = 10, maxLines = 3) {
  const text = String(value || '').trim()
  if (!text) return ['']
  if (text.length <= maxChars) return [text]
  const lines = []
  let cursor = 0
  while (cursor < text.length && lines.length < maxLines) {
    lines.push(text.slice(cursor, cursor + maxChars))
    cursor += maxChars
  }
  if (cursor < text.length && lines.length > 0) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`
  }
  return lines
}

function textTspans(lines, lineHeight = 14, xRef = null) {
  const startDy = -((lines.length - 1) * lineHeight) / 2 + 4
  const xAttr = xRef == null ? '' : ` x="${xRef}"`
  return lines
    .map((line, idx) => `<tspan${xAttr} dy="${idx === 0 ? startDy : lineHeight}">${esc(line)}</tspan>`)
    .join('')
}

function pointOnRect(box, target) {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = target.x - cx
  const dy = target.y - cy
  const t = 1 / Math.max(Math.abs(dx) / (box.w / 2), Math.abs(dy) / (box.h / 2), 1e-5)
  return { x: cx + dx * t, y: cy + dy * t }
}

function renderClassDiagram(spec, theme) {
  const lines = String(spec || '').replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean)
  const classes = []
  const rels = []
  for (const line of lines) {
    const rel = line.match(/^(.+?)\s+(<\|--|\*--|o--|-->|->|--|\.{2}>)\s+(.+?)(?:\s*:\s*(.+))?$/)
    if (rel) {
      rels.push({ from: rel[1].trim(), op: rel[2], to: rel[3].trim(), label: (rel[4] || '').trim() })
      continue
    }
    if (line.includes('|')) {
      const parts = line.split('|')
      classes.push({
        name: parts[0].trim(),
        attrs: splitList(parts[1] || ''),
        methods: splitList(parts[2] || '')
      })
    }
  }
  if (classes.length === 0) throw new Error('请先输入类图定义')

  const byName = new Map(classes.map(c => [c.name, c]))
  for (const r of rels) {
    if (!byName.has(r.from)) {
      const c = { name: r.from, attrs: [], methods: [] }
      classes.push(c)
      byName.set(c.name, c)
    }
    if (!byName.has(r.to)) {
      const c = { name: r.to, attrs: [], methods: [] }
      classes.push(c)
      byName.set(c.name, c)
    }
  }

  const colGap = 92
  const rowGap = 72
  const margin = 70
  const nodeNames = classes.map(c => c.name)
  const viewsByName = new Map(classes.map(c => {
    const nameLines = wrapLabelLines(c.name, 12, 2)
    const attrs = (c.attrs.length ? c.attrs : ['']).map(v => wrapLabelLines(v, 22, 1)[0])
    const methods = (c.methods.length ? c.methods : ['']).map(v => wrapLabelLines(v, 22, 1)[0])
    const maxLen = Math.max(
      ...nameLines.map(v => v.length),
      ...attrs.map(v => v.length),
      ...methods.map(v => v.length),
      8
    )
    const w = Math.max(220, Math.min(320, 48 + maxLen * 11))
    const h = 56 + Math.max(1, attrs.length) * 18 + Math.max(1, methods.length) * 18
    return [c.name, { ...c, nameLines, attrs, methods, w, h }]
  }))

  const normalizedRels = rels.map(r => {
    if (r.op === '<|--') return { ...r, from: r.to, to: r.from }
    return { ...r }
  })

  const directedOut = new Map(nodeNames.map(n => [n, []]))
  const directedIn = new Map(nodeNames.map(n => [n, 0]))
  const undirected = new Map(nodeNames.map(n => [n, new Set()]))
  for (const rel of normalizedRels) {
    if (!directedOut.has(rel.from) || !directedOut.has(rel.to)) continue
    directedOut.get(rel.from).push(rel.to)
    directedIn.set(rel.to, (directedIn.get(rel.to) || 0) + 1)
    undirected.get(rel.from).add(rel.to)
    undirected.get(rel.to).add(rel.from)
  }

  const pos = new Map()
  let width = 900
  let height = 520
  let orderedViews = classes.map(c => viewsByName.get(c.name))

  function placeGrid(views) {
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(views.length))))
    const colWidths = new Array(cols).fill(0)
    for (let i = 0; i < views.length; i++) {
      const col = i % cols
      colWidths[col] = Math.max(colWidths[col], views[i].w)
    }
    const colX = []
    let xCursor = margin
    for (let c = 0; c < cols; c++) {
      colX[c] = xCursor
      xCursor += colWidths[c] + colGap
    }
    const rows = Math.ceil(views.length / cols)
    const rowHeights = new Array(rows).fill(0)
    for (let i = 0; i < views.length; i++) {
      rowHeights[Math.floor(i / cols)] = Math.max(rowHeights[Math.floor(i / cols)], views[i].h)
    }
    let y = margin
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        if (i >= views.length) continue
        const top = y + Math.max(0, (rowHeights[r] - views[i].h) / 2)
        pos.set(views[i].name, { x: colX[c], y: top, w: views[i].w, h: views[i].h })
      }
      y += rowHeights[r] + rowGap
    }
    width = Math.max(900, xCursor - colGap + margin)
    height = Math.max(520, y - rowGap + margin)
  }

  function tryPlaceLayered() {
    if (orderedViews.length < 4 || normalizedRels.length === 0) return false
    const queue = nodeNames.filter(n => (directedIn.get(n) || 0) === 0)
    const inWork = new Map(directedIn)
    const topo = []
    while (queue.length > 0) {
      const cur = queue.shift()
      topo.push(cur)
      for (const nxt of directedOut.get(cur) || []) {
        inWork.set(nxt, (inWork.get(nxt) || 0) - 1)
        if ((inWork.get(nxt) || 0) === 0) queue.push(nxt)
      }
    }
    if (topo.length < nodeNames.length) {
      for (const n of nodeNames) {
        if (!topo.includes(n)) topo.push(n)
      }
    }

    const level = new Map(nodeNames.map(n => [n, 0]))
    for (const n of topo) {
      for (const nxt of directedOut.get(n) || []) {
        level.set(nxt, Math.max(level.get(nxt) || 0, (level.get(n) || 0) + 1))
      }
    }
    const maxLv = Math.max(...[...level.values()])
    const colCount = maxLv + 1
    if (colCount < 2 || colCount > 4) return false

    const groups = Array.from({ length: colCount }, () => [])
    for (const n of nodeNames) groups[level.get(n)].push(viewsByName.get(n))

    const parents = new Map(nodeNames.map(n => [n, []]))
    for (const rel of normalizedRels) {
      if (parents.has(rel.to)) parents.get(rel.to).push(rel.from)
    }
    for (let ci = 1; ci < groups.length; ci++) {
      const prevIndex = new Map(groups[ci - 1].map((v, i) => [v.name, i]))
      groups[ci].sort((a, b) => {
        const pa = parents.get(a.name) || []
        const pb = parents.get(b.name) || []
        const va = pa.length > 0 ? pa.reduce((s, p) => s + (prevIndex.get(p) ?? 99), 0) / pa.length : 999
        const vb = pb.length > 0 ? pb.reduce((s, p) => s + (prevIndex.get(p) ?? 99), 0) / pb.length : 999
        return va - vb
      })
    }

    const colWidths = groups.map(g => g.length > 0 ? Math.max(...g.map(v => v.w)) : 0)
    const colX = []
    let xCursor = margin
    for (let ci = 0; ci < colCount; ci++) {
      colX[ci] = xCursor
      xCursor += colWidths[ci] + colGap
    }
    const colHeights = groups.map(g => g.reduce((sum, n, idx) => sum + n.h + (idx > 0 ? rowGap : 0), 0))
    const coreHeight = Math.max(...colHeights, 0)
    for (let ci = 0; ci < colCount; ci++) {
      let yCursor = margin + Math.max(0, (coreHeight - colHeights[ci]) / 2)
      for (const v of groups[ci]) {
        pos.set(v.name, {
          x: colX[ci] + (colWidths[ci] - v.w) / 2,
          y: yCursor,
          w: v.w,
          h: v.h
        })
        yCursor += v.h + rowGap
      }
    }
    width = Math.max(900, xCursor - colGap + margin)
    height = Math.max(520, coreHeight + margin * 2)
    orderedViews = groups.flat()
    return true
  }

  if (!tryPlaceLayered()) {
    const visited = new Set()
    const order = []
    const degree = (name) => (undirected.get(name)?.size || 0)
    const remaining = [...nodeNames]
    while (order.length < nodeNames.length) {
      const seeds = remaining.filter(n => !visited.has(n))
      if (seeds.length === 0) break
      seeds.sort((a, b) => degree(b) - degree(a))
      const q = [seeds[0]]
      visited.add(seeds[0])
      while (q.length > 0) {
        const cur = q.shift()
        order.push(cur)
        const neighbors = [...(undirected.get(cur) || [])]
          .filter(n => !visited.has(n))
          .sort((a, b) => degree(b) - degree(a))
        for (const n of neighbors) {
          visited.add(n)
          q.push(n)
        }
      }
    }
    orderedViews = order.map(n => viewsByName.get(n))
    placeGrid(orderedViews)
  }

  function routeClassEdge(fromBox, toBox, lane = 0) {
    const s = pointOnRect(fromBox, { x: toBox.x + toBox.w / 2, y: toBox.y + toBox.h / 2 })
    const t = pointOnRect(toBox, { x: fromBox.x + fromBox.w / 2, y: fromBox.y + fromBox.h / 2 })
    const dx = Math.abs(s.x - t.x)
    const dy = Math.abs(s.y - t.y)
    const laneOffset = lane === 0 ? 0 : ((lane % 2 === 0 ? 1 : -1) * (Math.floor((lane + 1) / 2) * 10))
    if (dx < 8 || dy < 8) {
      return {
        points: `${s.x},${s.y} ${t.x},${t.y}`,
        labelX: (s.x + t.x) / 2,
        labelY: (s.y + t.y) / 2 - 8 + laneOffset * 0.3
      }
    }
    if (dx >= dy) {
      const mx = (s.x + t.x) / 2 + laneOffset
      return {
        points: `${s.x},${s.y} ${mx},${s.y} ${mx},${t.y} ${t.x},${t.y}`,
        labelX: mx,
        labelY: (s.y + t.y) / 2 - 8
      }
    }
    const my = (s.y + t.y) / 2 + laneOffset
    return {
      points: `${s.x},${s.y} ${s.x},${my} ${t.x},${my} ${t.x},${t.y}`,
      labelX: (s.x + t.x) / 2,
      labelY: my - 8
    }
  }

  const routeCount = new Map()
  const relSvg = rels.map(r => {
    let from = r.from
    let to = r.to
    let markerEnd = ''
    let markerStart = ''
    let dashed = ''
    if (r.op === '<|--') { from = r.to; to = r.from; markerEnd = 'class-tri' }
    if (r.op === '-->') markerEnd = 'class-arr'
    if (r.op === '->') markerEnd = 'class-arr'
    if (r.op === '..>') { markerEnd = 'class-arr-open'; dashed = 'stroke-dasharray="6,4"' }
    if (r.op === '*--') markerStart = 'class-dia-fill'
    if (r.op === 'o--') markerStart = 'class-dia-open'
    const bf = pos.get(from)
    const bt = pos.get(to)
    if (!bf || !bt) return ''
    const pair = `${from}->${to}`
    const lane = routeCount.get(pair) || 0
    routeCount.set(pair, lane + 1)
    const route = routeClassEdge(bf, bt, lane)
    return `
      <polyline points="${route.points}" fill="none" stroke="${theme.stroke}" stroke-width="1.3"
        ${dashed}
        ${markerStart ? `marker-start="url(#${markerStart})"` : ''}
        ${markerEnd ? `marker-end="url(#${markerEnd})"` : ''} />
      ${r.label ? `<text x="${route.labelX}" y="${route.labelY}" text-anchor="middle" font-size="11" fill="${theme.muted}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(r.label)}</text>` : ''}
    `
  }).join('')

  const boxSvg = orderedViews.map(c => {
    const b = pos.get(c.name)
    const attrs = c.attrs.length ? c.attrs : ['']
    const methods = c.methods.length ? c.methods : ['']
    const attrY = b.y + 64
    const methodY = attrY + attrs.length * 20 + 20
    return `
      <g>
        <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.4"/>
        <line x1="${b.x}" y1="${b.y + 44}" x2="${b.x + b.w}" y2="${b.y + 44}" stroke="${theme.stroke}" />
        <line x1="${b.x}" y1="${methodY - 14}" x2="${b.x + b.w}" y2="${methodY - 14}" stroke="${theme.stroke}" />
        <text x="${b.x + b.w / 2}" y="${b.y + 28}" text-anchor="middle" font-size="14" font-weight="bold" fill="${theme.text}">${textTspans(c.nameLines, 12, b.x + b.w / 2)}</text>
        ${attrs.map((a, i) => `<text x="${b.x + 10}" y="${attrY + i * 18}" font-size="12" fill="${theme.text}">${esc(a)}</text>`).join('')}
        ${methods.map((m, i) => `<text x="${b.x + 10}" y="${methodY + i * 18}" font-size="12" fill="${theme.text}">${esc(m)}</text>`).join('')}
      </g>
    `
  }).join('')

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      <defs>
        <marker id="class-arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${theme.stroke}"/></marker>
        <marker id="class-arr-open" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="none" stroke="${theme.stroke}" stroke-width="1"/></marker>
        <marker id="class-tri" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto"><polygon points="0 0,12 4,0 8" fill="#fff" stroke="${theme.stroke}" stroke-width="1.1"/></marker>
        <marker id="class-dia-fill" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto"><polygon points="0 4,6 0,12 4,6 8" fill="${theme.stroke}"/></marker>
        <marker id="class-dia-open" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto"><polygon points="0 4,6 0,12 4,6 8" fill="#fff" stroke="${theme.stroke}" stroke-width="1.1"/></marker>
      </defs>
      ${relSvg}
      ${boxSvg}
    </svg>`,
    width,
    height
  }
}

function renderSequenceDiagram(spec, theme) {
  const lines = String(spec || '').replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean)
  const participants = []
  const partMap = new Map()
  const events = []
  const ensureParticipant = (name, type = 'participant') => {
    const key = name.trim()
    if (!key) return
    if (!partMap.has(key)) {
      const part = { name: key, type }
      partMap.set(key, part)
      participants.push(part)
    } else if (type === 'actor') {
      partMap.get(key).type = 'actor'
    }
  }
  for (const line of lines) {
    const p = line.match(/^(actor|participant|database|control|entity|boundary)\s+(.+)$/i)
    if (p) {
      const name = p[2].trim()
      ensureParticipant(name, p[1].toLowerCase())
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
    if (alt) { events.push({ type: 'alt', text: alt[1].trim() }); continue }
    const els = line.match(/^else(?:\s+(.+))?$/i)
    if (els) { events.push({ type: 'else', text: (els[1] || '').trim() }); continue }
    if (/^end$/i.test(line)) { events.push({ type: 'end' }) }
  }
  if (participants.length < 2) throw new Error('请至少定义2个参与者')

  const gapX = 180
  const marginX = 110
  const width = Math.max(900, marginX * 2 + (participants.length - 1) * gapX)
  const xMap = new Map(participants.map((p, i) => [p.name, marginX + i * gapX]))

  let y = 160
  const blocks = []
  const stack = []
  for (const ev of events) {
    ev.y = y
    if (ev.type === 'msg') { y += 52; continue }
    if (ev.type === 'alt') { stack.push({ start: y - 18, title: ev.text, elseY: null, elseText: '' }); y += 20; continue }
    if (ev.type === 'else') { if (stack.length) { stack[stack.length - 1].elseY = y - 8; stack[stack.length - 1].elseText = ev.text || 'else' }; y += 20; continue }
    if (ev.type === 'end') { if (stack.length) { const b = stack.pop(); b.end = y + 8; blocks.push(b) }; y += 10 }
  }
  while (stack.length) { const b = stack.pop(); b.end = y + 8; blocks.push(b) }
  const height = Math.max(460, y + 88)
  const lifelineTop = 128

  const activations = events
    .filter(ev => ev.type === 'msg' && !ev.arrow.includes('--'))
    .map(ev => ({
      participant: ev.to,
      y: ev.y - 12,
      h: ev.from === ev.to ? 36 : 24
    }))

  const blockSvg = blocks.map(b => `
    <g>
      <rect x="${marginX - 74}" y="${b.start}" width="${(participants.length - 1) * gapX + 148}" height="${Math.max(40, b.end - b.start)}"
        fill="none" stroke="${theme.stroke}" stroke-dasharray="6,4" stroke-width="1.1"/>
      <text x="${marginX - 62}" y="${b.start + 14}" font-size="11" fill="${theme.muted}" font-weight="bold">alt ${esc(b.title)}</text>
      ${b.elseY ? `<line x1="${marginX - 74}" y1="${b.elseY}" x2="${marginX - 74 + (participants.length - 1) * gapX + 148}" y2="${b.elseY}" stroke="${theme.stroke}" stroke-dasharray="5,4"/>` : ''}
      ${b.elseY ? `<text x="${marginX - 62}" y="${b.elseY - 6}" font-size="11" fill="${theme.muted}">else ${esc(b.elseText)}</text>` : ''}
    </g>
  `).join('')

  const partSvg = participants.map(part => {
    const x = xMap.get(part.name)
    const boxW = Math.max(108, Math.min(176, 26 + part.name.length * 14))
    const header = part.type === 'actor'
      ? `
        <circle cx="${x}" cy="36" r="12" fill="none" stroke="${theme.stroke}" stroke-width="1.8"/>
        <line x1="${x}" y1="48" x2="${x}" y2="72" stroke="${theme.stroke}" stroke-width="1.8"/>
        <line x1="${x - 18}" y1="56" x2="${x + 18}" y2="56" stroke="${theme.stroke}" stroke-width="1.8"/>
        <line x1="${x}" y1="72" x2="${x - 14}" y2="94" stroke="${theme.stroke}" stroke-width="1.8"/>
        <line x1="${x}" y1="72" x2="${x + 14}" y2="94" stroke="${theme.stroke}" stroke-width="1.8"/>
        <text x="${x}" y="112" text-anchor="middle" font-size="12" font-weight="bold" fill="${theme.text}">${esc(part.name)}</text>
      `
      : part.type === 'database'
        ? `
        <ellipse cx="${x}" cy="42" rx="${boxW / 2}" ry="10" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.2"/>
        <rect x="${x - boxW / 2}" y="42" width="${boxW}" height="34" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.2"/>
        <ellipse cx="${x}" cy="76" rx="${boxW / 2}" ry="10" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.2"/>
        <text x="${x}" y="63" text-anchor="middle" font-size="12" font-weight="bold" fill="${theme.text}">${esc(part.name)}</text>
      `
      : `
        <rect x="${x - boxW / 2}" y="34" width="${boxW}" height="36" rx="4" fill="${theme.panelFill}" stroke="${theme.stroke}" />
        <text x="${x}" y="57" text-anchor="middle" font-size="12" font-weight="bold" fill="${theme.text}">${esc(part.name)}</text>
      `
    return `
      <g>
        ${header}
        <line x1="${x}" y1="${lifelineTop}" x2="${x}" y2="${height - 26}" stroke="${theme.stroke}" stroke-dasharray="6,5"/>
      </g>
    `
  }).join('')

  const activationSvg = activations.map(ac => {
    const x = xMap.get(ac.participant)
    if (x == null) return ''
    return `<rect x="${x - 7}" y="${ac.y}" width="14" height="${ac.h}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.1"/>`
  }).join('')

  const msgSvg = events.filter(e => e.type === 'msg').map(ev => {
    const x1 = xMap.get(ev.from)
    const x2 = xMap.get(ev.to)
    const dash = ev.arrow.includes('--') ? 'stroke-dasharray="6,4"' : ''
    const marker = ev.arrow.includes('--') ? 'seq-arr-open' : 'seq-arr'
    const msgLines = wrapLabelLines(ev.text, 16, 3)
    if (ev.from === ev.to) {
      return `
        <path d="M ${x1} ${ev.y} h 34 v 24 h -34" fill="none" stroke="${theme.stroke}" stroke-width="1.2" ${dash} marker-end="url(#${marker})"/>
        <text x="${x1 + 18}" y="${ev.y - 6}" text-anchor="middle" font-size="11" fill="${theme.text}" paint-order="stroke" stroke="#fff" stroke-width="3">${textTspans(msgLines, 13, x1 + 18)}</text>
      `
    }
    return `
      <line x1="${x1}" y1="${ev.y}" x2="${x2}" y2="${ev.y}" stroke="${theme.stroke}" stroke-width="1.2" ${dash}
        marker-end="url(#${marker})"/>
      <text x="${(x1 + x2) / 2}" y="${ev.y - 7}" text-anchor="middle" font-size="11" fill="${theme.text}" paint-order="stroke" stroke="#fff" stroke-width="3">${textTspans(msgLines, 13, (x1 + x2) / 2)}</text>
    `
  }).join('')

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      <defs>
        <marker id="seq-arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${theme.stroke}"/></marker>
        <marker id="seq-arr-open" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="none" stroke="${theme.stroke}" stroke-width="1"/></marker>
      </defs>
      ${blockSvg}
      ${partSvg}
      ${activationSvg}
      ${msgSvg}
    </svg>`,
    width,
    height
  }
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
      const parts = line.split('->').map(v => v.trim()).filter(Boolean)
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
    const m = line.match(/^(.+?)\s*->(?:\|(.+?)\|)?\s*(.+)$/)
    if (!m) continue
    const from = createFlowNode(m[1])
    const to = createFlowNode(m[3])
    const label = (m[2] || '').trim()
    if (!from || !to) continue
    if (!nodes.has(from.key)) nodes.set(from.key, from)
    if (!nodes.has(to.key)) nodes.set(to.key, to)
    edges.push({ from: from.key, to: to.key, label })
  }
  return { nodes: [...nodes.values()], edges }
}

function renderActivityDiagram(spec, theme) {
  const { nodes, edges } = parseActivitySpec(spec)
  if (nodes.length === 0 || edges.length === 0) throw new Error('请先输入活动图流程')
  const outgoing = new Map(nodes.map(n => [n.key, []]))
  const incomingCount = new Map(nodes.map(n => [n.key, 0]))
  for (const e of edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, [])
    outgoing.get(e.from).push(e.to)
    incomingCount.set(e.to, (incomingCount.get(e.to) || 0) + 1)
  }

  const level = new Map()
  const roots = nodes.filter(n => (incomingCount.get(n.key) || 0) === 0).map(n => n.key)
  const queue = roots.length > 0 ? [...roots] : [nodes[0].key]
  for (const r of queue) level.set(r, 0)

  while (queue.length > 0) {
    const cur = queue.shift()
    const curLevel = level.get(cur) ?? 0
    for (const nxt of outgoing.get(cur) || []) {
      const candidate = curLevel + 1
      if (!level.has(nxt) || candidate < level.get(nxt)) {
        level.set(nxt, candidate)
        queue.push(nxt)
      }
    }
  }
  for (const n of nodes) {
    if (!level.has(n.key)) level.set(n.key, 0)
  }

  const maxLv = Math.max(...[...level.values()])
  const groups = Array.from({ length: maxLv + 1 }, () => [])
  for (const n of nodes) groups[level.get(n.key)].push(n)
  const parentMap = new Map(nodes.map(n => [n.key, []]))
  for (const e of edges) {
    if (!parentMap.has(e.to)) parentMap.set(e.to, [])
    parentMap.get(e.to).push(e.from)
  }
  for (let lv = 1; lv < groups.length; lv++) {
    const prev = groups[lv - 1]
    const prevPos = new Map(prev.map((n, i) => [n.key, i]))
    groups[lv].sort((a, b) => {
      const pa = parentMap.get(a.key) || []
      const pb = parentMap.get(b.key) || []
      const avga = pa.length > 0
        ? pa.reduce((sum, k) => sum + (prevPos.get(k) ?? prev.length / 2), 0) / pa.length
        : Number.MAX_SAFE_INTEGER / 2
      const avgb = pb.length > 0
        ? pb.reduce((sum, k) => sum + (prevPos.get(k) ?? prev.length / 2), 0) / pb.length
        : Number.MAX_SAFE_INTEGER / 2
      return avga - avgb
    })
  }
  const layerGapY = 104
  const topOffsetY = 78
  const maxCol = Math.max(...groups.map(g => g.length))
  const width = Math.max(860, 100 + (maxCol - 1) * 250 + 200)
  const height = Math.max(460, 96 + maxLv * layerGapY + 86)
  const centerX = width / 2
  const map = new Map()
  for (let lv = 0; lv < groups.length; lv++) {
    const row = groups[lv]
    const startX = centerX - ((row.length - 1) * 250) / 2
    for (let i = 0; i < row.length; i++) {
      const item = row[i]
      const lines = wrapLabelLines(item.label, item.type === 'connector' ? 3 : 12, 3)
      const maxLineLen = Math.max(...lines.map(line => line.length))
      const commonW = Math.max(120, Math.min(220, 34 + maxLineLen * 14))
      const commonH = Math.max(44, 36 + lines.length * 14)
      const node = {
        x: startX + i * 250,
        y: topOffsetY + lv * layerGapY,
        type: item.type,
        label: item.label,
        lines,
        w: commonW,
        h: commonH,
        dw: 76,
        dh: 36,
        r: 16
      }
      if (item.type === 'decision') {
        node.dw = Math.max(76, Math.min(108, 30 + maxLineLen * 8))
        node.dh = Math.max(36, 24 + lines.length * 12)
      } else if (item.type === 'connector') {
        node.r = Math.max(14, Math.min(24, 10 + maxLineLen * 5))
      } else if (item.type === 'database') {
        node.w = Math.max(146, commonW)
        node.h = Math.max(58, commonH)
      } else if (item.type === 'terminator') {
        node.w = Math.max(128, commonW)
        node.h = Math.max(42, commonH)
      }
      map.set(item.key, node)
    }
  }
  const border = (n, t) => {
    if (n.type === 'connector') {
      const dx = t.x - n.x, dy = t.y - n.y, len = Math.hypot(dx, dy) || 1
      return { x: n.x + dx / len * n.r, y: n.y + dy / len * n.r }
    }
    if (n.type === 'terminator') {
      return pointOnRect({ x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h }, t)
    }
    if (n.type === 'decision') {
      const dx = t.x - n.x, dy = t.y - n.y
      const sc = 1 / Math.max(Math.abs(dx) / n.dw + Math.abs(dy) / n.dh, 1e-5)
      return { x: n.x + dx * sc, y: n.y + dy * sc }
    }
    if (n.type === 'database') {
      return pointOnRect({ x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h }, t)
    }
    if (n.type === 'io') {
      return pointOnRect({ x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h }, t)
    }
    return pointOnRect({ x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h }, t)
  }
  const edgeSvg = edges.map(e => {
    const a = map.get(e.from), b = map.get(e.to)
    const p1 = border(a, b), p2 = border(b, a)
    let points = ''
    let labelX = (p1.x + p2.x) / 2
    let labelY = (p1.y + p2.y) / 2 - 8

    if (p2.y >= p1.y) {
      const midY = p1.y + Math.max(22, (p2.y - p1.y) / 2)
      points = `${p1.x},${p1.y} ${p1.x},${midY} ${p2.x},${midY} ${p2.x},${p2.y}`
      labelY = midY - 8
    } else {
      // 回环边：走左侧回线，避免主干线过长或压住节点
      const sideX = Math.min(p1.x, p2.x) - 42
      points = `${p1.x},${p1.y} ${sideX},${p1.y} ${sideX},${p2.y} ${p2.x},${p2.y}`
      labelX = sideX - 8
      labelY = (p1.y + p2.y) / 2
    }

    return `
      <polyline points="${points}" fill="none" stroke="${theme.stroke}" stroke-width="1.2" marker-end="url(#act-arr)"/>
      ${e.label ? `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="11" fill="${theme.muted}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(e.label)}</text>` : ''}
    `
  }).join('')
  const nodeSvg = [...map.values()].map(n => {
    if (n.type === 'terminator') {
      return `<g><rect x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="${Math.floor(n.h / 2)}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}" font-weight="600">${textTspans(n.lines, 13, n.x)}</text></g>`
    }
    if (n.type === 'decision') {
      return `<g><polygon points="${n.x},${n.y - n.dh} ${n.x + n.dw},${n.y} ${n.x},${n.y + n.dh} ${n.x - n.dw},${n.y}" fill="${theme.softFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}">${textTspans(n.lines, 13, n.x)}</text></g>`
    }
    if (n.type === 'io') {
      const left = n.x - n.w / 2
      const right = n.x + n.w / 2
      const offset = Math.min(18, Math.max(10, Math.floor(n.w * 0.1)))
      const top = n.y - n.h / 2
      const bottom = n.y + n.h / 2
      return `<g><polygon points="${left + offset},${top} ${right},${top} ${right - offset},${bottom} ${left},${bottom}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}">${textTspans(n.lines, 13, n.x)}</text></g>`
    }
    if (n.type === 'database') {
      const rx = Math.floor(n.w / 2)
      const top = n.y - n.h / 2
      const bottom = n.y + n.h / 2
      const ellipseRy = 11
      return `<g><ellipse cx="${n.x}" cy="${top + ellipseRy}" rx="${rx}" ry="${ellipseRy}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><rect x="${n.x - rx}" y="${top + ellipseRy}" width="${rx * 2}" height="${n.h - ellipseRy * 2}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><ellipse cx="${n.x}" cy="${bottom - ellipseRy}" rx="${rx}" ry="${ellipseRy}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}">${textTspans(n.lines, 13, n.x)}</text></g>`
    }
    if (n.type === 'connector') {
      return `<g><circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="11" fill="${theme.text}" font-weight="600">${textTspans(n.lines, 12, n.x)}</text></g>`
    }
    if (n.type === 'subprocess') {
      return `<g><rect x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="9" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><line x1="${n.x - n.w / 2 + 14}" y1="${n.y - n.h / 2}" x2="${n.x - n.w / 2 + 14}" y2="${n.y + n.h / 2}" stroke="${theme.stroke}" stroke-width="1.2"/><line x1="${n.x + n.w / 2 - 14}" y1="${n.y - n.h / 2}" x2="${n.x + n.w / 2 - 14}" y2="${n.y + n.h / 2}" stroke="${theme.stroke}" stroke-width="1.2"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}">${textTspans(n.lines, 13, n.x)}</text></g>`
    }
    return `<g><rect x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="4" fill="${theme.panelFill}" stroke="${theme.stroke}" stroke-width="1.3"/><text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}">${textTspans(n.lines, 13, n.x)}</text></g>`
  }).join('')
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      <defs><marker id="act-arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${theme.stroke}"/></marker></defs>
      ${edgeSvg}
      ${nodeSvg}
    </svg>`,
    width,
    height
  }
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
      if (!map.has(from)) { map.set(from, { name: from, items: [] }); nodes.push(map.get(from)) }
      if (!map.has(to)) { map.set(to, { name: to, items: [] }); nodes.push(map.get(to)) }
      edges.push({ from, to, label: (edge[3] || '').trim() })
      continue
    }
    const n = line.match(/^(.+?)\s*:\s*(.+)$/)
    if (n) {
      const name = n[1].trim()
      const items = splitList(n[2])
      if (!map.has(name)) { map.set(name, { name, items }); nodes.push(map.get(name)) }
      else map.get(name).items = [...new Set([...map.get(name).items, ...items])]
    }
  }
  return { nodes, edges }
}

function renderDeploymentDiagram(spec, theme) {
  const { nodes, edges } = parseNamedBlocks(spec)
  if (nodes.length < 2) throw new Error('请至少输入2个部署节点')
  const marginX = 82
  const marginY = 74
  const colGap = 130
  const rowGap = 74
  const processed = nodes.map(node => {
    const nameLines = wrapLabelLines(node.name, 12, 2)
    const items = (node.items.length > 0 ? node.items : ['-']).map(v => wrapLabelLines(v, 18, 1)[0])
    const maxLen = Math.max(...nameLines.map(v => v.length), ...items.map(v => v.length), 10)
    const w = Math.max(222, Math.min(300, 46 + maxLen * 12))
    const h = Math.max(116, 74 + items.length * 18)
    return { ...node, nameLines, items, w, h }
  })

  const outgoing = new Map(processed.map(n => [n.name, []]))
  const indeg = new Map(processed.map(n => [n.name, 0]))
  for (const e of edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, [])
    outgoing.get(e.from).push(e.to)
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1)
  }

  const queue = processed.filter(n => (indeg.get(n.name) || 0) === 0).map(n => n.name)
  const level = new Map(queue.map(name => [name, 0]))
  const indegWork = new Map(indeg)

  while (queue.length > 0) {
    const cur = queue.shift()
    const base = level.get(cur) ?? 0
    for (const nxt of outgoing.get(cur) || []) {
      const cand = base + 1
      if (!level.has(nxt) || cand > level.get(nxt)) level.set(nxt, cand)
      indegWork.set(nxt, (indegWork.get(nxt) || 0) - 1)
      if ((indegWork.get(nxt) || 0) === 0) queue.push(nxt)
    }
  }
  for (const n of processed) {
    if (!level.has(n.name)) level.set(n.name, 0)
  }

  const maxLevel = Math.max(...[...level.values()])
  const groups = Array.from({ length: maxLevel + 1 }, () => [])
  for (const n of processed) groups[level.get(n.name)].push(n)

  const parents = new Map(processed.map(n => [n.name, []]))
  const children = new Map(processed.map(n => [n.name, []]))
  for (const e of edges) {
    if (parents.has(e.to)) parents.get(e.to).push(e.from)
    if (children.has(e.from)) children.get(e.from).push(e.to)
  }

  for (let ci = 1; ci < groups.length; ci++) {
    const prevIndex = new Map(groups[ci - 1].map((n, i) => [n.name, i]))
    groups[ci].sort((a, b) => {
      const pa = parents.get(a.name) || []
      const pb = parents.get(b.name) || []
      const va = pa.length > 0 ? pa.reduce((s, p) => s + (prevIndex.get(p) ?? 999), 0) / pa.length : 999
      const vb = pb.length > 0 ? pb.reduce((s, p) => s + (prevIndex.get(p) ?? 999), 0) / pb.length : 999
      return va - vb
    })
  }
  for (let ci = groups.length - 2; ci >= 0; ci--) {
    const nextIndex = new Map(groups[ci + 1].map((n, i) => [n.name, i]))
    groups[ci].sort((a, b) => {
      const ca = children.get(a.name) || []
      const cb = children.get(b.name) || []
      const va = ca.length > 0 ? ca.reduce((s, p) => s + (nextIndex.get(p) ?? 999), 0) / ca.length : 999
      const vb = cb.length > 0 ? cb.reduce((s, p) => s + (nextIndex.get(p) ?? 999), 0) / cb.length : 999
      return va - vb
    })
  }

  const colWidths = groups.map(g => g.length ? Math.max(...g.map(n => n.w)) : 0)
  const colX = []
  let xCursor = marginX
  for (let ci = 0; ci < colWidths.length; ci++) {
    colX[ci] = xCursor
    xCursor += colWidths[ci] + colGap
  }

  const colHeights = groups.map(g => g.reduce((sum, n, idx) => sum + n.h + (idx > 0 ? rowGap : 0), 0))
  const coreHeight = Math.max(...colHeights, 0)
  const height = Math.max(460, coreHeight + marginY * 2)
  const width = Math.max(980, xCursor - colGap + marginX)

  const layout = []
  for (let ci = 0; ci < groups.length; ci++) {
    const g = groups[ci]
    let yCursor = marginY + Math.max(0, (coreHeight - colHeights[ci]) / 2)
    for (const node of g) {
      const placed = {
        ...node,
        x: colX[ci] + (colWidths[ci] - node.w) / 2,
        y: yCursor,
        level: ci
      }
      layout.push(placed)
      yCursor += node.h + rowGap
    }
  }

  const map = new Map(layout.map(n => [n.name, n]))
  const role = (name) => {
    const t = name.toLowerCase()
    if (t.includes('客户') || t.includes('前端') || t.includes('浏览器')) return '<<客户端>>'
    if (t.includes('数据库') || t.includes('mysql') || t.includes('redis')) return '<<数据库服务器>>'
    if (t.includes('文件') || t.includes('oss') || t.includes('存储')) return '<<文件服务器>>'
    return '<<应用服务器>>'
  }
  const nodeSvg = layout.map(n => `
    <g>
      <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${theme.softFill}" stroke="${theme.stroke}" stroke-width="1.5"/>
      <text x="${n.x + n.w / 2}" y="${n.y + 20}" text-anchor="middle" font-size="10" fill="${theme.muted}" font-style="italic">${role(n.name)}</text>
      <text x="${n.x + n.w / 2}" y="${n.y + 39}" text-anchor="middle" font-size="13" font-weight="bold" fill="${theme.text}">${textTspans(n.nameLines, 12, n.x + n.w / 2)}</text>
      ${n.items.map((it, i) => `<text x="${n.x + n.w / 2}" y="${n.y + 62 + i * 18}" text-anchor="middle" font-size="11" fill="${theme.text}">${esc(it)}</text>`).join('')}
    </g>
  `).join('')

  function routeDeploymentEdge(a, b, index = 0) {
    const s = pointOnRect({ x: a.x, y: a.y, w: a.w, h: a.h }, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
    const t = pointOnRect({ x: b.x, y: b.y, w: b.w, h: b.h }, { x: a.x + a.w / 2, y: a.y + a.h / 2 })
    const laneOffset = index === 0 ? 0 : ((index % 2 === 0 ? 1 : -1) * (Math.floor((index + 1) / 2) * 10))
    if (b.level > a.level) {
      const mx = (s.x + t.x) / 2 + laneOffset
      return {
        points: `${s.x},${s.y} ${mx},${s.y} ${mx},${t.y} ${t.x},${t.y}`,
        labelX: mx,
        labelY: (s.y + t.y) / 2 - 8 + laneOffset * 0.2
      }
    }
    const sideX = Math.max(s.x, t.x) + 42 + Math.abs(laneOffset) + index * 8
    return {
      points: `${s.x},${s.y} ${sideX},${s.y} ${sideX},${t.y} ${t.x},${t.y}`,
      labelX: sideX + 6,
      labelY: (s.y + t.y) / 2
    }
  }

  const routeCounter = new Map()
  const edgeSvg = edges.map(e => {
    const a = map.get(e.from), b = map.get(e.to)
    if (!a || !b) return ''
    const key = `${e.from}->${e.to}`
    const idx = routeCounter.get(key) || 0
    routeCounter.set(key, idx + 1)
    const route = routeDeploymentEdge(a, b, idx)
    return `
      <polyline points="${route.points}" fill="none" stroke="${theme.stroke}" stroke-width="1.3" marker-end="url(#dep-arr)"/>
      ${e.label ? `<text x="${route.labelX}" y="${route.labelY}" text-anchor="middle" font-size="11" fill="${theme.muted}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(e.label)}</text>` : ''}
    `
  }).join('')
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      <defs><marker id="dep-arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${theme.stroke}"/></marker></defs>
      ${edgeSvg}
      ${nodeSvg}
    </svg>`,
    width,
    height
  }
}

function renderArchitectureDiagram(spec, theme) {
  const { nodes: layers, edges } = parseNamedBlocks(spec)
  if (layers.length === 0) throw new Error('请先定义分层结构')
  const cardW = 170
  const cardH = 52
  const marginX = 86
  const marginY = 72
  const layerGap = 150
  const maxCount = Math.max(...layers.map(l => Math.max(1, l.items.length)))
  const width = Math.max(980, marginX * 2 + maxCount * cardW + (maxCount - 1) * 50)
  const height = Math.max(500, marginY * 2 + layers.length * layerGap + 30)
  const pos = new Map()
  const layerSvg = layers.map((layer, li) => {
    const y = marginY + li * layerGap
    const items = layer.items.length ? layer.items : ['-']
    const total = items.length * cardW + (items.length - 1) * 50
    const sx = (width - total) / 2
    const cards = items.map((name, i) => {
      const x = sx + i * (cardW + 50)
      pos.set(name, { x: x + cardW / 2, y: y + 82, box: { x, y: y + 56, w: cardW, h: cardH } })
      return `<rect x="${x}" y="${y + 56}" width="${cardW}" height="${cardH}" rx="8" fill="${theme.panelFill}" stroke="${theme.stroke}" />
        <text x="${x + cardW / 2}" y="${y + 88}" text-anchor="middle" font-size="12" fill="${theme.text}">${esc(name)}</text>`
    }).join('')
    return `<g>
      <rect x="${marginX - 16}" y="${y}" width="${width - (marginX - 16) * 2}" height="122" rx="10" fill="${theme.softFill}" stroke="${theme.stroke}" />
      <text x="${marginX}" y="${y + 24}" font-size="13" font-weight="bold" fill="${theme.text}">${esc(layer.name)}</text>
      ${cards}
    </g>`
  }).join('')
  const rels = edges.length ? edges : (() => {
    const arr = []
    for (let i = 0; i < layers.length - 1; i++) {
      const a = layers[i].items, b = layers[i + 1].items
      for (let j = 0; j < a.length; j++) arr.push({ from: a[j], to: b[Math.min(j, b.length - 1)], label: '' })
    }
    return arr
  })()
  const edgeSvg = rels.map(e => {
    const a = pos.get(e.from), b = pos.get(e.to)
    if (!a || !b) return ''
    const p1 = pointOnRect(a.box, { x: b.x, y: b.y }), p2 = pointOnRect(b.box, { x: a.x, y: a.y })
    return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${theme.stroke}" stroke-width="1.2" marker-end="url(#arc-arr)"/>
      ${e.label ? `<text x="${(p1.x + p2.x) / 2}" y="${(p1.y + p2.y) / 2 - 6}" text-anchor="middle" font-size="11" fill="${theme.muted}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(e.label)}</text>` : ''}`
  }).join('')
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      <defs><marker id="arc-arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0,10 3.5,0 7" fill="${theme.stroke}"/></marker></defs>
      ${edgeSvg}
      ${layerSvg}
    </svg>`,
    width,
    height
  }
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
      if (!parent) continue
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

function renderFunctionStructureDiagram(spec, theme) {
  const { nodes, edges } = parseFunctionStructureSpec(spec)
  if (nodes.length === 0) throw new Error('请先输入功能结构定义')

  const incoming = new Map(nodes.map(n => [n, 0]))
  const childrenMap = new Map(nodes.map(n => [n, []]))
  for (const e of edges) {
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1)
    if (!childrenMap.has(e.from)) childrenMap.set(e.from, [])
    childrenMap.get(e.from).push(e.to)
  }

  const roots = nodes.filter(n => (incoming.get(n) || 0) === 0)
  const rootList = roots.length > 0 ? roots : [nodes[0]]
  const nodeMap = new Map()
  const subtreeWidth = new Map()
  const gapX = 42
  const gapY = 120
  const marginX = 90
  const marginY = 86
  const visited = new Set()

  const nodeWidth = (name, lines = null) => {
    const wrapped = lines || wrapLabelLines(name, 12, 3)
    const maxLen = Math.max(...wrapped.map(line => line.length))
    return Math.max(132, Math.min(240, 36 + maxLen * 15))
  }

  function measure(name) {
    if (subtreeWidth.has(name)) return subtreeWidth.get(name)
    if (visited.has(name)) return nodeWidth(name)
    visited.add(name)
    const children = childrenMap.get(name) || []
    const selfW = nodeWidth(name)
    if (children.length === 0) {
      subtreeWidth.set(name, selfW)
      return selfW
    }
    const childW = children.reduce((sum, child, idx) => sum + measure(child) + (idx > 0 ? gapX : 0), 0)
    const total = Math.max(selfW, childW)
    subtreeWidth.set(name, total)
    return total
  }

  let maxDepth = 0
  function assign(name, left, depth) {
    maxDepth = Math.max(maxDepth, depth)
    const totalW = measure(name)
    const lines = wrapLabelLines(name, 12, 3)
    const w = nodeWidth(name, lines)
    const h = Math.max(48, 34 + lines.length * 14)
    const x = left + totalW / 2
    const y = marginY + depth * gapY
    if (!nodeMap.has(name)) nodeMap.set(name, { name, x, y, w, h, lines })
    const children = childrenMap.get(name) || []
    let childLeft = left
    for (const child of children) {
      const cw = measure(child)
      assign(child, childLeft, depth + 1)
      childLeft += cw + gapX
    }
  }

  let cursorLeft = marginX
  for (const root of rootList) {
    const totalW = measure(root)
    assign(root, cursorLeft, 0)
    cursorLeft += totalW + 72
  }

  const width = Math.max(920, cursorLeft + marginX)
  const height = Math.max(500, marginY + maxDepth * gapY + 140)

  const edgeSvg = edges.map(e => {
    const a = nodeMap.get(e.from)
    const b = nodeMap.get(e.to)
    if (!a || !b) return ''
    const p1 = pointOnRect({ x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h }, { x: b.x, y: b.y })
    const p2 = pointOnRect({ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h }, { x: a.x, y: a.y })
    const midY = p1.y + Math.max(20, (p2.y - p1.y) / 2)
    return `<polyline points="${p1.x},${p1.y} ${p1.x},${midY} ${p2.x},${midY} ${p2.x},${p2.y}" fill="none" stroke="${theme.stroke}" stroke-width="1.2"/>`
  }).join('')

  const nodeSvg = [...nodeMap.values()].map(n => {
    const fill = n.y === marginY ? theme.softFill : theme.panelFill
    return `
      <g>
        <rect x="${n.x - n.w / 2}" y="${n.y - n.h / 2}" width="${n.w}" height="${n.h}" rx="8" fill="${fill}" stroke="${theme.stroke}" stroke-width="1.3"/>
        <text x="${n.x}" y="${n.y}" text-anchor="middle" font-size="12" fill="${theme.text}" font-weight="600">${textTspans(n.lines, 13, n.x)}</text>
      </g>
    `
  }).join('')

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${theme.bg}" />
      ${edgeSvg}
      ${nodeSvg}
    </svg>`,
    width,
    height
  }
}

function renderUmlDiagram(type, spec, styleKey = 'academic') {
  const theme = UML_STYLE_PRESETS[styleKey] || UML_STYLE_PRESETS.academic
  if (type === 'class') return renderClassDiagram(spec, theme)
  if (type === 'sequence') return renderSequenceDiagram(spec, theme)
  if (type === 'activity') return renderActivityDiagram(spec, theme)
  if (type === 'deployment') return renderDeploymentDiagram(spec, theme)
  if (type === 'architecture') return renderArchitectureDiagram(spec, theme)
  if (type === 'function_structure') return renderFunctionStructureDiagram(spec, theme)
  throw new Error('不支持的图类型')
}

export { UML_STYLE_PRESETS, UML_TEMPLATES, renderUmlDiagram }
