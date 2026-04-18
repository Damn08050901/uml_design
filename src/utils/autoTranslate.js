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
  summary: '摘要', text: '文本', body: '正文', subject: '主题', keyword: '关键词', keywords: '关键词',
  cover: '封面', thumb: '缩略图', thumbnail: '缩略图', icon: '图标', logo: '标志',
  color: '颜色', size: '尺寸', width: '宽度', height: '高度', length: '长度',
  count: '数量', total_count: '总数', view_count: '浏览数', like_count: '点赞数', comment_count: '评论数',
  share_count: '分享数', collect_count: '收藏数', follow_count: '关注数', fans_count: '粉丝数',
  score: '分数', point: '积分', points: '积分', credit: '信用', credits: '学分',
  reason: '原因', result: '结果', method: '方式', mode: '模式', channel: '渠道', source: '来源',
  target: '目标', origin: '来源', from: '来源', to: '目标', ref: '引用',
  min: '最小值', max: '最大值', avg: '平均值', limit: '限制',
  is: '是否', has: '是否有', can: '是否可以',
  // 时间
  time: '时间', date: '日期', datetime: '日期时间', year: '年份', month: '月份', day: '日', week: '周',
  create_time: '创建时间', created_at: '创建时间', created_time: '创建时间', gmt_create: '创建时间',
  update_time: '更新时间', updated_at: '更新时间', updated_time: '更新时间', gmt_modified: '修改时间', modify_time: '修改时间',
  delete_time: '删除时间', deleted_at: '删除时间',
  start_time: '开始时间', end_time: '结束时间', expire_time: '过期时间', expiry_time: '过期时间',
  birth_date: '出生日期', birthday: '生日',
  publish_time: '发布时间', publish_date: '发布日期', published_at: '发布时间',
  begin_time: '开始时间', finish_time: '完成时间', close_time: '关闭时间', open_time: '开放时间',
  apply_time: '申请时间', approve_time: '审批时间', check_time: '审核时间',
  login_time: '登录时间', register_time: '注册时间', sign_time: '签到时间',
  book_time: '预约时间', reserve_time: '预约时间', schedule_time: '计划时间',
  // 用户相关
  user: '用户', user_id: '用户ID', uid: '用户ID', member_id: '会员ID', member: '会员',
  username: '用户名', user_name: '用户名', login_name: '登录名', account: '账号',
  password: '密码', passwd: '密码', pwd: '密码', salt: '密码盐',
  nickname: '昵称', nick_name: '昵称', real_name: '真实姓名', full_name: '全名',
  avatar: '头像', avatar_url: '头像地址', photo: '照片', portrait: '头像',
  gender: '性别', sex: '性别', age: '年龄',
  phone: '手机号', mobile: '手机号', telephone: '电话', tel: '电话',
  email: '邮箱', mail: '邮箱',
  address: '地址', province: '省份', city: '城市', district: '区县', area: '区域',
  role: '角色', role_id: '角色ID', role_code: '角色编码',
  dept: '部门', dept_id: '部门ID', department: '部门', org: '组织', organization: '组织',
  admin: '管理员', manager: '管理者', staff: '员工', employee: '员工', worker: '工作人员',
  author: '作者', writer: '作者', editor: '编辑', publisher: '发布者', poster: '发布者',
  visitor: '访客', guest: '访客', customer: '客户', client: '客户', vip: 'VIP',
  // 权限
  permission: '权限', permission_id: '权限ID', permission_name: '权限名称', permission_code: '权限编码',
  menu: '菜单', menu_id: '菜单ID',
  resource: '资源', resource_id: '资源ID',
  // 文件/媒体
  file: '文件', file_name: '文件名', file_path: '文件路径', file_size: '文件大小', file_type: '文件类型',
  url: '链接地址', path: '路径', image: '图片', img: '图片', pic: '图片', images: '图片',
  video: '视频', audio: '音频', attachment: '附件', document: '文档', doc: '文档',
  // 分类/标签
  category: '分类', category_id: '分类ID', cat_id: '分类ID', cate_id: '分类ID',
  tag: '标签', tag_id: '标签ID', tags: '标签',
  group: '分组', group_id: '分组ID',
  // 金额/商品
  price: '价格', amount: '金额', total: '合计', fee: '费用', cost: '费用', balance: '余额', money: '金额',
  discount: '折扣', tax: '税率', rate: '比率', salary: '薪资', wage: '工资', income: '收入', expense: '支出',
  product: '商品', product_id: '商品ID', goods: '商品', goods_id: '商品ID', item: '物品', item_id: '物品ID',
  sku: 'SKU', spu: 'SPU', stock: '库存', quantity: '数量', qty: '数量',
  brand: '品牌', model: '型号', spec: '规格', unit: '单位',
  // 订单/交易
  order_id: '订单ID', order_no: '订单编号', order_status: '订单状态',
  pay: '支付', pay_status: '支付状态', pay_time: '支付时间', pay_type: '支付方式',
  payment: '支付', transaction: '交易', trade: '交易', bill: '账单', invoice: '发票', receipt: '收据',
  refund: '退款', return: '退货', exchange: '换货',
  // 地理
  longitude: '经度', latitude: '纬度', lng: '经度', lat: '纬度', location: '位置',
  country: '国家', region: '地区', street: '街道', zip: '邮编', postcode: '邮编',
  // 活动/事件
  activity: '活动', event: '事件', campaign: '活动', project: '项目', task: '任务', plan: '计划',
  schedule: '日程', calendar: '日历', meeting: '会议', conference: '会议',
  sign: '签到', checkin: '签到', check_in: '签到', signup: '报名', sign_up: '报名',
  register: '注册', registration: '注册', enroll: '报名', enrollment: '报名',
  ticket: '工单', issue: '问题', request: '请求', apply: '申请', application: '申请',
  // 文章/内容
  article: '文章', post: '帖子', blog: '博客', news: '新闻', announcement: '公告',
  notice: '通知', bulletin: '公告', broadcast: '广播',
  comment: '评论', reply: '回复', feedback: '反馈', review: '评价', rating: '评分',
  message: '消息', chat: '聊天', conversation: '会话', dialog: '对话',
  publish: '发布', draft: '草稿', archive: '归档',
  tip: '提示', hint: '提示', guide: '指南', help: '帮助', faq: '常见问题',
  // 动物/宠物
  animal: '动物', pet: '宠物', dog: '犬', cat: '猫', bird: '鸟',
  adopt: '领养', adoption: '领养', foster: '寄养', rescue: '救助',
  breed: '品种', species: '物种', variety: '品种',
  feed: '喂养', feeding: '喂养', food: '食物', diet: '饮食',
  vaccine: '疫苗', vaccination: '疫苗接种', immunization: '免疫',
  sterilization: '绝育', neuter: '绝育', spay: '绝育',
  medical: '医疗', health: '健康', disease: '疾病', illness: '疾病', symptom: '症状',
  treatment: '治疗', therapy: '治疗', diagnosis: '诊断', prescription: '处方',
  checkup: '体检', examination: '检查', exam: '检查',
  clinic: '诊所', hospital: '医院', ward: '病房', bed: '床位',
  // 志愿/捐赠
  volunteer: '志愿者', volunteering: '志愿服务',
  donate: '捐赠', donation: '捐赠', donor: '捐赠者',
  charity: '慈善', welfare: '福利', aid: '援助', support: '支持',
  sponsor: '赞助', sponsorship: '赞助', fund: '基金', funding: '资金',
  // 预约/预订
  appointment: '预约', booking: '预订', reservation: '预订', reserve: '预约',
  visit: '访问', consultation: '咨询', consult: '咨询', inquiry: '咨询',
  // 广告/营销
  advertise: '广告', advertisement: '广告', ad: '广告', ads: '广告',
  banner: '横幅', promotion: '促销', coupon: '优惠券', voucher: '优惠券',
  marketing: '营销', seo: 'SEO', link: '链接',
  // 教育
  course: '课程', lesson: '课时', class: '班级', classroom: '教室',
  student: '学生', teacher: '教师', instructor: '讲师', professor: '教授',
  school: '学校', college: '学院', university: '大学', campus: '校区',
  major: '专业', subject: '科目', semester: '学期', term: '学期',
  homework: '作业', assignment: '作业', test: '测试', quiz: '测验',
  certificate: '证书', diploma: '文凭', degree: '学位',
  // 物流/配送
  delivery: '配送', shipping: '物流', express: '快递', logistics: '物流',
  warehouse: '仓库', storage: '存储', inventory: '库存',
  sender: '发送人', receiver: '收件人', carrier: '承运商',
  tracking: '追踪', package: '包裹', parcel: '包裹',
  // 社交
  friend: '好友', follow: '关注', follower: '粉丝', fan: '粉丝',
  like: '点赞', favorite: '收藏', collect: '收藏', share: '分享',
  report: '举报', block: '拉黑', blacklist: '黑名单',
  // 系统/技术
  sys: '系统', system: '系统', app: '应用', application: '应用',
  service: '服务', api: '接口', interface: '接口',
  config: '配置', setting: '设置', option: '选项', param: '参数', parameter: '参数',
  log: '日志', record: '记录', history: '历史', trace: '追踪',
  cache: '缓存', session: '会话', cookie: '令牌',
  queue: '队列', job: '任务', cron: '定时任务', timer: '计时器',
  template: '模板', theme: '主题', layout: '布局', page: '页面',
  notification: '通知', notify: '通知', alert: '警报', warning: '警告',
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
  approve: '审批', approval: '审批', reject: '驳回', pass: '通过',
  publish: '发布', published: '已发布', hidden: '隐藏', visible: '可见',
  // 失物招领专用
  lost: '失物', found: '招领', claim: '认领',
  lost_item: '失物信息', found_item: '招领信息', claim_application: '认领申请',
  lost_place: '丢失地点', found_place: '拾取地点', lost_time: '丢失时间', found_time: '拾取时间',
  contact_name: '联系人姓名', contact_phone: '联系电话',
  item_type: '物品类型', item_category: '物品分类',
  // 心理健康
  psychology: '心理', mental: '心理', emotion: '情绪', mood: '心情', stress: '压力',
  anxiety: '焦虑', depression: '抑郁', counselor: '咨询师', therapist: '治疗师',
  assessment: '评估', questionnaire: '问卷', survey: '调查', answer: '回答', question: '问题',
  // 房产/租赁
  house: '房屋', room: '房间', apartment: '公寓', building: '建筑', floor: '楼层',
  rent: '租金', lease: '租约', contract: '合同', agreement: '协议',
  estate: '房产', property: '物业', landlord: '房东', tenant: '租户',
}

// 表名 → 中文字典（常见业务表）
const TABLE_DICT = {
  // 用户/权限
  user: '用户表', users: '用户表', sys_user: '系统用户表', front_user: '前台用户表', admin_user: '管理员表', admin: '管理员表',
  role: '角色表', sys_role: '角色表', permission: '权限表', sys_permission: '权限表',
  menu: '菜单表', sys_menu: '菜单表',
  dept: '部门表', department: '部门表', organization: '组织机构表',
  user_role: '用户角色关联表', role_permission: '角色权限关联表', sys_user_role: '用户角色关联表', sys_role_permission: '角色权限关联表',
  role_menu: '角色菜单关联表', user_permission: '用户权限关联表',
  // 商品/订单
  order: '订单表', orders: '订单表', order_item: '订单明细表', order_detail: '订单详情表',
  product: '商品表', goods: '商品表', sku: 'SKU表', spu: 'SPU表',
  cart: '购物车表', shopping_cart: '购物车表',
  payment: '支付记录表', refund: '退款表', transaction: '交易记录表',
  // 分类/标签
  category: '分类表', item_category: '物品分类表', tag: '标签表', tags: '标签表',
  // 失物招领
  lost_item: '失物信息表', found_item: '招领信息表', claim_application: '认领申请表',
  // 通知/消息
  notification: '通知消息表', message: '消息表', notice: '公告表', announcement: '公告表',
  // 文件
  file: '文件表', attachment: '附件表', upload: '上传记录表',
  // 日志/配置
  log: '日志表', operation_log: '操作日志表', login_log: '登录日志表', sys_log: '系统日志表',
  config: '系统配置表', setting: '设置表', sys_config: '系统配置表',
  dict: '字典表', sys_dict: '字典表', sys_dict_data: '字典数据表',
  com_query: '通用查询表', sys_com_query: '通用查询记录表',
  // 动物/宠物
  animal: '动物表', pet: '宠物表', adopt: '领养表', adoption: '领养记录表',
  adopt_apply: '领养申请表', adopt_record: '领养记录表', adoption_application: '领养申请表',
  breed: '品种表', species: '物种表',
  feed: '喂养记录表', feeding: '喂养记录表', feed_record: '喂养记录表',
  vaccine: '疫苗表', vaccination: '疫苗接种表', vaccine_record: '疫苗记录表',
  sterilization: '绝育记录表', medical: '医疗记录表', medical_record: '医疗记录表',
  health: '健康记录表', health_record: '健康记录表', checkup: '体检记录表',
  foster: '寄养表', foster_record: '寄养记录表', rescue: '救助表', rescue_record: '救助记录表',
  // 志愿/捐赠
  volunteer: '志愿者表', volunteer_record: '志愿服务记录表', volunteer_activity: '志愿活动表',
  donate: '捐赠表', donation: '捐赠记录表', donor: '捐赠者表',
  // 活动/预约
  activity: '活动表', event: '事件表', campaign: '活动表',
  appointment: '预约表', booking: '预订表', reservation: '预订表',
  schedule: '日程表', calendar: '日历表',
  sign: '签到表', sign_record: '签到记录表', signup: '报名表',
  // 文章/内容/评论
  article: '文章表', post: '帖子表', blog: '博客表', news: '新闻表',
  article_tip: '文章提示表', article_category: '文章分类表', article_tag: '文章标签表',
  comment: '评论表', reply: '回复表', feedback: '反馈表',
  review: '评价表', rating: '评分表',
  // 广告
  advertise: '广告表', advertisement: '广告表', ad: '广告表', banner: '轮播图表',
  promotion: '促销表', coupon: '优惠券表',
  // 收入/财务
  income: '收入表', expense: '支出表', finance: '财务表', bill: '账单表', invoice: '发票表',
  salary: '薪资表', wage: '工资表', budget: '预算表',
  // 教育
  course: '课程表', lesson: '课时表', class: '班级表', classroom: '教室表',
  student: '学生表', teacher: '教师表', instructor: '讲师表',
  school: '学校表', college: '学院表', major: '专业表',
  homework: '作业表', assignment: '作业表', exam: '考试表', score: '成绩表', grade: '成绩表',
  // 心理健康
  assessment: '评估表', questionnaire: '问卷表', survey: '调查表',
  counselor: '咨询师表', therapist: '治疗师表',
  consultation: '咨询记录表', consult: '咨询表',
  // 物流
  delivery: '配送表', shipping: '物流表', express: '快递表',
  warehouse: '仓库表', inventory: '库存表',
  // 房产
  house: '房屋表', room: '房间表', building: '建筑表',
  contract: '合同表', lease: '租约表',
  // 社交
  friend: '好友表', follow: '关注表', favorite: '收藏表', like: '点赞表',
  share: '分享表', report: '举报表', blacklist: '黑名单表',
  // 其他
  area: '区域表', region: '地区表', address: '地址表',
  task: '任务表', project: '项目表', plan: '计划表',
  template: '模板表', version: '版本表',
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

export function inferTableComment(name) {
  const lower = name.toLowerCase()
  if (TABLE_DICT[lower]) return TABLE_DICT[lower]
  const comment = inferComment(name)
  if (comment) return comment + '表'
  return null
}

export { inferComment }

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
