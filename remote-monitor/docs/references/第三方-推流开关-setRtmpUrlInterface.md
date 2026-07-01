# 第三方推流开关接口 — 设置推流地址

> **提供方**：摄像机 **厂商** IoT 平台（接口文档截图 2024-04-11）  
> **用途**：**云平台后台** 开启/关闭摄像机推流；厂商协议为 HTTP Form-data  
> **与监控页关系**：前端 **只调云平台封装 API**；本接口由 **后台内部调用**，响应 playUrl 经云平台 **转给** 前端  
> **与 MQTT 2010004**：监控页 **不走** 2010004；2010004 仅 **第三方直连 EMQX** 时使用（对外协议 §9）  
> **传输**：WebRTC；`pushurl` 由后台分配

---

## 1. 接口概要

| 项 | 值 |
| -- | -- |
| 名称 | 设置推流地址接口 / **摄像头开启** |
| Method | **POST** |
| URL | `http://iot.krzhibo.com/index/xcx/machine/setRtmpUrlInterface` |
| Content-Type | **multipart/form-data**（Form-data） |
| 编码 | UTF-8 |

> 监控页 **不直连** 上述域名，由 **云平台后端封装** 同能力接口；前端只调云平台，拿 **播放地址** 播放。

---

## 2. 请求参数（Body · Form-data）

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| productid | string | 是 | 产品 ID |
| devicename | string | 是 | 设备名 |
| pushurl | string | 是 | WebRTC 推流地址；**须 urlencode**（后台分配） |
| status | string | 是 | `1` 开 / `0` 关 |
| Audio | int | 否 | 音频：`1` 是 / `0` 否 |
| Streams | string | 是 | `[0,1]`，多路标识（**与相机路映射待确认**） |

---

## 3. 响应与前端播放 ✅ 已确认流程

**开流（status=1）成功后，响应返回播放地址**；前端拿到 **playUrl（播放地址）** 即可启动 WebRTC 播放器，**无需再调单独拉流接口**。

```
前端 POST 云平台「开某路摄像头」
    → 云后台：分配 pushurl + 调第三方 setRtmpUrlInterface(status=1)
    → 响应：{ ..., playUrl: "<WebRTC播放地址>" }   ← 字段名待 Hasun 给示例
    → 前端：new WebRTCPlayer(playUrl)
```

| 动作 | status | 前端行为 |
| ---- | ------ | -------- |
| 开流 | `"1"` | 读响应 **playUrl**，开始播放 |
| 关流 | `"0"` | 销毁播放器；或由无观众超时自动关 |

> **待 Hasun 补充**：响应 JSON 完整示例、playUrl 字段确切名称、错误码。

---

## 4. 与 MQTT 2010004 对照

| MQTT 2010004（摄像机 · 一直有效） | 本 HTTP / 云封装 |
| ---------------------------------- | ---------------- |
| 下发对象：**独立摄像机设备**（非车辆底盘） | 第三方 IoT 摄像机平台 |
| `data.status` | `status` |
| `data.url` | `pushurl`（后台分配） |
| `data.view` | 可能对应 `Streams`（待抓包确认） |
| MQTT topic `dev/sub/{cameraClientId}` | — |
| — | **响应 playUrl** → 前端 WebRTC 播放 |

---

## 5. 关流机制

1. **主动关流**：`status=0`  
2. **无观众自动关流** ✅：推流中 **无播放超过 T 秒**（T 待确认）→ 服务自动 `status=0`  
3. **MQTT 2010004 心跳**（若并行使用，待确认）

用户离开监控页 → 播放器销毁 → 触发无观众计时 → 超时自动关推；**再次进入须重新开流拿新 playUrl**。

---

## 6. 云平台推荐调用链（吉狮监控页）

```
VideoPanel 某路需要画面
    │
    ▼
POST 云平台 /api/.../camera/open  （封装 setRtmpUrlInterface）
    │  vehicleId, cameraKey/view, status=1
    ▼
响应 { playUrl: "..." }
    │
    ▼
前端 WebRTC 播放 playUrl
```

五路同时开：每路 **独立请求** 一次开流接口，各得一个 playUrl（**待 Hasun 确认 Streams 映射**）。

---

## 7. 仍待 Hasun / 第三方确认

| # | 问题 | 优先级 |
| - | ---- | ------ |
| 1 | 响应 **playUrl 字段名** + 完整 JSON 示例 | P0 |
| 2 | `devicename` / `productid` 与 `vehicleId` 映射 | P0 |
| 3 | `Streams` 0/1 与 前/左/右/后/环视/云台 对应 | P0 |
| 4 | 无观众关流 **T = ____ 秒**；多路是否独立计时 | P1 |
| 5 | 是否仍需 MQTT 2010004，还是 **仅调 HTTP 即可**？ | ~~P1~~ | ✅ **并存**，2010004 一直有用 |
| 6 | 鉴权、错误码、测试环境 | P2 |

---

## 8. 实现注意（前端）

1. 开流：**一次 HTTP** → 取 **playUrl** → 播放。  
2. 关流：离开页面 **destroy 播放器**；可主动调关流接口，也可依赖无观众自动关。  
3. **不要缓存 playUrl 跨会话**——关流后需重新开流。  
4. 云 API 路径以芋道后台最终定义为准；第三方 URL 仅后端调用。

---

## 9. 请求示例（第三方原始接口 · 示意）

```http
POST /index/xcx/machine/setRtmpUrlInterface HTTP/1.1
Host: iot.krzhibo.com
Content-Type: multipart/form-data

productid=<产品ID>
devicename=LU2606000100
pushurl=<urlencode(WebRTC推流URL)>
status=1
Streams=0
```

**响应示例（结构待确认）：**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "playUrl": "https://stream.example.com/webrtc/play/xxxx"
  }
}
```

---

## 10. 修订记录

| 日期 | 说明 |
| ---- | ---- |
| 2026-07-01 | 初版；WebRTC + 后台分配 pushurl |
| 2026-07-01 | 无观众超时自动 status=0 |
| 2026-07-01 | 开流响应含播放地址，前端直接播放 |
