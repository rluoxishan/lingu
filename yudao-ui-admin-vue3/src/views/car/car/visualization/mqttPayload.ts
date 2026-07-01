/**
 * 吉狮远程监控 — MQTT 控制 payload 封装
 * 依据 remote-monitor/docs/确认清单-协议与改动.md §八
 */

export type MqttControlType = '2010002' | '2010005' | '2010008'

export interface MqttControlEnvelope {
  type: MqttControlType
  data: Record<string, unknown>
}

export type DriveKey = 'W' | 'S' | 'A' | 'D'

const KEY_TO_COMMAND: Record<DriveKey, string> = {
  W: 'FORWARD',
  S: 'BACKWARD',
  A: 'LEFT',
  D: 'RIGHT'
}

let driveSeq = 1

export function resetDriveSeq(start = 1): void {
  driveSeq = start
}

export function nextDriveSeq(): number {
  return driveSeq++
}

export function buildRemoteDriveCommand(
  key: DriveKey,
  speedLevel = 2
): MqttControlEnvelope {
  const command = KEY_TO_COMMAND[key]
  const data: Record<string, unknown> = { command, seq: nextDriveSeq() }
  if (command === 'FORWARD' || command === 'BACKWARD') {
    data.speedLevel = speedLevel
  }
  return { type: '2010005', data }
}

export function buildRemoteDriveStop(): MqttControlEnvelope {
  return { type: '2010005', data: { command: 'STOP', seq: nextDriveSeq() } }
}

export function buildGearCommand(gear: string, speedLevel = 1): MqttControlEnvelope {
  switch (gear) {
    case 'R':
      return {
        type: '2010005',
        data: { command: 'BACKWARD', speedLevel, seq: nextDriveSeq() }
      }
    case 'D':
      return {
        type: '2010005',
        data: { command: 'FORWARD', speedLevel, seq: nextDriveSeq() }
      }
    case 'P':
    case 'N':
    default:
      return buildRemoteDriveStop()
  }
}

export function buildEmergencyStop(): MqttControlEnvelope {
  return { type: '2010008', data: { action: 'EMERGENCY_STOP' } }
}

export function buildEmergencyRelease(): MqttControlEnvelope {
  return { type: '2010008', data: { action: 'RELEASE' } }
}

export function buildHeadlights(level: 0 | 1 | 2 | 3): MqttControlEnvelope {
  return { type: '2010002', data: { headlights: level } }
}

export function buildTurnSignals(level: 0 | 1 | 2 | 3): MqttControlEnvelope {
  return { type: '2010002', data: { turnSignals: level } }
}

export function buildWorkAction(
  action: 'SWEEP' | 'SPRAY' | 'SUCTION' | 'DUMP',
  on: boolean
): MqttControlEnvelope {
  return {
    type: '2010002',
    data: { target: 'WORK', command: 'SET', params: { action, on } }
  }
}

export function buildWorkStopAll(): MqttControlEnvelope {
  return { type: '2010002', data: { target: 'WORK', command: 'STOP', params: {} } }
}

export function buildHorn(durationMs = 500): MqttControlEnvelope {
  return {
    type: '2010002',
    data: {
      target: 'AUDIO',
      command: 'SET',
      params: { action: 'HORN', duration: durationMs }
    }
  }
}

export type GimbalCommand =
  | 'MOVE'
  | 'MOVE_STEP'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'HOME'
  | 'SET_PRESET'
  | 'GOTO_PRESET'
  | 'STOP'

export function buildGimbalCommand(
  command: GimbalCommand,
  params: Record<string, unknown> = {}
): MqttControlEnvelope {
  return { type: '2010002', data: { target: 'GIMBAL', command, params } }
}

/** 前端 aux 按钮 label → MQTT payload */
export function buildAuxByLabel(label: string, isOn: boolean): MqttControlEnvelope | null {
  switch (label) {
    case '工作灯':
      return buildHeadlights(isOn ? 1 : 0)
    case '左转灯':
      return buildTurnSignals(isOn ? 1 : 0)
    case '右转灯':
      return buildTurnSignals(isOn ? 2 : 0)
    case '远光':
      return buildHeadlights(isOn ? 2 : 1)
    case '警示':
      return buildTurnSignals(isOn ? 3 : 0)
    case '清扫':
      return buildWorkAction('SWEEP', isOn)
    case '洒水':
      return buildWorkAction('SPRAY', isOn)
    case '吸污':
      return buildWorkAction('SUCTION', isOn)
    case '卸料':
      return buildWorkAction('DUMP', isOn)
    case '倒车':
      return isOn
        ? { type: '2010005', data: { command: 'BACKWARD', speedLevel: 1, seq: nextDriveSeq() } }
        : buildRemoteDriveStop()
    default:
      return null
  }
}

export function formatMqttPayload(envelope: MqttControlEnvelope): string {
  return JSON.stringify({ type: envelope.type, data: envelope.data })
}
