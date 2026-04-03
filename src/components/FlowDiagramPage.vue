<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="activity"
    page-title="论文流程图工具"
    page-icon="🔀"
    default-caption-title="系统流程图"
    hint-text="格式: 节点A -> 节点B；分支写法: 节点A ->|条件| 节点B。标准符号支持: (开始)/(结束) 终止框，{条件?} 判断，/输入输出/ 平行四边形，[(数据库)] 数据存储，((连接符)) 连接点，[[子流程]] 子流程。"
    helper-text="独立流程图页面，适合论文业务流程与活动流程表达"
  />
</template>
