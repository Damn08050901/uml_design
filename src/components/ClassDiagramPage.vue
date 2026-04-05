<script setup>
import DiagramPage from './DiagramPage.vue'
</script>

<template>
  <DiagramPage
    diagram-type="class"
    page-title="论文类图工具"
    page-icon="🏷"
    default-caption-title="系统类图"
    hint-text="格式: 类名|属性1,属性2|方法1(),方法2()。构造型: <<interface>>类名|...|...。关系: A -> B（关联）、A <|-- B（泛化）、A ..|> B（实现）、A *-- B（组合）、A o-- B（聚合）、A ..> B（依赖）。多重性: A &quot;1&quot; -> &quot;*&quot; B : 标签。"
    helper-text="独立类图页面，自动做框体尺寸匹配与折线连线避让"
  />
</template>
