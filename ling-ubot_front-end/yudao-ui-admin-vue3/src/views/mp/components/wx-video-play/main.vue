<!--
  - Copyright (C) 2018-2019
  - All rights reserved, Designed By www.joolun.com
  【微信消息 - 视频】
  芋道源码：
  ① bug 修复：
    1）joolun 的做法：使用 mediaId 从微信公众号，下载对应的 mp4 素材，从而播放内容；
      存在的问题：mediaId 有效期是 3 天，超过时间后无法播放
    2）重构后的做法：后端接收到微信公众号的视频消息后，将视频消息的 media_id 的文件内容保存到文件服务器中，这样前端可以直接使用 URL 播放。
  ② 体验优化：弹窗关闭后，自动暂停视频的播放
  ③ 新增功能：使用flv.js支持flv格式视频播放

-->
<template>
  <div @click="playVideo()">
    <!-- 提示 -->
    <div>
      <Icon icon="ep:video-play" :size="32" class="mr-5px" />
      <p class="text-sm">点击播放视频</p>
    </div>

    <!-- 弹窗播放 -->
    <el-dialog v-model="dialogVideo" title="视频播放" append-to-body @close="handleDialogClose">
      <!-- FLV格式视频使用flv.js播放 -->
      <div v-if="isFlvVideo && dialogVideo" ref="flvContainer" class="flv-video-container">
        <video
          ref="flvVideo"
          class="flv-video-player"
          controls
          autoplay
          muted
          :width="800"
          :height="450"
        ></video>
      </div>

      <!-- 其他格式视频使用video.js播放 -->
      <video-player
        v-else-if="dialogVideo"
        class="video-player vjs-big-play-centered"
        :src="props.url"
        poster=""
        crossorigin="anonymous"
        controls
        playsinline
        :volume="0.6"
        :width="800"
        :playback-rates="[0.7, 1.0, 1.5, 2.0]"
      />
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import 'video.js/dist/video-js.css'
import { VideoPlayer } from '@videojs-player/vue'
import flvjs from 'flv.js'

defineOptions({ name: 'WxVideoPlayer' })

const props = defineProps({
  url: {
    type: String,
    required: true
  }
})

const dialogVideo = ref(false)
const flvContainer = ref<HTMLDivElement>()
const flvVideo = ref<HTMLVideoElement>()
let flvPlayer: flvjs.Player | null = null

// 判断是否为FLV格式视频
const isFlvVideo = computed(() => {
  return props.url && (props.url.includes('.flv') || props.url.includes('flv'))
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
      url: props.url,
      isLive: false, // 设置为true如果是直播流
      hasAudio: true,
      hasVideo: true
    })

    // 绑定到video元素
    flvPlayer.attachMediaElement(flvVideo.value)

    // 加载视频
    flvPlayer.load()

    // 播放
    flvPlayer.play()

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

// 弹窗关闭处理
const handleDialogClose = () => {
  // 弹窗关闭后，自动暂停视频的播放
  if (isFlvVideo.value) {
    destroyFlvPlayer()
  }
}

// 播放视频
const playVideo = () => {
  dialogVideo.value = true
}

// 监听弹窗状态变化
watch(dialogVideo, (newVal) => {
  if (newVal && isFlvVideo.value) {
    // 弹窗打开且是FLV视频时，初始化播放器
    nextTick(() => {
      initFlvPlayer()
    })
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  destroyFlvPlayer()
})
</script>

<style scoped>
.flv-video-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
}

.flv-video-player {
  max-width: 100%;
  height: auto;
}

.video-player {
  margin: 0 auto;
}
</style>
