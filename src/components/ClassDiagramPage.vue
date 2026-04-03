<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="class"
    page-title="论文类图工具"
    page-icon="🏷"
    default-caption-title="系统类图"
    hint-text="格式: 类名|属性1,属性2|方法1(),方法2()。关系支持: A -> B、A --> B、A *-- B、A o-- B、A <|-- B，关系行不要写成类定义。"
    helper-text="独立类图页面，自动做框体尺寸匹配与折线连线避让"
  />
</template>
