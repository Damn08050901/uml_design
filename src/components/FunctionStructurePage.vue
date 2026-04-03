<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="function_structure"
    page-title="论文功能结构图工具"
    page-icon="🧱"
    default-caption-title="系统功能结构图"
    hint-text="格式: 父模块: 子模块1,子模块2；如需更深层结构可继续写 子模块: 功能1,功能2，或用 A -> B 表示模块层级。排版默认按父子树居中展开。"
    helper-text="独立功能结构图页面，参考功能模块图工具的树状排版方式"
  />
</template>
