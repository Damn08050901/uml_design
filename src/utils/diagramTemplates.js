export const UML_TEMPLATES = {
  class: `<<interface>>Serializable|serialVersionUID:long|serialize()
用户|id:Long,用户名:String,密码:String|+登录():boolean,+注册():void
订单|id:Long,订单号:String,金额:Decimal|+创建订单(),+取消订单()
订单明细|id:Long,数量:Integer,小计:Decimal|
用户 "1" -> "*" 订单 : 下单
订单 *-- 订单明细 : 包含
Serializable ..|> 用户 : 实现`,
  sequence: `actor 用户
participant 前端
participant 后端
database 数据库
用户->前端: 提交登录表单
前端->后端: POST /api/login
alt 验证成功
后端->数据库: 查询用户记录
数据库-->后端: 返回用户数据
后端-->前端: 返回Token
前端-->用户: 跳转首页
else 验证失败
后端-->前端: 返回错误信息
前端-->用户: 提示错误
end
note right of 后端: 密码经BCrypt加密验证`,
  activity: `开始 -> 填写注册信息
填写注册信息 -> {信息是否完整?}
{信息是否完整?} ->|否| 提示补全信息
提示补全信息 -> 填写注册信息
{信息是否完整?} ->|是| 验证邮箱格式
验证邮箱格式 -> {邮箱有效?}
{邮箱有效?} ->|是| 保存用户数据
{邮箱有效?} ->|否| 提示邮箱格式错误
提示邮箱格式错误 -> 填写注册信息
保存用户数据 -> 发送确认邮件
发送确认邮件 -> 结束`,
  deployment: `客户端: 浏览器,管理端Web
应用服务器: Nginx,SpringBoot
数据库服务器: MySQL主库,MySQL从库
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

export const ER_SQL_TEMPLATE = `CREATE TABLE user (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  password VARCHAR(100) NOT NULL COMMENT '密码',
  PRIMARY KEY (id)
) ENGINE=InnoDB COMMENT='用户表';

CREATE TABLE order_info (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  PRIMARY KEY (id),
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES user(id)
) ENGINE=InnoDB COMMENT='订单表';`

const AI_PROMPT_RULES = {
  class: `你是 UML 类图专家。请将用户描述转换成类图 DSL。

输出规则：
1. 每个类一行，格式：类名|属性1,属性2|方法1(),方法2()
2. 接口/抽象类用构造型前缀：<<interface>>类名|...|... 或 <<abstract>>类名|...|...
3. 属性写成 可见性+字段名:类型（如 +name:String、-id:Long），方法写成 +动词():返回类型
4. 关系单独一行，可用：A -> B（关联）、A <|-- B（泛化）、A ..|> B（实现）、A *-- B（组合）、A o-- B（聚合）、A ..> B（依赖）
5. 多重性写法：A "1" -> "*" B : 标签
6. 优先输出 4-10 个核心类，不要过度展开
7. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`,
  sequence: `你是 UML 时序图专家。请将用户描述转换成时序图 DSL。

输出规则：
1. 参与者定义格式：actor 名称、participant 名称、database 名称、control 名称、entity 名称、boundary 名称
2. 同步消息: A->B: 内容（实心箭头）；异步消息: A->>B: 内容（开放箭头）；返回: A-->B: 内容（虚线开放箭头）
3. 组合片段：alt 条件/else 条件/end、loop 条件/end、opt 条件/end、break 条件/end
4. 引用片段：ref 描述文本
5. 注释：note left of 参与者: 文本 或 note right of 参与者: 文本 或 note over 参与者: 文本
6. 按 用户 -> 前端 -> 后端 -> 数据库 的顺序组织参与者
7. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`,
  activity: `你是 UML 活动图/流程图专家。请将用户描述转换成流程图 DSL。

输出规则：
1. 主格式：节点A -> 节点B
2. 分支格式：节点A ->|条件| 节点B
3. UML标准图元：开始（实心圆）、结束（靶心圆）、{条件?} 判断菱形、===名称=== 分叉/汇合同步条
4. 其他图元：/输入输出/ 平行四边形、[(数据库)] 数据存储、[[子流程]] 子流程、((连接符))
5. 流程应尽量清晰，优先使用 6-12 个节点表达
6. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`,
  deployment: `你是 UML 部署图专家。请将用户描述转换成部署图 DSL。

输出规则：
1. 节点格式：节点名: 组件1,组件2
2. 连线格式：节点A -> 节点B : 协议或通信说明
3. 常见节点优先体现：客户端、应用服务器、数据库服务器、缓存、文件存储、第三方服务
4. 节点数量控制在 3-8 个
5. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`,
  architecture: `你是系统架构图专家。请将用户描述转换成分层架构图 DSL。

输出规则：
1. 分层格式：层名: 模块1,模块2
2. 可补充连线：模块A -> 模块B
3. 优先按 表现层/接入层 -> 业务层 -> 数据层/基础设施层 的顺序输出
4. 模块名称要简洁，避免一句话描述
5. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`,
  function_structure: `你是功能结构图专家。请将用户描述转换成功能结构图 DSL。

输出规则：
1. 父子结构格式：父模块: 子模块1,子模块2
2. 如需更深层结构，可继续为子模块定义下级：子模块: 功能1,功能2
3. 模块命名使用名词短语，避免写成长句
4. 树结构保持清晰，优先输出 2-4 层
5. 仅输出 DSL 内容，不要解释，不要加 Markdown 代码块`
  ,
  er_sql: `你是数据库建模专家。请把用户描述转换成 MySQL 建表 SQL，用于生成论文 ER 图。

输出规则：
1. 只输出 SQL，不要解释，不要加 Markdown 代码块
2. 使用 CREATE TABLE 语句，优先生成 3-8 张核心业务表
3. 每张表包含主键、必要字段、COMMENT 注释
4. 能明确的外键关系请写成 FOREIGN KEY
5. 字段名、表名用英文或下划线，注释用中文`
}

export function getDiagramAiPrompt(diagramType) {
  const basePrompt = AI_PROMPT_RULES[diagramType]
  const template = diagramType === 'er_sql' ? ER_SQL_TEMPLATE : (UML_TEMPLATES[diagramType] || '')
  return `${basePrompt}\n\n参考输出风格示例：\n${template}`
}
