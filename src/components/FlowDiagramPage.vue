<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="activity"
    page-title="论文流程图工具"
    page-icon="🔀"
    default-caption-title="系统流程图"
    hint-text="格式: 节点A -> 节点B；分支: 节点A ->|条件| 节点B。UML符号: 开始（实心圆）、结束（靶心圆）、{条件?} 判断菱形、===名称=== 分叉/汇合条。其他: /输入输出/、[(数据库)]、((连接符))、[[子流程]]。"
    helper-text="独立流程图页面，适合论文业务流程与活动流程表达"
  />
</template>
