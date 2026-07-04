/** 灵鱿云平台通用响应：{ code, data, msg }（code=0 成功） */
export interface LinguCloudEnvelope<T = unknown> {
  code?: number
  msg?: string
  data?: T | null
}

function isCloudEnvelope(res: unknown): res is LinguCloudEnvelope {
  return (
    res !== null &&
    typeof res === 'object' &&
    'data' in res &&
    ('code' in res || 'msg' in res)
  )
}

/** 解包云平台 data 字段；已是业务体则原样返回 */
export function unwrapCloudPayload<T>(res: unknown): T | null {
  if (res == null) return null
  if (isCloudEnvelope(res)) {
    return (res.data ?? null) as T | null
  }
  return res as T
}

/** 解包分页 list；兼容 data 为数组或 { list } */
export function unwrapCloudPageList<T>(res: unknown): T[] {
  const payload = unwrapCloudPayload<{ list?: T[] } | T[]>(res)
  if (Array.isArray(payload)) return payload
  return payload?.list ?? []
}
