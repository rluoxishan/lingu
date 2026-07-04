# 云平台远程监控与控制 API — 确认单

> 请 Hasun/云平台填写。Word 确认单：**[发给Hasun-远程监控与控制API确认单.docx](./发给Hasun-远程监控与控制API确认单.docx)**  
> 重新生成：`node remote-monitor/docs/internal/scripts/generate_hasun_monitor_docx.mjs`  
> 正式协议正文：[灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md](../灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md)  
> **不含室内雷达**：雷达见 [发给Hasun-监控页雷达感知API确认单.docx](./发给Hasun-监控页雷达感知API确认单.docx)

---

## 转发话术（复制发微信）

**版本 A — 简短**

```
Hasun 你好，远程监控 V2 云平台 API 我们在 sztu 上抓包验证了开流/关流，整理了一份确认单请你帮忙填几项：

已验证（hasun-test）：
· 开流 POST /device/instructions，type=2010004，status=1 + view 1~4，返回 url/info/name
· 关流 status=0 + cameraName（来自开流 name）
· WebRTC 对 url POST 换 SDP 可播放

还需你确认：
1. view=5 环视什么时候上？有环视的车 deviceId 是哪些？响应 info/name 格式？
2. 无环视时 view=5 返回空 data[] 还是报错？
3. 关流后响应 status 仍为 1 是什么意思？
4. 无观众自动关流 T 秒是多少？
5. 2010002/2010008 云 API 只受理还是同步返回车端 reply？
6. M1 联调用哪个 vehicleId？deviceId 和 MQTT clientId 怎么对应？

详细表格见附件：发给Hasun-API确认单.md
```

**版本 B — 只催 P0（五路未上时）**

```
Hasun，前/右/后/左四路视频 API 已在 sztu 验证通过。第五路环视 view=5 云平台还没上，我们没法抓包。

请帮忙确认：
① view=5 上线计划 + 哪些车有环视
② 上线后 info 字段是「环视」还是别的
③ 无环视硬件时返回什么

关流和控制的几个问题也写在确认单里了，有空帮填一下，谢谢。
```

---

## 1. 环境

| 项 | 填写 |
| -- | ---- |
| 测试环境 Base URL | `https://sztu.lingubot.cn/admin-api` |
| 测试账号 | |
| M1 vehicleId | `hasun-test`（测试） |
| vehicleId 与 MQTT clientId 映射 | |

---

## 2. 开摄像头 API ✅ 已确认（2026-07-03 抓包）

| 项 | 填写 |
| -- | ---- |
| 路径 | `POST /device/instructions` |
| type | `2010004` |
| 请求 Body | `{ "deviceId": "...", "type": "2010004", "data": { "status": 1, "view": N } }` |
| view | 1=前，2=右，3=后，4=左，5=环视 |
| 一次请求返回 | **单路**（0 或 1 条 data）；五路监控需对 view 1–5 分别请求 |
| 播放字段名 | **`url`**（非 playUrl） |
| WebRTC 信令 | POST 各路 `url` → ZLM answer SDP |

**五路开流 JSON 对照（sztu · hasun-test）**

| view | info | name（实测） | 状态 |
| ---- | ---- | ------------ | ---- |
| 1 前 | 前 | KRIPC_93002871_100 | ✅ 已抓包 |
| 2 右 | 右 | KRIPC_93003115_86 | ✅ 已抓包 |
| 3 后 | 后 | KRIPC_93003115_60 | ✅ 已抓包 |
| 4 左 | 左 | KRIPC_93002892_28 | ✅ 已抓包 |
| 5 环视 | 环视（待确认） | 待抓包 | ⏳ 待确认 |

**统一请求格式**（仅 `view` 不同）：

```json
{
  "deviceId": "hasun-test",
  "type": "2010004",
  "data": { "status": 1, "view": 1 }
}
```

**view=1 响应示例**

```json
{
  "code": 0,
  "data": [
    {
      "name": "KRIPC_93002871_100",
      "url": "https://sztu-video.lingubot.cn/index/api/webrtc?app=live&stream=camera/KRIPC_93002871_100&type=play",
      "info": "前",
      "status": 1
    }
  ],
  "msg": ""
}
```

**view=5 请求**（响应待抓包后回填）

```json
{
  "deviceId": "hasun-test",
  "type": "2010004",
  "data": { "status": 1, "view": 5 }
}
```

| 待确认 |
| ------ |
| view=5 响应 `name`、`info` 确切值 |
| 车辆无环视时 `data` 是否为空 `[]` |

---

## 3. 关摄像头 API ✅ 已确认（2026-07-03 抓包）

| 项 | 填写 |
| -- | ---- |
| 路径 | `POST /device/instructions` |
| type | `2010004` |
| 请求 Body | `{ "deviceId": "...", "type": "2010004", "data": { "status": 0, "cameraName": "KRIPC_93002871_100" } }` |
| cameraName 来源 | 开流响应 `data[].name`（**不是 view**） |

**响应示例**

```json
{
  "code": 0,
  "data": [
    {
      "name": "KRIPC_93002871_100",
      "url": "https://sztu-video.lingubot.cn/index/api/webrtc?app=live&stream=camera/KRIPC_93002871_100&type=play",
      "info": "前",
      "status": 1
    }
  ],
  "msg": ""
}
```

| 待确认 |
| ------ |
| 关流后响应 `status` 仍为 1 的含义 |
| 无观众自动关流 T 秒 |

---

## 4. 控制下发 API

| 项 | 填写 |
| -- | ---- |
| 路径是否为 `POST /device/instructions` | ☑ 是 |
| 请求 Body 格式 | `{ deviceId, type, data }` 一致 |
| 支持的 type | 2010002 / 2010005 / 2010008 / 2010004 |
| 典型响应 | `{ "code": 0, "data": null, "msg": "" }` |
| 2010002/2010008 是否返回车端 reply | ☐ 同步返回 / ☐ 仅受理 |
| 超时时间 | ___ 秒 |

**2010005 请求示例**

```json
{
  "deviceId": "",
  "type": "2010005",
  "data": {
    "command": "FORWARD",
    "speedLevel": 2,
    "seq": 1
  }
}
```

---

## 5. 错误码（如有文档请附）

| code | 含义 |
| ---- | ---- |
| | |

---

**联系人**：___  **日期**：___
