# 车端事件上报

> **§二** 复用《车辆IOT实现方案》§6.2；**§三起** 为 v1.0 拓展（IOT 方案未定义独立故障/避障 type）。

---

## 一、上报边界

| 数据类型 | 上报方式 | type | 频率 | 用途 |
| -------- | -------- | ---- | ---- | ---- |
| 综合状态 | dev/pub | 1010001 | 1Hz | 实时监控（见 telemetry） |
| 本地任务列表 | dev/pub | 1010002 | 变更时 | 任务同步（IOT §6.2） |
| 故障状态 | dev/pub | 1010004 | 1Hz（有故障） | 告警推送（v1.0 拓展） |
| 避障/重规划 | dev/pub | 1010005 | 事件触发 | 避障日志（v1.0 拓展） |

> 除 1010002 外，IOT 方案约定云平台对 101xxxx **无需回复**。

---

## 二、1010002 本地任务列表上报（IOT §6.2）

**描述**：车辆上报本地配置的任务列表；未上传或更新后需重新上传。

| 项目 | 值 |
| ---- | -- |
| Topic | `dev/pub/{clientId}` |
| retain | false |
| QoS | 2 |
| type | 1010002 |

**data**：JSONArray，每项字段与 IOT §7.1 任务 data **相同**：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| taskId | String | 任务 id |
| taskName | String | 任务名称 |
| returnPoint | String | 返航点 |
| active | Boolean | 是否开启 |
| cycleDays | Integer[] | 循环天数 |
| cycleType | String | EVERY_WEEK / ODD_WEEK / EVEN_WEEK |
| executionMode | String | IMMEDIATE / SCHEDULED |
| startTime | String | hh:mm |
| taskNodes | List | order / taskPoint / duration |

**上报示例**（IOT 方案）：

```json
{
  "id": 1740469352002,
  "time": 1740469352000,
  "type": "1010002",
  "data": [
    {
      "taskId": "LOCAL001",
      "taskName": "早班巡检",
      "returnPoint": "充电站1",
      "active": true,
      "cycleDays": [1, 2, 3, 4, 5],
      "cycleType": "EVERY_WEEK",
      "executionMode": "SCHEDULED",
      "startTime": "08:00",
      "taskNodes": [
        { "order": 1, "taskPoint": "站点A", "duration": "60" },
        { "order": 2, "taskPoint": "站点B", "duration": "0" }
      ]
    }
  ]
}
```

**云平台确认回复**（IOT 方案，Topic: `dev/sub/{clientId}`，QoS: 2）：

```json
{
  "id": 1740469352002,
  "time": 1740469352100,
  "type": "1010002",
  "data": { "code": 200, "msg": "ok" }
}
```

#### 拓展：taskSteps

v1.0 可在任务项中 **追加** `taskSteps`（见 rpc-server §2.1 拓展 B），IOT `taskNodes` 仍保留，平台应优先解析 IOT 字段。

---

## 三、1010004 故障状态（v1.0 拓展）

IOT 方案未单独定义故障 type；1010001 中亦无 fault 详情。v1.0 从 `/zwj/zwj_fault_response` 独立映射。

### 3.1 设计原则

1. 车端只上报 ICD `fault_info` 原始数据
2. 有活动故障时 1Hz 持续上报
3. 告警推送、统计由云平台负责

### 3.2 数据结构

```json
{
  "id": 1740469352004,
  "time": 1740469352000,
  "type": "1010004",
  "data": {
    "dataType": "FAULT_STATE",
    "hasFault": true,
    "faultCount": 2,
    "highestFaultLevel": 3,
    "faultInfo": [
      {
        "faultLevel": 3,
        "faultId": "F001",
        "faultDescription": "GPS信号丢失",
        "voiceSpecialProcessing": "请前往空旷区域",
        "lightSpecialProcessing": "开启双闪灯"
      }
    ]
  }
}
```

### 3.3 无故障时

```json
{
  "dataType": "FAULT_STATE",
  "hasFault": false,
  "faultCount": 0,
  "highestFaultLevel": 1,
  "faultInfo": []
}
```

---

## 四、1010005 避障/重规划/让行事件（v1.0 拓展）

### 4.1 触发时机

| 事件 | 触发条件 |
| ---- | -------- |
| OBSTACLE_AVOIDANCE | planningStatus → obstacle_avoidance |
| REPLANNING | planningStatus → recovery_planning |
| YIELDING | planningStatus → parking_courtesy |

### 4.2 数据结构

```json
{
  "id": 1740469352005,
  "time": 1740469352000,
  "type": "1010005",
  "data": {
    "eventType": "OBSTACLE_AVOIDANCE",
    "eventStatus": "START",
    "taskId": "T20250606001",
    "latitude": 22.508236,
    "longitude": 114.05129,
    "heading": 81.85,
    "planningStatus": "obstacle_avoidance",
    "obstacleStopTime": 5.2,
    "avoidanceAction": "WAIT"
  }
}
```

枚举见 [protocol-enums.md](protocol-enums.md) §十二。

---

## 五、事件上报汇总

| type | 名称 | 来源 | 触发 | QoS | 平台回复 |
| ---- | ---- | ---- | ---- | --- | -------- |
| 1010002 | 本地任务列表 | IOT §6.2 | 变更时 | 2 | 需要 |
| 1010004 | 故障状态 | v1.0 拓展 | 有故障 1Hz | 1 | 不需要 |
| 1010005 | 避障/重规划 | v1.0 拓展 | 状态变更 | 1 | 不需要 |

---

## 相关文档

- [周期性上报](protocol-telemetry.md)
- [云平台下发](protocol-rpc-server.md)
- [枚举定义](protocol-enums.md)
