<template>
  <div class="simple-version">
    <h1>简单版本</h1>
    <p>这是一个更简单的版本，专注于核心功能。</p>
    <div class="features">
      <div class="feature">
        <h3>核心功能 1</h3>
        <p>基本图表展示</p>
      </div>
      <div class="feature">
        <h3>核心功能 2</h3>
        <p>简单编辑</p>
      </div>
      <div class="feature">
        <h3>核心功能 3</h3>
        <p>导出基础格式</p>
      </div>
    </div>
    <button @click="goBack">返回完整版</button>
  </div>
</template>

<script>
export default {
  name: 'SimpleVersion',
  methods: {
    goBack() {
      this.$router.push('/');
    }
  }
}
</script>

<style scoped>
.simple-version {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

h1 {
  color: #42b983;
  margin-bottom: 1rem;
}

.features {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  margin: 2rem 0;
}

.feature {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem;
  flex: 1;
  min-width: 200px;
}

button {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #33a06f;
}
</style>