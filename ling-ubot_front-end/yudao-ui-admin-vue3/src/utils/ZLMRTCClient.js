/**
 * ZLMRTCClient.js - WebRTC 客户端库
 * 基于 ZLMediaKit 官方实现优化
 * 参考: https://github.com/ZLMediaKit/ZLMRTCClient.js
 */

// 事件常量定义 - 参考官方 Events 枚举
const Events = {
  WEBRTC_ON_REMOTE_STREAMS: 'onremotestreams',
  WEBRTC_ON_LOCAL_STREAM: 'onlocalstream',
  WEBRTC_ON_CONNECTION_STATE_CHANGE: 'onconnectionstatechange',
  WEBRTC_ICE_CANDIDATE_ERROR: 'onicecandidateerror',
  WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED: 'onofferanswserexchangefailed',
  WEBRTC_ON_DATA_CHANNEL_OPEN: 'ondatachannelopen',
  WEBRTC_ON_DATA_CHANNEL_MSG: 'ondatachannelmsg',
  WEBRTC_ON_DATA_CHANNEL_ERR: 'ondatachannelerr',
  WEBRTC_ON_DATA_CHANNEL_CLOSE: 'ondatachannelclose'
}

// 连接状态常量
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  FAILED: 'failed',
  CLOSED: 'closed'
}

class ZLMRTCClient {
  constructor(options = {}) {
    // 合并默认配置和用户配置
    this.options = {
      // 视频元素
      element: null,
      // ZLMediaKit SDP URL
      zlmsdpUrl: '',
      // ICE 服务器配置
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      // 心跳和超时设置
      heartbeatInterval: 15000,
      connectionTimeout: 30000,
      // 调试模式
      debug: false,
      // 联播模式
      simulcast: false,
      // 是否使用摄像头（推流模式）
      useCamera: false,
      // 音视频开关
      audioEnable: true,
      videoEnable: true,
      // 仅接收模式
      recvOnly: true,
      // 分辨率设置
      resolution: { w: 0, h: 0 },
      // 数据通道
      usedatachannel: false,
      // 低延迟优化
      lowLatency: true,
      ...options
    }

    // RTCPeerConnection 实例
    this.pc = null
    // 视频元素引用
    this.videoElement = this.options.element || null
    // 事件监听器存储
    this.eventListeners = {}
    // 连接状态
    this.connectionState = ConnectionState.DISCONNECTED
    // 质量评分
    this.qualityScore = 0
    // 统计信息
    this.stats = null
    // 心跳定时器
    this.heartbeatTimer = null
    // 连接超时定时器
    this.connectionTimer = null
    // 销毁标志
    this.isDestroyed = false
    // 数据通道
    this.dataChannel = null
    // 远程流
    this.remoteStream = null
  }

  // 设置视频元素
  setVideoElement(element) {
    this.videoElement = element
  }

  // 事件监听器方法 - 参考官方 API
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(callback)
    return this
  }

  // 移除事件监听器
  off(event, callback) {
    if (!this.eventListeners[event]) return this
    if (!callback) {
      delete this.eventListeners[event]
    } else {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback)
    }
    return this
  }

  // 触发事件
  emit(event, data) {
    if (!this.eventListeners[event]) return
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`事件 ${event} 的回调执行失败:`, error)
      }
    })
  }

  // 兼容旧版 API - 设置回调函数
  setCallbacks(callbacks) {
    // 映射旧的回调到新的事件系统
    if (callbacks.onStateChange) {
      this.on(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, callbacks.onStateChange)
    }
    if (callbacks.onError) {
      this.on(Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, callbacks.onError)
      this.on(Events.WEBRTC_ICE_CANDIDATE_ERROR, callbacks.onError)
    }
    if (callbacks.onTrack) {
      this.on(Events.WEBRTC_ON_REMOTE_STREAMS, callbacks.onTrack)
    }
    if (callbacks.onDataChannelMessage) {
      this.on(Events.WEBRTC_ON_DATA_CHANNEL_MSG, callbacks.onDataChannelMessage)
    }
  }

  // 官方 API - 播放流
  async play(streamUrl) {
    const url = streamUrl || this.options.zlmsdpUrl
    if (!url) {
      throw new Error('流地址不能为空，请设置 zlmsdpUrl 或传入 streamUrl 参数')
    }
    return this.connect(url)
  }

  // 连接到 WebRTC 流（保留原方法，内部实现）
  async connect(streamUrl) {
    if (!streamUrl) {
      throw new Error('流地址不能为空')
    }

    if (!this.videoElement) {
      throw new Error('视频元素未设置')
    }

    // 验证URL格式
    try {
      const url = new URL(streamUrl)

      // 检查是否是WebRTC播放URL
      if (!streamUrl.includes('/webrtc') && !streamUrl.includes('type=play')) {
        console.warn('⚠️ URL可能不是WebRTC播放地址，请确认URL格式正确')
      }

      // 输出调试信息
      if (this.options.debug) {
        console.log('📺 准备连接视频流')
        console.log('🔗 URL:', streamUrl)
        console.log('🏠 Host:', url.host)
        console.log('📍 Path:', url.pathname)
        console.log('🔍 Params:', url.search)
      }
    } catch (e) {
      throw new Error('流地址格式不正确: ' + streamUrl)
    }

    try {
      this.connectionState = ConnectionState.CONNECTING
      this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
        state: ConnectionState.CONNECTING
      })

      // 创建 RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: this.options.iceServers,
        // 优化配置：降低延迟，提高性能
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        // 启用统一计划（Unified Plan）以获得更好的性能
        sdpSemantics: 'unified-plan',
        // 多实例优化：设置ICE传输策略
        iceTransportPolicy: 'all', // 允许使用所有候选者
        // 资源优化：启用RTCP多路复用
        rtcpMuxPolicy: 'require'
      })

      // 设置事件监听
      this.setupPeerConnectionEvents()

      // 开始连接
      await this.startConnection(streamUrl)

    } catch (error) {
      this.connectionState = ConnectionState.FAILED
      this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
        state: ConnectionState.FAILED
      })
      this.emit(Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, { error })
      throw error
    }
  }

  // 开始连接
  async startConnection(streamUrl) {
    try {
      // 创建 offer
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: this.options.audioEnable,
        offerToReceiveVideo: this.options.videoEnable,
        // 优化：禁用音频处理以降低延迟
        voiceActivityDetection: false
      })

      await this.pc.setLocalDescription(offer)

      // 发送 SDP 到服务器
      const response = await this.sendSDPToServer(streamUrl, offer)

      if (response.sdp) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(response.sdp))
      } else {
        throw new Error('服务器响应中没有 SDP')
      }

      // 设置连接超时
      this.setConnectionTimeout()

      // 开始心跳检测
      this.startHeartbeat()

    } catch (error) {
      this.connectionState = ConnectionState.FAILED
      this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
        state: ConnectionState.FAILED
      })
      this.emit(Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, { error })
      throw error
    }
  }

  // 发送 SDP 到服务器
  async sendSDPToServer(streamUrl, offer) {
    try {
      // ZLMediaKit 需要的格式：将 offer.sdp 作为纯文本发送
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: offer.sdp  // 直接发送 SDP 文本，不是 JSON
      })

      if (!response.ok) {
        throw new Error(`服务器响应错误 (HTTP ${response.status})`)
      }

      // ZLMediaKit 返回的是 JSON 格式，包含 sdp、code 等字段
      const result = await response.json()

      // 检查返回结果
      if (result.code !== undefined && result.code !== 0) {
        // 根据错误类型提供更友好的提示
        let errorMsg = result.msg || '服务器返回错误'

        if (errorMsg.toLowerCase().includes('stream not found') || errorMsg.includes('流不存在')) {
          errorMsg = '视频流不存在，请检查：\n1. 设备是否在线\n2. 摄像头是否正常工作\n3. 是否已开启视频推流'
        } else if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
          errorMsg = '连接超时，请检查网络连接'
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('权限')) {
          errorMsg = '没有访问权限，请检查认证信息'
        }

        throw new Error(errorMsg)
      }

      // 返回 answer SDP
      return {
        sdp: {
          type: 'answer',
          sdp: result.sdp
        }
      }
    } catch (error) {
      // 如果错误已经是我们格式化过的，直接抛出
      if (error.message.includes('视频流不存在') ||
        error.message.includes('连接超时') ||
        error.message.includes('没有访问权限')) {
        throw error
      }

      // 网络错误的友好提示
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('网络连接失败，请检查：\n1. 网络是否正常\n2. 服务器地址是否正确\n3. 是否存在跨域问题')
      }

      throw new Error(`发送 SDP 失败: ${error.message}`)
    }
  }

  // 设置 PeerConnection 事件
  setupPeerConnectionEvents() {
    if (!this.pc) return

    // 优化：为接收器设置低延迟参数
    try {
      const receivers = this.pc.getReceivers()
      receivers.forEach(receiver => {
        if (receiver.track && receiver.track.kind === 'video') {
          // 尝试设置 jitterBufferTarget 以降低延迟
          if (receiver.jitterBufferTarget !== undefined) {
            receiver.jitterBufferTarget = 0
          }
        }
      })
    } catch (err) {
      console.warn('设置接收器参数失败:', err)
    }

    // ICE 候选
    this.pc.onicecandidate = (event) => {
      // ICE 候选事件
    }

    // ICE 连接状态变化
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState
      if (this.options.debug) {
        console.log('🔌 ICE 连接状态:', state)
      }

      switch (state) {
        case 'connected':
        case 'completed':
          this.connectionState = ConnectionState.CONNECTED
          this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
            state: ConnectionState.CONNECTED,
            iceState: state
          })
          this.clearConnectionTimeout()
          break
        case 'failed':
          this.connectionState = ConnectionState.FAILED
          this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
            state: ConnectionState.FAILED,
            iceState: state
          })
          this.emit(Events.WEBRTC_ICE_CANDIDATE_ERROR, {
            error: new Error('ICE 连接失败')
          })
          break
        case 'disconnected':
          this.connectionState = ConnectionState.DISCONNECTED
          this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
            state: ConnectionState.DISCONNECTED,
            iceState: state
          })
          break
      }
    }

    // 接收远程流
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0]

        // 优化：配置视频轨道以获得更低延迟
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          // 尝试设置更低的延迟配置
          try {
            if (typeof videoTrack.applyConstraints === 'function') {
              videoTrack.applyConstraints({
                // 优先考虑低延迟而非高质量
                latency: { ideal: 0 },
                // 禁用回声消除等处理以减少延迟
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
              }).catch(err => {
                console.warn('应用视频轨道约束失败:', err)
              })
            }
          } catch (err) {
            console.warn('配置视频轨道失败:', err)
          }
        }

        // 优化：为这个特定的接收器设置低延迟参数
        try {
          if (event.receiver && event.receiver.jitterBufferTarget !== undefined) {
            event.receiver.jitterBufferTarget = 0
          }
        } catch (err) {
          console.warn('设置接收器抖动缓冲失败:', err)
        }

        // 保存远程流引用
        this.remoteStream = stream

        if (this.videoElement) {
          this.videoElement.srcObject = stream
        }

        // 触发远程流事件
        this.emit(Events.WEBRTC_ON_REMOTE_STREAMS, {
          streams: [stream],
          stream: stream
        })
      }
    }

    // 数据通道消息
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel

      this.dataChannel.onopen = () => {
        if (this.options.debug) {
          console.log('📡 数据通道已打开')
        }
        this.emit(Events.WEBRTC_ON_DATA_CHANNEL_OPEN, {
          channel: this.dataChannel
        })
      }

      this.dataChannel.onmessage = (event) => {
        if (this.options.debug) {
          console.log('📨 收到数据通道消息:', event.data)
        }
        this.emit(Events.WEBRTC_ON_DATA_CHANNEL_MSG, {
          data: event.data
        })
      }

      this.dataChannel.onerror = (error) => {
        console.error('❌ 数据通道错误:', error)
        this.emit(Events.WEBRTC_ON_DATA_CHANNEL_ERR, {
          error
        })
      }

      this.dataChannel.onclose = () => {
        if (this.options.debug) {
          console.log('🔴 数据通道已关闭')
        }
        this.emit(Events.WEBRTC_ON_DATA_CHANNEL_CLOSE, {})
      }
    }
  }

  // 设置连接超时
  setConnectionTimeout() {
    this.connectionTimer = setTimeout(() => {
      if (this.connectionState === ConnectionState.CONNECTING) {
        this.connectionState = ConnectionState.FAILED
        this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
          state: ConnectionState.FAILED
        })
        this.emit(Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, {
          error: new Error('连接超时')
        })
      }
    }, this.options.connectionTimeout)
  }

  // 清除连接超时
  clearConnectionTimeout() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  // 开始心跳检测
  startHeartbeat() {
    // 多实例优化：减少统计信息更新频率
    const statsUpdateInterval = Math.max(this.options.heartbeatInterval, 30000) // 最少30秒

    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED && this.pc) {
        // 检查连接状态
        if (this.pc.iceConnectionState === 'disconnected' || this.pc.iceConnectionState === 'failed') {
          if (this.options.debug) {
            console.warn('心跳检测到连接异常:', this.pc.iceConnectionState)
          }
        }
        // 定期更新统计信息（降低频率）
        this.updateStats()
        this.calculateQualityScore()
      }
    }, statsUpdateInterval)
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 更新统计信息
  async updateStats() {
    if (!this.pc) return

    try {
      const stats = await this.pc.getStats()
      this.stats = stats
    } catch (error) {
      // 获取统计信息失败
    }
  }

  // 计算质量分数
  calculateQualityScore() {
    if (!this.stats) return

    let score = 0
    let count = 0

    this.stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
          const lossRate = report.packetsLost / (report.packetsLost + report.packetsReceived)
          score += Math.max(0, 100 - lossRate * 100)
          count++
        }
      }
    })

    if (count > 0) {
      this.qualityScore = score / count
    }
  }

  // 发送数据通道消息
  sendMessage(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data)
        this.dataChannel.send(message)
        return true
      } catch (error) {
        console.error('发送数据通道消息失败:', error)
        this.emit(Events.WEBRTC_ON_DATA_CHANNEL_ERR, { error })
        return false
      }
    } else {
      console.warn('数据通道未打开，无法发送消息')
      return false
    }
  }

  // 获取统计信息
  async getStats() {
    await this.updateStats()
    return this.stats
  }

  // 获取质量分数
  getQualityScore() {
    return this.qualityScore
  }

  // 官方 API - 关闭连接
  close() {
    return this.disconnect()
  }

  // 断开连接
  async disconnect() {
    if (this.options.debug) {
      console.log('🔴 断开连接...')
    }

    // 停止心跳检测
    this.stopHeartbeat()

    // 清除连接超时定时器
    this.clearConnectionTimeout()

    // 关闭数据通道
    if (this.dataChannel) {
      try {
        this.dataChannel.close()
      } catch (error) {
        console.warn('关闭数据通道失败:', error)
      }
      this.dataChannel = null
    }

    // 关闭 RTCPeerConnection
    if (this.pc) {
      // 移除所有事件监听器
      this.pc.onicecandidate = null
      this.pc.oniceconnectionstatechange = null
      this.pc.ontrack = null
      this.pc.ondatachannel = null

      // 关闭连接
      try {
        this.pc.close()
      } catch (error) {
        console.warn('关闭 PeerConnection 失败:', error)
      }
      this.pc = null
    }

    // 清除视频元素的流
    if (this.videoElement && this.videoElement.srcObject) {
      try {
        const stream = this.videoElement.srcObject
        stream.getTracks().forEach(track => track.stop())
        this.videoElement.srcObject = null
      } catch (error) {
        console.warn('清除视频流失败:', error)
      }
    }

    // 清除远程流
    if (this.remoteStream) {
      try {
        this.remoteStream.getTracks().forEach(track => track.stop())
      } catch (error) {
        console.warn('停止远程流失败:', error)
      }
      this.remoteStream = null
    }

    // 重置状态
    this.connectionState = ConnectionState.DISCONNECTED
    this.qualityScore = 0
    this.stats = null

    this.emit(Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, {
      state: ConnectionState.DISCONNECTED
    })
  }

  // 销毁客户端
  async destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true

    if (this.options.debug) {
      console.log('💥 销毁客户端...')
    }

    // 断开连接
    await this.disconnect()

    // 清除所有事件监听器
    this.eventListeners = {}

    // 清除视频元素引用
    this.videoElement = null
  }

  // 获取当前连接状态
  getConnectionState() {
    return this.connectionState
  }

  // 检查是否已连接
  isConnected() {
    return this.connectionState === ConnectionState.CONNECTED
  }

  // 获取远程流
  getRemoteStream() {
    return this.remoteStream
  }

  // 获取配置选项
  getOptions() {
    return { ...this.options }
  }
}

// 导出类和常量 - 兼容官方 API 结构
export default ZLMRTCClient

// 导出事件常量
export { Events, ConnectionState }

// 兼容官方 Endpoint 别名
export const Endpoint = ZLMRTCClient
