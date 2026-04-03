<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="architecture"
    page-title="论文架构图工具"
    page-icon="🏗"
    default-caption-title="系统架构图"
    hint-text="格式: 分层名: 模块1,模块2；可选补充连线: 模块A -> 模块B。建议按 表现层-业务层-数据层 自上而下输入。"
    helper-text="独立架构图页面，适合论文总体架构与分层设计说明"
  />
</template>
