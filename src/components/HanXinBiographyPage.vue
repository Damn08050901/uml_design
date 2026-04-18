<template>
  <div class="hanxin-biography-page">
    <h1>韩信生平</h1>
    <div class="content-container">
      <section class="intro">
        <h2>简介</h2>
        <p>韩信（约公元前231年－公元前196年），淮阴（今江苏省淮安市）人，西汉开国功臣、军事家，被后人奉为“兵仙”、“神帅”。</p>
        <p>韩信早年家贫，曾受胯下之辱，后投奔项梁、项羽，未得重用。转投刘邦后，经萧何力荐，被拜为大将军。他助刘邦平定三秦，击败魏、代、赵、燕、齐等国，并在垓下之战中指挥汉军击败项羽，为西汉建立立下赫赫战功。</p>
        <p>汉朝建立后，韩信先被封为楚王，后贬为淮阴侯。公元前196年，被吕后与萧何诱杀于长乐宫钟室。</p>
      </section>

      <section class="timeline">
        <h2>生平大事年表</h2>
        <ul>
          <li><strong>约公元前231年</strong>：出生于淮阴。</li>
          <li><strong>公元前209年</strong>：投奔项梁起义军。</li>
          <li><strong>公元前206年</strong>：经萧何月下追韩信，被刘邦拜为大将军。</li>
          <li><strong>公元前205年</strong>：暗度陈仓，平定三秦。</li>
          <li><strong>公元前204年</strong>：背水一战，击败赵军。</li>
          <li><strong>公元前203年</strong>：平定齐国，被封为齐王。</li>
          <li><strong>公元前202年</strong>：垓下之战，击败项羽，西汉建立。</li>
          <li><strong>公元前201年</strong>：被贬为淮阴侯。</li>
          <li><strong>公元前196年</strong>：被吕后诱杀于长乐宫钟室。</li>
        </ul>
      </section>

      <section class="military-achievements">
        <h2>主要军事成就</h2>
        <ul>
          <li><strong>暗度陈仓</strong>：还定三秦，为刘邦夺取关中根据地。</li>
          <li><strong>背水一战</strong>：井陉之战，以少胜多击败赵军。</li>
          <li><strong>半渡而击</strong>：潍水之战，击败龙且率领的楚军。</li>
          <li><strong>十面埋伏</strong>：垓下之战，围歼项羽主力。</li>
        </ul>
      </section>

      <section class="evaluation">
        <h2>历史评价</h2>
        <p>韩信是中国军事史上“谋战”派的代表人物，被萧何誉为“国士无双”。刘邦评价他：“连百万之军，战必胜，攻必取，吾不如韩信。”</p>
        <p>司马迁在《史记》中为其单独作《淮阴侯列传》，称赞其军事才能，同时也对其晚年遭遇表示同情。</p>
      </section>

      <section class="legacy">
        <h2>后世影响</h2>
        <p>韩信的军事思想与战例被历代兵家所研究，“韩信点兵，多多益善”成为民间俗语。其生平故事被改编为戏曲、小说、影视剧等多种艺术形式。</p>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HanXinBiographyPage',
  data() {
    return {
      // 可以在这里添加响应式数据，如果需要的话
    }
  }
}
</script>

<style scoped>
.hanxin-biography-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
  line-height: 1.6;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
  border-bottom: 3px solid #3498db;
  padding-bottom: 0.5rem;
}

h2 {
  color: #2980b9;
  border-left: 4px solid #3498db;
  padding-left: 0.75rem;
  margin-top: 2rem;
}

.content-container {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

section {
  margin-bottom: 2.5rem;
}

p {
  margin-bottom: 1rem;
  text-align: justify;
}

ul {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
}

strong {
  color: #2c3e50;
}

@media (max-width: 768px) {
  .hanxin-biography-page {
    padding: 1rem;
  }
  .content-container {
    padding: 1.5rem;
  }
}
</style>