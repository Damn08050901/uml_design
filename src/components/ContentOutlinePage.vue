<template>
  <div class="content-outline-page">
    <h1>内容大纲</h1>
    <p class="description">
      此页面展示项目的结构化内容大纲，帮助用户理解整体架构和功能模块。
    </p>
    
    <div class="outline-container">
      <div class="outline-section">
        <h2>📋 项目概述</h2>
        <ul>
          <li><strong>项目名称</strong>: AI 辅助图表生成工具</li>
          <li><strong>目标</strong>: 通过 AI 辅助快速生成各类图表（UML、ER、流程图等）</li>
          <li><strong>技术栈</strong>: Vue 3 + Vite + Draw.io 集成</li>
        </ul>
      </div>
      
      <div class="outline-section">
        <h2>🎯 核心功能</h2>
        <ul>
          <li><strong>AI 辅助生成</strong>: 基于自然语言描述自动生成图表</li>
          <li><strong>多图表类型</strong>: 
            <ul>
              <li>UML 类图</li>
              <li>ER 图（实体关系图）</li>
              <li>用例图</li>
              <li>序列图</li>
              <li>架构图</li>
              <li>流程图</li>
              <li>功能结构图</li>
              <li>部署图</li>
            </ul>
          </li>
          <li><strong>实时编辑</strong>: 集成 Draw.io 在线编辑器</li>
          <li><strong>导出功能</strong>: 支持 PNG、SVG、XML 格式导出</li>
          <li><strong>模板系统</strong>: 预置常用图表模板</li>
        </ul>
      </div>
      
      <div class="outline-section">
        <h2>🏗️ 系统架构</h2>
        <ul>
          <li><strong>前端</strong>: Vue 3 单页应用</li>
          <li><strong>构建工具</strong>: Vite</li>
          <li><strong>图表引擎</strong>: Draw.io (mxGraph) 集成</li>
          <li><strong>AI 集成</strong>: 通过工具函数处理自然语言到图表转换</li>
          <li><strong>状态管理</strong>: Vue 响应式系统</li>
          <li><strong>样式</strong>: CSS3 + 自定义组件样式</li>
        </ul>
      </div>
      
      <div class="outline-section">
        <h2>📁 项目结构</h2>
        <ul>
          <li><strong>src/components/</strong>: Vue 组件
            <ul>
              <li>DiagramPage.vue - 图表页面基类</li>
              <li>UmlCanvas.vue - UML 画布</li>
              <li>ErDiagram.vue - ER 图组件</li>
              <li>UseCaseDiagram.vue - 用例图组件</li>
              <li>DrawioEmbed.vue - Draw.io 嵌入组件</li>
              <li>各类型图表专用页面组件</li>
            </ul>
          </li>
          <li><strong>src/utils/</strong>: 工具函数
            <ul>
              <li>diagramAi.js - AI 图表生成逻辑</li>
              <li>umlDrawioBuilder.js - UML 图构建器</li>
              <li>erDrawioBuilder.js - ER 图构建器</li>
              <li>usecaseDrawioBuilder.js - 用例图构建器</li>
              <li>drawioExport.js - 导出功能</li>
              <li>sqlParser.js - SQL 解析器</li>
              <li>autoTranslate.js - 自动翻译工具</li>
            </ul>
          </li>
          <li><strong>src/assets/</strong>: 静态资源</li>
          <li><strong>public/</strong>: 公共文件</li>
        </ul>
      </div>
      
      <div class="outline-section">
        <h2>🚀 开发工作流</h2>
        <ul>
          <li><strong>开发</strong>: npm run dev</li>
          <li><strong>构建</strong>: npm run build</li>
          <li><strong>预览</strong>: npm run preview</li>
          <li><strong>代码规范</strong>: 遵循现有代码风格</li>
          <li><strong>版本控制</strong>: Git</li>
        </ul>
      </div>
      
      <div class="outline-section">
        <h2>📈 未来规划</h2>
        <ul>
          <li><strong>更多图表类型</strong>: 时序图、状态图等</li>
          <li><strong>协作功能</strong>: 实时协作编辑</li>
          <li><strong>AI 增强</strong>: 更智能的图表建议和优化</li>
          <li><strong>插件系统</strong>: 支持第三方图表插件</li>
          <li><strong>云存储</strong>: 图表云端保存和分享</li>
        </ul>
      </div>
    </div>
    
    <div class="navigation">
      <router-link to="/" class="nav-button">返回首页</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContentOutlinePage',
  data() {
    return {
      // 可以添加响应式数据如果需要
    }
  }
}
</script>

<style scoped>
.content-outline-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h1 {
  color: #2c3e50;
  border-bottom: 3px solid #42b983;
  padding-bottom: 0.5rem;
  margin-bottom: 2rem;
}

.description {
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.outline-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.outline-section {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.outline-section:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.outline-section h2 {
  color: #34495e;
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.outline-section ul {
  margin: 0;
  padding-left: 1.2rem;
  color: #444;
}

.outline-section li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.outline-section ul ul {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.outline-section strong {
  color: #2c3e50;
}

.navigation {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #eee;
}

.nav-button {
  display: inline-block;
  padding: 0.8rem 2rem;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition: background 0.3s ease;
}

.nav-button:hover {
  background: #3aa876;
}

@media (max-width: 768px) {
  .content-outline-page {
    padding: 1rem;
  }
  
  .outline-container {
    grid-template-columns: 1fr;
  }
}
</style>