<template>
  <Dialog v-model="visible" title="选择地址" width="50%">
    <div ref="mapBox" id="mapBox" style="width:100%;height:200px;"></div>
  </Dialog>
</template>
<script lang="ts" setup>
const visible = ref(false)
import { loadAMap } from '@/utils/amap-loader'
const mapBox = ref<HTMLElement | null>(null);
let AMap, map, searchText = '深圳市宝安区新安街道庭威产业园';
defineOptions({ name: 'PositionDialog' })

const open = () => {
  visible.value = true
  initMap()
}

const closeDialog = () => {
  map?.destroy()
  visible.value = false
}

const initMap = async () => {
  AMap = await loadAMap();
  map = new AMap.Map(mapBox.value);
  AMap.plugin('AMap.Geocoder', function () {
    var geocoder = new AMap.Geocoder({
      // city 指定进行编码查询的城市，支持传入城市名、adcode 和 citycode
      city: '010'
    })

    geocoder.getLocation(searchText, function (status, result) {
      if (status === 'complete' && result.info === 'OK') {
        // result中对应详细地理坐标信息
      }
    })
  })
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

</script>
