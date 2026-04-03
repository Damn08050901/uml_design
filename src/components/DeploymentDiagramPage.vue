<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="deployment"
    page-title="论文部署图工具"
    page-icon="🖥"
    default-caption-title="系统部署图"
    hint-text="格式: 节点名: 组件1,组件2；连线写法: 节点A -> 节点B : 协议。建议按 客户端-应用服务器-数据库服务器-文件服务器 的顺序输入。"
    helper-text="独立部署图页面，按依赖方向自动分层并优化连线路径"
  />
</template>
