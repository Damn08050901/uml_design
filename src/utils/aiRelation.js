 /**
 * AI智能识别表关联关系
 * 规则：如果表A有字段xxx_id，且存在表B的主键是id且表名匹配xxx，则认为A.xxx_id → B.id
 */
export function detectRelations(tables) {
  const rels = []
  const tableMap = {}
  for (const t of tables) tableMap[t.name] = t

  for (const t of tables) {
    for (const col of t.columns) {
      const name = col.name.toLowerCase()
      // 匹配 xxx_id 模式
      if (!name.endsWith('_id')) continue
      if (col.isPK) continue // 跳过自己的主键
      const prefix = name.slice(0, -3) // 去掉 _id
      // 查找匹配的表
      for (const other of tables) {
        if (other.name === t.name) continue
        const otherName = other.name.toLowerCase()
        // 匹配规则：表名==prefix 或 表名包含prefix 或 prefix包含表名
        if (otherName === prefix || otherName.includes(prefix) || prefix.includes(otherName)) {
          // 检查目标表是否有id主键
          const pk = other.columns.find(c => c.isPK)
          if (pk) {
            // 避免重复
            const exists = rels.some(r => r.from === t.name && r.fromCol === col.name && r.to === other.name)
            if (!exists) {
              rels.push({
                from: t.name, fromCol: col.name,
                to: other.name, toCol: pk.name,
                label: '关联'
              })
            }
          }
        }
      }
    }
  }
  return rels
}
