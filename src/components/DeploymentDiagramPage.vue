<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="deployment"
    page-title="论文部署图工具"
    page-icon="🖥"
    default-caption-title="系统部署图"
    hint-text="格式: 节点名: 组件1,组件2（3D立方体节点内含UML组件符号）。连线: 节点A -> 节点B : 协议（虚线+«协议»标注）。建议按 客户端→应用服务器→数据库/文件服务器 顺序输入。"
    helper-text="独立部署图页面，按依赖方向自动分层并优化连线路径"
  />
</template>
