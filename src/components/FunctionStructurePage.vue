<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="function_structure"
    page-title="论文功能结构图工具"
    page-icon="🧱"
    default-caption-title="系统功能结构图"
    hint-text="格式: 父模块: 子模块1,子模块2；如需更深层结构可继续写 子模块: 功能1,功能2，或用 A -> B 表示模块层级。排版默认按论文常见的上层模块横向分组、下层功能竖向条块展开。"
    helper-text="独立功能结构图页面，默认采用论文功能模块图的黑白分组排版"
  />
</template>
