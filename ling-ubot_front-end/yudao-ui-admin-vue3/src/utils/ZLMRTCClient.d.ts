/**
 * ZLMRTCClient TypeScript 类型定义
 */

// 事件常量
export declare const Events: {
  WEBRTC_ON_REMOTE_STREAMS: 'onremotestreams'
  WEBRTC_ON_LOCAL_STREAM: 'onlocalstream'
  WEBRTC_ON_CONNECTION_STATE_CHANGE: 'onconnectionstatechange'
  WEBRTC_ICE_CANDIDATE_ERROR: 'onicecandidateerror'
  WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED: 'onofferanswserexchangefailed'
  WEBRTC_ON_DATA_CHANNEL_OPEN: 'ondatachannelopen'
  WEBRTC_ON_DATA_CHANNEL_MSG: 'ondatachannelmsg'
  WEBRTC_ON_DATA_CHANNEL_ERR: 'ondatachannelerr'
  WEBRTC_ON_DATA_CHANNEL_CLOSE: 'ondatachannelclose'
}

// 连接状态常量
export declare const ConnectionState: {
  DISCONNECTED: 'disconnected'
  CONNECTING: 'connecting'
  CONNECTED: 'connected'
  FAILED: 'failed'
  CLOSED: 'closed'
}

// 连接状态类型
export type ConnectionStateType =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'closed'

// 事件类型映射
export interface EventDataMap {
  [Events.WEBRTC_ON_REMOTE_STREAMS]: {
    streams: MediaStream[]
    stream: MediaStream
  }
  [Events.WEBRTC_ON_LOCAL_STREAM]: {
    stream: MediaStream
  }
  [Events.WEBRTC_ON_CONNECTION_STATE_CHANGE]: {
    state: ConnectionStateType
    iceState?: RTCIceConnectionState
  }
  [Events.WEBRTC_ICE_CANDIDATE_ERROR]: {
    error: Error
  }
  [Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED]: {
    error: Error
  }
  [Events.WEBRTC_ON_DATA_CHANNEL_OPEN]: {
    channel: RTCDataChannel
  }
  [Events.WEBRTC_ON_DATA_CHANNEL_MSG]: {
    data: string | ArrayBuffer
  }
  [Events.WEBRTC_ON_DATA_CHANNEL_ERR]: {
    error: Error | Event
  }
  [Events.WEBRTC_ON_DATA_CHANNEL_CLOSE]: Record<string, never>
}

// ZLMRTCClient 配置选项
export interface ZLMRTCClientOptions {
  /** 视频元素 */
  element?: HTMLVideoElement | null
  /** ZLMediaKit SDP URL */
  zlmsdpUrl?: string
  /** ICE 服务器配置 */
  iceServers?: RTCIceServer[]
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number
  /** 连接超时（毫秒） */
  connectionTimeout?: number
  /** 调试模式 */
  debug?: boolean
  /** 联播模式 */
  simulcast?: boolean
  /** 是否使用摄像头（推流模式） */
  useCamera?: boolean
  /** 音频开关 */
  audioEnable?: boolean
  /** 视频开关 */
  videoEnable?: boolean
  /** 仅接收模式 */
  recvOnly?: boolean
  /** 分辨率设置 */
  resolution?: { w: number; h: number }
  /** 数据通道 */
  usedatachannel?: boolean
  /** 低延迟优化 */
  lowLatency?: boolean
}

// 回调函数类型（兼容旧版）
export interface ZLMRTCClientCallbacks {
  onStateChange?: (data: EventDataMap[typeof Events.WEBRTC_ON_CONNECTION_STATE_CHANGE]) => void
  onError?: (data: { error: Error }) => void
  onTrack?: (data: EventDataMap[typeof Events.WEBRTC_ON_REMOTE_STREAMS]) => void
  onDataChannelMessage?: (data: EventDataMap[typeof Events.WEBRTC_ON_DATA_CHANNEL_MSG]) => void
}

// ZLMRTCClient 主类
export default class ZLMRTCClient {
  constructor(options?: ZLMRTCClientOptions)

  // 基础属性
  options: Required<ZLMRTCClientOptions>
  pc: RTCPeerConnection | null
  videoElement: HTMLVideoElement | null
  connectionState: ConnectionStateType
  qualityScore: number
  stats: RTCStatsReport | null
  isDestroyed: boolean
  dataChannel: RTCDataChannel | null
  remoteStream: MediaStream | null

  // 方法
  /** 设置视频元素 */
  setVideoElement(element: HTMLVideoElement): void

  /** 添加事件监听器 */
  on<K extends keyof EventDataMap>(
    event: K,
    callback: (data: EventDataMap[K]) => void
  ): this

  /** 移除事件监听器 */
  off<K extends keyof EventDataMap>(
    event: K,
    callback?: (data: EventDataMap[K]) => void
  ): this

  /** 触发事件 */
  emit<K extends keyof EventDataMap>(event: K, data: EventDataMap[K]): void

  /** 设置回调函数（兼容旧版） */
  setCallbacks(callbacks: ZLMRTCClientCallbacks): void

  /** 播放流 */
  play(streamUrl?: string): Promise<void>

  /** 连接到 WebRTC 流 */
  connect(streamUrl: string): Promise<void>

  /** 关闭连接 */
  close(): Promise<void>

  /** 断开连接 */
  disconnect(): Promise<void>

  /** 销毁客户端 */
  destroy(): Promise<void>

  /** 发送数据通道消息 */
  sendMessage(data: string | object): boolean

  /** 获取统计信息 */
  getStats(): Promise<RTCStatsReport | null>

  /** 获取质量分数 */
  getQualityScore(): number

  /** 获取当前连接状态 */
  getConnectionState(): ConnectionStateType

  /** 检查是否已连接 */
  isConnected(): boolean

  /** 获取远程流 */
  getRemoteStream(): MediaStream | null

  /** 获取配置选项 */
  getOptions(): ZLMRTCClientOptions
}

// 导出别名（兼容官方 API）
export { ZLMRTCClient as Endpoint }

