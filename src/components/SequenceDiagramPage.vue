<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="sequence"
    page-title="论文时序图工具"
    page-icon="⏱"
    default-caption-title="系统时序图"
    hint-text="参与者: actor/participant/database/control/entity/boundary 名称。消息: A->B: 同步、A->>B: 异步、A-->B: 返回。片段: alt/else/end、loop/end、opt/end、break/end、ref 文本。注释: note left of/right of/over 参与者: 文本。"
    helper-text="独立时序图页面，参考在线时序图工具的左编辑右预览结构"
  />
</template>
