<template>
  <div class="w-full" :style="{ height: `${property.style.height}px` }">
    <el-image class="w-full w-full" :src="property.posterUrl" v-if="property.posterUrl" />

    <!-- FLV格式视频使用flv.js播放 -->
    <div v-else-if="isFlvVideo" ref="flvContainer" class="flv-video-container">
      <video
        ref="flvVideo"
        class="w-full w-full flv-video-player"
        :poster="property.posterUrl"
        :autoplay="property.autoplay"
        controls
        muted
      ></video>
    </div>

    <!-- 其他格式视频使用原生video标签播放 -->
    <video
      v-else
      class="w-full w-full"
      :src="property.videoUrl"
      :poster="property.posterUrl"
      :autoplay="property.autoplay"
      controls
    ></video>
  </div>
</template>

<script setup lang="ts">
import { VideoPlayerProperty } from './config'
import flvjs from 'flv.js'

/** 视频播放 */
defineOptions({ name: 'VideoPlayer' })

const props = defineProps<{ property: VideoPlayerProperty }>()

const flvContainer = ref<HTMLDivElement>()
const flvVideo = ref<HTMLVideoElement>()
let flvPlayer: flvjs.Player | null = null

// 判断是否为FLV格式视频
const isFlvVideo = computed(() => {
  return (
    props.property.videoUrl &&
    (props.property.videoUrl.includes('.flv') || props.property.videoUrl.includes('flv'))
  )
})

// 初始化FLV播放器
const initFlvPlayer = () => {
  if (!flvjs.isSupported()) {
    console.error('浏览器不支持FLV播放')
    return
  }

  if (!flvVideo.value) {
    console.error('视频元素不存在')
    return
  }

  try {
    // 销毁之前的播放器
    destroyFlvPlayer()

    // 创建新的FLV播放器
    flvPlayer = flvjs.createPlayer({
      type: 'flv',
      url: props.property.videoUrl,
      isLive: false, // 设置为true如果是直播流
      hasAudio: true,
      hasVideo: true
    })

    // 绑定到video元素
    flvPlayer.attachMediaElement(flvVideo.value)

    // 加载视频
    flvPlayer.load()

    // 如果设置了自动播放，则开始播放
    if (props.property.autoplay) {
      flvPlayer.play()
    }

    // 事件监听
    flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
      console.log('FLV视频加载完成')
    })

    flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail) => {
      console.error('FLV播放错误:', errorType, errorDetail)
    })
  } catch (error) {
    console.error('初始化FLV播放器失败:', error)
  }
}

// 销毁FLV播放器
const destroyFlvPlayer = () => {
  if (flvPlayer) {
    flvPlayer.pause()
    flvPlayer.unload()
    flvPlayer.detachMediaElement()
    flvPlayer.destroy()
    flvPlayer = null
  }
}

// 监听视频URL变化
watch(
  () => props.property.videoUrl,
  (newUrl) => {
    if (newUrl && isFlvVideo.value) {
      nextTick(() => {
        initFlvPlayer()
      })
    } else {
      destroyFlvPlayer()
    }
  }
)

// 组件卸载时清理资源
onUnmounted(() => {
  destroyFlvPlayer()
})
</script>

<style scoped lang="scss">
/* 图片 */
img {
  display: block;
  width: 100%;
  height: 100%;
}

.flv-video-container {
  width: 100%;
  height: 100%;
  background-color: #000;
}

.flv-video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
