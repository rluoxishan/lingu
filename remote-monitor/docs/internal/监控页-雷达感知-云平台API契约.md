# 监控页 · 室内雷达感知 — 云平台 API 契约（草案）

> **用途**：Hasun/云平台与前端联调室内雷达感知图。  
> **Word 确认单（发 Hasun）**：[发给Hasun-监控页雷达感知API确认单.docx](./发给Hasun-监控页雷达感知API确认单.docx)  
> **监控/反控 Word 确认单**：[发给Hasun-远程监控与控制API确认单.docx](./发给Hasun-远程监控与控制API确认单.docx)
> **重新生成 Word**：`node remote-monitor/docs/internal/scripts/generate_hasun_perception_docx.mjs`（需临时 `npm install docx`）  
> **协议依据**：《云平台-机器人通信协议-内部标准版》§6.4 1010003、§7.12 2010012、§7.10 2010010（地图）  
> **V2 关系**：远程监控/反控见《灵鱿科技远程监控与控制协议-V2.0-云平台API篇》；**本文仅覆盖室内雷达感知 HTTP/WS 桥接**。
> **前端实现**：`useMonitorHighFreq.ts`、`PerceptionApi`（默认关闭，`.env.local` 设 `VITE_MONITOR_PERCEPTION_ENABLED=true` 启用）  
> **参考样例**：`remote-monitor/地图与雷达文件/lhgk_101.{pgm,yaml,json}`  
> **最后更新**：2026-07-04

---

## 1. 数据链路

```
监控页打开（室内车，无 GPS）
  → POST /device/instructions  type=2010012  status=ON
  → 车端 dev/pub 1010003 @10Hz
  → 云平台订阅 EMQX，缓存最新帧
  → WS /device/perception/stream 推前端（或 GET latest 轮询）
  → 前端叠加 PGM 底图 + obstacles + 车位姿

监控页关闭
  → 2010012 OFF + 断开 WS
```

**1010001 / select_device_detail 不能替代 1010003**（无 obstacles、仅 1Hz）。

---

## 2. 联调方式（无独立测试环境）

我方**无单独测试环境**：在本地启动前端工程，通过 `.env` / `.env.local` 直连云平台 `admin-api` 联调。

| 项 | 说明 |
| -- | ---- |
| 前端工程 | `ling-ubot_front-end/yudao-ui-admin-vue3`，`npm run dev` |
| API 地址 | 由 `.env` 中 `VITE_BASE_URL` + `VITE_API_URL` 决定，与 Hasun 提供的 admin-api 一致 |
| 感知开关 | `.env.local` 设 `VITE_MONITOR_PERCEPTION_ENABLED=true` |
| Hasun 需确认 | Base URL、WebSocket URL 模板、联调 deviceId、mapId 绑定、坐标系 |

### 2.1 已有数据与抓包边界

浏览器 **F12 Network 只能抓到前端 ↔ admin-api** 的 HTTP/WebSocket，**抓不到** 车端 EMQX 上的 `dev/pub` / `dev/sub` 原文。

| 数据 | 现有来源 | F12 能否抓到 | 雷达感知图是否够用 |
| --- | --- | --- | --- |
| `battery` / `workStatus` / `taskId` | `GET /device/select_device_detail_by_id`、`select_device_by_page`（云平台聚合 **1010001**，约 1Hz） | ✅ 能 | 状态栏够用 |
| `position_xyz` / `heading` / `speedMps` | 同上（1010001 字段，视车端是否上报） | ✅ 能（有字段时） | 室内**慢速**车位姿可凑合；**无 obstacles** |
| 视频开/关、遥控等 | `POST /device/instructions`（**2010004** 等已在 sztu **抓包验证**） | ✅ 能 | — |
| **2010012** 高频开关 | 同 `/device/instructions`，`type=2010012` | ⚠️ **待抓包试**（路径已有，type 是否转发未知） | 开启 1010003 的前置条件 |
| 地图元数据 | 协议 **§7.10 2010010**（MQTT RPC，含 `downloadUrl`/`resolution`/`originX/Y`）；本文 **map_meta** 为前端约定的 HTTP 简化封装 | ❌ MQTT 侧浏览器看不到；若云平台已有 HTTP 地图接口，请 Hasun 告知路径 | 需 PNG/JPG 底图 URL + origin/resolution |
| `obstacles` / 10Hz 轨迹 | **1010003**（`dev/pub`，仅 **2010012 ON** 后才有） | ❌ 仅在云平台 EMQX 订阅侧 | **必须**，1010001 不含 |

**结论**

- 文档 **A** 多半只需云平台对 **已有 instructions 通道** 补支持 `type=2010012`（可先本地开监控页 + F12 看 POST 是否 `code=0`）。
- 文档 **B/C/D** 是让云平台把 **协议里已有、但前端够不着** 的数据（2010010 地图、1010003 感知）**暴露成 HTTP/WS**；不是从零发明 MQTT 载荷。
- 本地样例地图 `remote-monitor/地图与雷达文件/lhgk_101.*` 仅用于前端自测（`.env` `VITE_MONITOR_MAP_DEMO_META`），**不能代替** 云平台 map 接口。

**sztu 实测（2026-07-04）**

| 请求 | 结果 |
| --- | --- |
| `GET .../select_device_detail_by_id?id=hasun-test` | `code:0`；有 `battery`/`taskId`/`position`（近 0）；**无** `position_xyz`/`heading` |
| `GET .../map_meta?deviceId=LU2605000922` | **HTTP 404** — 接口未部署，文档 B 项待 Hasun 实现 |

---

## 3. API 一览

| # | 方法 | 路径 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| A | POST | `/device/instructions` | **路径已有**；`type=2010012` **待验证** | 开/关 1010003（同 2010004 抓包方式试） |
| B | GET | `/device/map_meta` | **HTTP 待确认/实现**（协议侧有 **2010010**） | 室内 PGM→PNG + origin/resolution |
| C | WS | `/device/perception/stream` | **待实现**（桥接 1010003） | 推送感知帧；EMQX 原文浏览器抓不到 |
| D | GET | `/device/perception/latest` | **待实现**（同上，轮询兜底） | WS 不可用时的最新一帧 |

---

## 4. A — 2010012 高频开关（经 instructions 转发）

### 请求

`POST /device/instructions`

**开启（监控页 onMounted）**

```json
{
  "deviceId": "lingu_indoor_01",
  "type": "2010012",
  "data": {
    "status": "ON",
    "sensorTypes": ["RTK", "OBSTACLE", "TRAJECTORY"],
    "frequencyHz": 10,
    "durationSec": 300,
    "keepAlivePeriods": 3,
    "heartbeatIntervalSec": 5
  }
}
```

**关闭（监控页 onUnmounted）**

```json
{
  "deviceId": "lingu_indoor_01",
  "type": "2010012",
  "data": { "status": "OFF" }
}
```

**心跳**：前端每 **5s** 重发 ON（与 `heartbeatIntervalSec` 一致）。

### sensorTypes 与 1010003 字段

| sensorTypes | 1010003 字段 | 雷达图 |
| --- | --- | --- |
| RTK | position_xyz, heading, speedMps | 车位姿（必须） |
| OBSTACLE | obstacles[] | **障碍物（必须）** |
| TRAJECTORY | trajectoryPoints[] | 规划线（建议） |
| ULTRASONIC | ultrasonicSense[] | 超声弧（可选） |

室内 MVP：**RTK + OBSTACLE + TRAJECTORY**。

### 响应

沿用现有 `{ code, data, msg }`；`code=0` 表示云平台已受理转发。

---

## 5. B — 室内地图元数据

### 请求

`GET /device/map_meta?deviceId={deviceId}&mapId={mapId?}`

- 不传 `mapId` 时，云平台按设备当前绑定地图返回。
- 可与 1010003 帧内 `mapId` 对齐。

### 响应 data 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| mapId | String | 是 | 如 `lhgk_101` |
| imageUrl | String | 是 | PNG/JPG 可访问 URL（由 PGM 转换） |
| width | Integer | 是 | 像素宽 |
| height | Integer | 是 | 像素高 |
| resolution | Number | 是 | 米/像素，如 `0.05` |
| origin | Number[3] | 是 | 图像**左下角**世界坐标 `[x,y,yaw]` |
| negate | Integer | 否 | 0=白空闲黑占用 |
| occupiedThresh | Number | 否 | 默认 0.65 |
| freeThresh | Number | 否 | 默认 0.196 |

### 响应示例

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "mapId": "lhgk_101",
    "imageUrl": "https://sztu.lingubot.cn/static/maps/lhgk_101.png",
    "width": 3153,
    "height": 944,
    "resolution": 0.05,
    "origin": [-11.0641, -37.6333, 0.0],
    "negate": 0,
    "occupiedThresh": 0.65,
    "freeThresh": 0.196
  }
}
```

### 坐标换算（前端绘制用）

```
pixelX = (worldX - origin[0]) / resolution
pixelY = height - (worldY - origin[1]) / resolution
```

---

## 6. C — 感知 WebSocket 推送

### 连接

```
wss://{host}/admin-api/device/perception/stream?deviceId={deviceId}&token={accessToken}
```

- 鉴权：Query `token` 或 Header `Authorization: Bearer {token}`（二选一，请 Hasun 确认）。
- 仅推送该 `deviceId` 的 1010003。
- 建议频率：10Hz 原始，可服务端节流至 5–10Hz。

### 下行消息格式

```json
{
  "code": 0,
  "msg": "1010003",
  "data": {
    "mapId": "lhgk_101",
    "position_xyz": "64.882,-14.310,0",
    "heading": 92.5,
    "speedMps": 0.35,
    "planType": "PLANNING",
    "trajectoryPoints": [
      { "x": 65.0, "y": -14.5, "z": 0, "heading": 1.61 }
    ],
    "obstacles": [
      {
        "id": 1,
        "type": "PEDESTRIAN",
        "polygon": [
          { "x": 68.1, "y": -12.0 },
          { "x": 68.5, "y": -12.0 },
          { "x": 68.5, "y": -11.6 },
          { "x": 68.1, "y": -11.6 }
        ],
        "heading": 1.57,
        "velocity": 1.2
      }
    ],
    "ultrasonicSense": [
      { "sensorId": 1, "distance": 150 }
    ]
  }
}
```

### data 字段（1010003 室内 MVP）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| mapId | String | 是 | 与 map_meta 一致 |
| position_xyz | String | 是 | `"x,y,z"` 或 `"x,y,yaw"`，**map 坐标系，米** |
| heading | Number | 是 | 航向角（度） |
| speedMps | Number | 否 | m/s |
| planType | String | 否 | ROUTING / PLANNING |
| trajectoryPoints | Array | 否 | 规划轨迹点 |
| obstacles | Array | **是（有感知时）** | 障碍物多边形列表 |
| ultrasonicSense | Array | 否 | 超声，distance 单位 **厘米** |

### obstacles[] 项

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | Integer | 是 | 跟踪 id |
| type | String | 是 | PEDESTRIAN / VEHICLE / STATIC / UNKNOWN |
| polygon | Array | 是 | ≥3 顶点 `{x,y}`，map 坐标 |
| heading | Number | 否 | 弧度 |
| velocity | Number | 否 | m/s |

---

## 7. D — 最新感知帧（轮询兜底）

### 请求

`GET /device/perception/latest?deviceId={deviceId}`

### 响应

与 WebSocket `data` 相同；无数据时：

```json
{ "code": 0, "data": null, "msg": "" }
```

前端 WS 连续失败 4 次后自动切轮询，间隔 **200ms**。

---

## 8. 车端 MQTT 1010003 原文（云平台解析来源）

Topic：`dev/pub/{clientId}`，QoS 0，type=`1010003`。

```json
{
  "id": 1740469352003,
  "time": 1740469352000,
  "type": "1010003",
  "data": {
    "dataType": "LOC_HIGH_FREQ",
    "persist": false,
    "mapId": "lhgk_101",
    "position_xyz": "64.882,-14.310,0",
    "heading": 92.5,
    "speedMps": 0.35,
    "trajectoryPoints": [],
    "obstacles": []
  }
}
```

云平台职责：订阅 → 解析 → 写 Redis 最新帧 → 推 WS。

---

## 9. 前端启用与文件

| 文件 | 说明 |
| --- | --- |
| `src/api/car/vehicle/perceptionTypes.ts` | 类型定义 |
| `src/api/car/vehicle/perceptionParse.ts` | 1010003 JSON 解析 |
| `src/api/car/vehicle/perception.ts` | PerceptionApi |
| `src/views/car/monitor/useMonitorHighFreq.ts` | 生命周期 + WS/轮询 |

`.env.local`：

```bash
# 虚拟 Tesla 式 2D 感知演示（不请求 map_meta / 2010012 / WS）
VITE_MONITOR_PERCEPTION_DEMO=true

# 真实联调时再开（与 DEMO 二选一）
# VITE_MONITOR_PERCEPTION_ENABLED=true
```

`useMonitorHighFreq(deviceId, enabled)` 输出：

| 输出 | 用途 |
| --- | --- |
| `obstacles` | 室内地图叠加红色多边形 |
| `trajectoryPoints` | 规划线 |
| `perceptionPose` | 10Hz 车位姿 |
| `radarGridCells` | 右侧 RadarPanel 车体坐标障碍点 |
| `mapId` | 拉 map_meta |
| `transport` | ws / poll / off |

---

## 10. 验收清单

### 云平台（Hasun）

- [ ] `POST /device/instructions` 支持 **2010012**，能转发至 EMQX `dev/sub/{clientId}`
- [ ] 订阅 `dev/pub/+`，识别 `type=1010003`
- [ ] 实现 **GET /device/map_meta**（至少 lhgk_101 一张图）
- [ ] 实现 **WS /device/perception/stream** 或 **GET /device/perception/latest**
- [ ] 确认 `position_xyz` 与 PGM `origin/resolution` **同一 map 系**
- [ ] 监控页关闭后会话结束，车端停止 1010003

### 车端

- [ ] 收到 2010012 ON 后 1010003 @10Hz
- [ ] 每帧含 mapId、position_xyz、heading、obstacles（有障碍时）
- [ ] polygon 顶点为 map 世界坐标（米）

### 前端

- [ ] 室内车（无 GPS）启用 `useMonitorHighFreq`
- [ ] PGM + obstacles 叠加（IndoorMapPanel，待实现）
- [ ] RadarPanel 显示 `radarGridCells`

---

## 11. API 字段是否够用（Tesla 式 2D 室内感知）

| 能力 | 所需字段 | 协议/API | MVP 是否够 |
|------|----------|----------|------------|
| 深色栅格底图 | mapId, imageUrl, width, height, resolution, origin | map_meta | ✅ 够 |
| 自车箭头 + 跟随 | x/y/z + yaw（或 position_xyz + heading）@10Hz | 1010003 / RTK | ✅ 够 |
| 障碍色块 | obstacles[].id, type, polygon[] | 1010003 / OBSTACLE | ✅ 够 |
| 规划线 | trajectoryPoints[] | 1010003 / TRAJECTORY | ✅ 够 |
| 右侧雷达栅格 | 同上 polygon 投影到车体坐标 | 前端推算 | ✅ 够（不需 API 新字段） |
| 超声扇形 | ultrasonicSense[].sensorId, distance（厘米） | 1010003 可选 | ⚠️ 有则更好，无则省略 |
| 障碍速度矢量 | obstacles[].velocity | 1010003 可选 | ⚠️ 可选（动画箭头，非必须） |
| 帧间平滑 | 连续 10Hz 推送 | WS / latest | ✅ 够（前端可 lerp，不需新字段） |
| 原始激光点云 | — | 无 | ❌ 不需要（不是 Tesla 式 UI） |
| 障碍置信度 / 预测框 | confidence, predictedPath | 协议暂无 | 🔶 以后要更「炫」可加，MVP 不加 |

**结论**：Hasun 按确认单实现 **map_meta + 1010003（x/y/yaw + obstacles + trajectory）** 即可做出 Demo 同等效果；**不必加新 HTTP 字段**。可选增强：`ultrasonicSense`、真实 **lhgk_101 PNG** 替换 demo SVG。

---

## 12. 关联文档

- [前端-协议字段对照-评审表.md](../前端-协议字段对照-评审表.md)
- [确认清单-协议与改动.md](../确认清单-协议与改动.md)
- [发给Hasun-API确认单.md](./发给Hasun-API确认单.md)
- 样例地图：`../地图与雷达文件/`
