/**
 * SQL解析器 v2：完整支持Navicat导出的MySQL语法
 * 支持：CHARACTER SET、COLLATE、USING BTREE、ON UPDATE、DEFAULT NULL等
 */
export function parseSQL(sql) {
  const tables = []
  const relationships = []

  // 预处理：去掉INSERT/DROP/SET语句和注释
  const cleaned = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^(INSERT|DROP|SET|LOCK|UNLOCK|BEGIN|COMMIT)\b[^;]*;/gim, '')

  // 匹配CREATE TABLE，兼容各种写法
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(\s*([\s\S]*?)\n\)\s*([^;]*);/gi
  let m
  while ((m = re.exec(cleaned)) !== null) {
    const name = m[1]
    const body = m[2]
    const tail = m[3]
    const t = parseBody(name, body)
    // 从尾部提取COMMENT
    const cm = tail.match(/COMMENT\s*=\s*'([^']*)'/i)
    if (cm) t.comment = cm[1]
    tables.push(t)
  }

  // 提取外键关系
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      relationships.push({ from: t.name, fromCol: fk.col, to: fk.ref, toCol: fk.refCol, label: '关联' })
    }
  }
  return { tables, relationships }
}

function parseBody(tableName, body) {
  const columns = []
  const foreignKeys = []
  let pk = null

  // 按逗号+换行分割（处理字段内可能有逗号的情况）
  const lines = splitLines(body)

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    // PRIMARY KEY
    if (/^\s*PRIMARY\s+KEY/i.test(line)) {
      const pm = line.match(/\(\s*`?(\w+)`?/i)
      if (pm) pk = pm[1]
      continue
    }
    // INDEX / KEY / UNIQUE
    if (/^\s*(UNIQUE\s+)?(INDEX|KEY)\s/i.test(line)) continue
    // CONSTRAINT FOREIGN KEY
    if (/FOREIGN\s+KEY/i.test(line)) {
      const fm = line.match(/FOREIGN\s+KEY\s*\(\s*`?(\w+)`?\s*\)\s*REFERENCES\s+`?(\w+)`?\s*\(\s*`?(\w+)`?\s*\)/i)
      if (fm) foreignKeys.push({ col: fm[1], ref: fm[2], refCol: fm[3] })
      continue
    }
    // CONSTRAINT without FK
    if (/^\s*CONSTRAINT/i.test(line)) continue

    // 普通字段: `name` type(...) ...
    const cm = line.match(/^`?(\w+)`?\s+(\w+)(?:\s*\([^)]*\))?/i)
    if (!cm) continue
    const colName = cm[1]
    const colType = cm[2].toUpperCase()
    // 跳过保留字开头的行（兜底）
    if (['PRIMARY','INDEX','KEY','UNIQUE','CONSTRAINT','FOREIGN'].includes(colType)) continue

    let comment = ''
    // 支持转义单引号\'，以及双单引号''
    const commentMatch = line.match(/COMMENT\s+'((?:[^'\\]|\\.|'')*)'/i)
    if (commentMatch) comment = commentMatch[1].replace(/\\'/g, "'").replace(/''/g, "'")

    columns.push({
      name: colName,
      type: colType,
      comment,
      isPK: false
    })
  }

  if (pk) {
    const c = columns.find(col => col.name === pk)
    if (c) c.isPK = true
  }

  return { name: tableName, comment: '', columns, foreignKeys, pk }
}

function splitLines(body) {
  // 智能分割：按顶层逗号分割，忽略括号内和引号内的逗号
  const result = []
  let depth = 0, buf = '', inQuote = false, escape = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (escape) { buf += ch; escape = false; continue }
    if (ch === '\\') { buf += ch; escape = true; continue }
    if (ch === "'" && !inQuote) { inQuote = true; buf += ch; continue }
    if (ch === "'" && inQuote) { inQuote = false; buf += ch; continue }
    if (inQuote) { buf += ch; continue }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      result.push(buf)
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) result.push(buf)
  return result
}

export function displayName(t) { return t.comment || t.name }
export function colDisplay(c) { return c.comment || c.name }
