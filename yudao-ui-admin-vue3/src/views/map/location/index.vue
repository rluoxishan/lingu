<template>
  <div class="location-page">
    <div class="location-page__header">
      <h1 class="location-page__title">地图定位</h1>
    </div>
    <div class="location-page__card">
      <el-empty description="地图定位页面（本地 mock，待对接 API）" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'MapLocationIndex' })
</script>

<style lang="scss" scoped>
.location-page {
  min-height: 100%;
  padding: 0 4px 16px;
  background: #f0f2f5;

  &__header {
    padding: 16px 8px 12px;
  }

  &__title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
  }

  &__card {
    padding: 40px 24px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
  }
}
</style>
