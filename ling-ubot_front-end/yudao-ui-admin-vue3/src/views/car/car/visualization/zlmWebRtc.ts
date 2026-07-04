/** ZLMediaKit WebRTC 播放（POST offer → answer SDP） */

export interface ZlmWebRtcPlayer {
  stop: () => void
}

/** 本地 dev 走 Vite 代理，避免跨域 */
export function resolveWebRtcSignalUrl(raw: string): string {
  if (!import.meta.env.DEV) return raw
  try {
    const u = new URL(raw)
    if (u.hostname === 'sztu-video.lingubot.cn') {
      return `/zlm-webrtc${u.pathname}${u.search}`
    }
  } catch {
    // ignore
  }
  return raw
}

async function exchangeSdp(signalUrl: string, offerSdp: string, offerType: string) {
  const url = resolveWebRtcSignalUrl(signalUrl)

  // ZLMediaKit 标准：body 为纯 SDP 文本
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: offerSdp
  })

  // 部分环境接受 JSON 包装
  if (!res.ok) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: offerSdp, type: offerType })
    })
  }

  if (!res.ok) {
    throw new Error(`WebRTC 信令失败 HTTP ${res.status}`)
  }

  const answer = (await res.json()) as { code?: number; sdp?: string; type?: string; msg?: string }
  if (answer.code !== 0 || !answer.sdp) {
    throw new Error(answer.msg || 'WebRTC answer 无效')
  }
  return answer.sdp
}

function waitIceGathering(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs)
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer)
        resolve()
      }
    })
  })
}

export async function startZlmWebRtcPlay(
  signalUrl: string,
  videoEl: HTMLVideoElement
): Promise<ZlmWebRtcPlayer> {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  })

  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })

  pc.ontrack = (ev) => {
    const [stream] = ev.streams
    if (stream) {
      videoEl.srcObject = stream
      void videoEl.play().catch(() => {})
    }
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await waitIceGathering(pc)

  const sdp = pc.localDescription?.sdp ?? offer.sdp
  if (!sdp) {
    pc.close()
    throw new Error('无法生成本地 SDP')
  }

  try {
    const answerSdp = await exchangeSdp(signalUrl, sdp, offer.type)
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  } catch (e) {
    pc.close()
    throw e
  }

  return {
    stop: () => {
      pc.close()
      videoEl.srcObject = null
    }
  }
}
