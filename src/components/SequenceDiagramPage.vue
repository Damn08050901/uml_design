<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="sequence"
    page-title="论文时序图工具"
    page-icon="⏱"
    default-caption-title="系统时序图"
    hint-text="格式: actor/participant/database/control/entity/boundary 名称；消息写法为 A->B: 内容 或 A-->B: 返回；支持 alt/else/end 条件片段。建议按 用户-前端-控制层-业务层-数据库 顺序输入。"
    helper-text="独立时序图页面，参考在线时序图工具的左编辑右预览结构"
  />
</template>
