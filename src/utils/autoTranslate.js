/**
 * 自动补全SQL注释：扫描SQL文本，对无COMMENT的字段/表根据字段名字典推断中文含义
 * 直接修改SQL文本，插入 COMMENT 子句，无需网络请求
 */

// ─── 通用字段名字典（英文 → 中文）───────────────────────────
const DICT = {
  // 通用
  id: 'ID', ids: 'ID列表',
  name: '名称', title: '标题', label: '标签',
  type: '类型', status: '状态', state: '状态',
  code: '编码', no: '编号', num: '数量', number: '编号',
  sort: '排序', order: '排序', seq: '序号', index: '索引',
  remark: '备注', note: '备注', desc: '描述', description: '描述', content: '内容',
  info: '信息', detail: '详情', data: '数据', value: '值',
  flag: '标志', enabled: '是否启用', deleted: '是否删除', active: '是否激活',
  version: '版本号', level: '级别', grade: '等级', priority: '优先级', weight: '权重',
  // 时间
  time: '时间', date: '日期', datetime: '日期时间',
  create_time: '创建时间', created_at: '创建时间', created_time: '创建时间', gmt_create: '创建时间',
  update_time: '更新时间', updated_at: '更新时间', updated_time: '更新时间', gmt_modified: '修改时间', modify_time: '修改时间',
  delete_time: '删除时间', deleted_at: '删除时间',
  start_time: '开始时间', end_time: '结束时间', expire_time: '过期时间', expiry_time: '过期时间',
  birth_date: '出生日期', birthday: '生日',
  // 用户相关
  user: '用户', user_id: '用户ID', uid: '用户ID', member_id: '会员ID',
  username: '用户名', user_name: '用户名', login_name: '登录名', account: '账号',
  password: '密码', passwd: '密码', pwd: '密码', salt: '密码盐',
  nickname: '昵称', nick_name: '昵称', real_name: '真实姓名', full_name: '全名',
  avatar: '头像', avatar_url: '头像地址', photo: '照片', portrait: '头像',
  gender: '性别', sex: '性别', age: '年龄',
  phone: '手机号', mobile: '手机号', telephone: '电话', tel: '电话',
  email: '邮箱', mail: '邮箱',
  address: '地址', province: '省份', city: '城市', district: '区县', area: '区域',
  role: '角色', role_id: '角色ID', role_code: '角色编码',
  dept: '部门', dept_id: '部门ID', department: '部门', org: '组织',
  // 权限
  permission: '权限', permission_id: '权限ID', permission_name: '权限名称', permission_code: '权限编码',
  menu: '菜单', menu_id: '菜单ID',
  resource: '资源', resource_id: '资源ID',
  // 文件/媒体
  file: '文件', file_name: '文件名', file_path: '文件路径', file_size: '文件大小', file_type: '文件类型',
  url: '链接地址', path: '路径', image: '图片', img: '图片', pic: '图片', images: '图片',
  video: '视频', audio: '音频', attachment: '附件',
  // 分类/标签
  category: '分类', category_id: '分类ID', cat_id: '分类ID', cate_id: '分类ID',
  tag: '标签', tag_id: '标签ID', tags: '标签',
  group: '分组', group_id: '分组ID',
  // 金额/商品
  price: '价格', amount: '金额', total: '合计', fee: '费用', cost: '费用', balance: '余额', money: '金额',
  discount: '折扣', tax: '税率', rate: '比率',
  product: '商品', product_id: '商品ID', goods: '商品', goods_id: '商品ID', item: '物品', item_id: '物品ID',
  sku: 'SKU', spu: 'SPU', stock: '库存', quantity: '数量', qty: '数量',
  // 订单
  order_id: '订单ID', order_no: '订单编号', order_status: '订单状态',
  pay: '支付', pay_status: '支付状态', pay_time: '支付时间', pay_type: '支付方式',
  // 地理
  longitude: '经度', latitude: '纬度', lng: '经度', lat: '纬度', location: '位置',
  // 其他
  ip: 'IP地址', token: '令牌', key: '键', secret: '密钥',
  parent: '父级', parent_id: '父级ID', pid: '父级ID',
  children: '子级', leaf: '是否叶节点',
  tenant: '租户', tenant_id: '租户ID',
  operator: '操作人', operator_id: '操作人ID', creator: '创建人', creator_id: '创建人ID',
  updater: '更新人', updater_id: '更新人ID',
  is_read: '是否已读', read: '是否已读', is_del: '是否删除', is_deleted: '是否删除',
  related_id: '关联ID', ref_id: '关联ID',
  audit: '审核', audit_time: '审核时间', audit_user_id: '审核人ID', audit_remark: '审核备注',
  // 失物招领专用
  lost: '失物', found: '招领', claim: '认领',
  lost_item: '失物信息', found_item: '招领信息', claim_application: '认领申请',
  lost_place: '丢失地点', found_place: '拾取地点', lost_time: '丢失时间', found_time: '拾取时间',
  contact_name: '联系人姓名', contact_phone: '联系电话',
  notification: '通知', notify: '通知',
  item_type: '物品类型', item_category: '物品分类',
}

// 表名 → 中文字典（常见业务表）
const TABLE_DICT = {
  user: '用户表', sys_user: '系统用户表', front_user: '前台用户表', admin_user: '管理员表',
  role: '角色表', sys_role: '角色表', permission: '权限表', sys_permission: '权限表',
  menu: '菜单表', sys_menu: '菜单表',
  dept: '部门表', organization: '组织机构表',
  user_role: '用户角色关联表', role_permission: '角色权限关联表', sys_user_role: '用户角色关联表', sys_role_permission: '角色权限关联表',
  order: '订单表', order_item: '订单明细表', product: '商品表', goods: '商品表',
  category: '分类表', item_category: '物品分类表',
  lost_item: '失物信息表', found_item: '招领信息表', claim_application: '认领申请表',
  notification: '通知消息表', message: '消息表',
  file: '文件表', attachment: '附件表',
  log: '日志表', operation_log: '操作日志表', login_log: '登录日志表',
  config: '系统配置表', setting: '设置表', sys_config: '系统配置表',
  dict: '字典表', sys_dict: '字典表', sys_dict_data: '字典数据表',
  com_query: '通用查询表', sys_com_query: '通用查询记录表',
}

/**
 * 根据字段名推断中文含义
 * 优先全名匹配，其次拆分后逐词匹配拼接
 */
function inferComment(name) {
  const lower = name.toLowerCase()
  // 1. 全名精确匹配
  if (DICT[lower]) return DICT[lower]
  // 2. 拆分下划线/驼峰，逐词匹配后拼接
  const words = lower.replace(/([a-z])([A-Z])/g, '$1_$2').split('_').filter(Boolean)
  if (words.length > 1) {
    const parts = words.map(w => DICT[w] || w)
    // 如果所有词都没查到就返回null（保留英文名）
    if (parts.every(p => !DICT[p.toLowerCase()] && /^[a-z]+$/.test(p))) return null
    return parts.join('')
  }
  return null
}

function inferTableComment(name) {
  const lower = name.toLowerCase()
  if (TABLE_DICT[lower]) return TABLE_DICT[lower]
  const comment = inferComment(name)
  if (comment) return comment + '表'
  return null
}

/**
 * 直接修改SQL文本：对无COMMENT的字段行和表尾部自动插入 COMMENT
 * @param {string} sql 原始SQL文本
 * @returns {{ sql: string, count: number }} 处理后的SQL和修改数量
 */
export function autoFillComments(sql) {
  let count = 0

  // ── 1. 处理字段行：匹配无COMMENT的字段定义行 ──
  // 匹配形如：  `field_name` type ... 但行末没有 COMMENT
  const fieldRe = /^([ \t]*`?(\w+)`?[ \t]+(?:tinyint|smallint|mediumint|int|bigint|float|double|decimal|varchar|char|text|mediumtext|longtext|blob|datetime|date|time|timestamp|year|boolean|bool|json|enum|set)[^,\n]*?)(?=,?\s*$)/gim

  sql = sql.replace(fieldRe, (match, full, fieldName) => {
    // 跳过已有COMMENT的行
    if (/COMMENT\s*'/i.test(full)) return match
    // 跳过约束行
    if (/^\s*(PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT|FOREIGN)/i.test(full)) return match
    const comment = inferComment(fieldName)
    if (!comment) return match
    count++
    return full + ` COMMENT '${comment}'`
  })

  // ── 2. 处理表尾：匹配无COMMENT=的建表结尾 ──
  // 形如：) ENGINE=InnoDB ... ;  但没有 COMMENT = '...'
  const tableRe = /CREATE\s+TABLE\s+`?(\w+)`?[\s\S]*?(\)\s*(?:ENGINE[^;]*?)?)(;)/gi
  sql = sql.replace(tableRe, (match, tableName, tail, semi) => {
    if (/COMMENT\s*=/i.test(tail)) return match
    const comment = inferTableComment(tableName)
    if (!comment) return match
    count++
    return match.replace(/(\s*;)$/, ` COMMENT = '${comment}'$1`)
  })

  return { sql, count }
}
