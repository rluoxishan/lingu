# 周期性状态上报

> 本文档 **§二** 复用《车辆IOT实现方案》§6.1；**§三起** 为 v1.0 拓展。

---

## 二、1010001 车辆状态信息上报（IOT §6.1）

**描述**：车辆定时或状态变化时上报自身状态。

| 项目 | 值 |
| ---- | -- |
| Topic | `dev/pub/{clientId}` |
| retain | false |
| QoS | 0 |
| type | 1010001 |

**data 字段**（IOT 方案，原样复用）：

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| position | String | 是 | 车辆位置，经度,纬度 |
| workStatus | Integer | 是 | 0-空闲，1-任务中 |
| taskId | String | 否 | 执行任务的 id |
| isInNode | Boolean | 否 | 是否停留在站点 |
| inNodeName | String | 否 | 当前停留站点名字 |
| inNodeTime | Long | 否 | 预计当前站点停留时间（秒） |
| nextNodeName | String | 否 | 下一个站点名字 |
| nextNodeTime | Long | 否 | 预计下一站点路程时间（秒） |
| battery | Integer | 是 | 车辆电量 |
| brakeStatus | Integer | 是 | 0-关闭，1-开启 |

**请求示例**：

```json
{
  "id": 1740469352001,
  "time": 1740469352000,
  "type": "1010001",
  "data": {
    "position": "114.05129,22.508236",
    "workStatus": 1,
    "taskId": "T001",
    "isInNode": false,
    "battery": 85,
    "brakeStatus": 0
  }
}
```

**云平台回复**：无需回复（IOT 方案 §6.1）。

### 2.1 拓展字段（v1.0，追加在 data 内）

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| heading | Number | 航向角（度） |
| speedMps | Number | 速度 m/s |
| taskProgress | Integer | 任务进度 0-100 |
| taskName | String | ICD 任务类型 |
| localizationStatus | String | 定位状态 |
| workingStatus | String | 作业状态 |
| planningStatus | String | 规划状态 |
| vehicleInfo | Object | 硬件摘要（来自 zwj_hardware_response） |
| sensorStatus | Object | 传感器在线状态 |
| faultSummary | Object | 故障摘要（hasFault/faultCount/highestLevel） |

> workStatus 拓展映射：2-故障，3-充电，4-急停（IOT 仅定义 0/1，拓展值由 bridge 追加，平台需兼容）。

---

## 三、1010003 高频定位（10Hz）

### 3.1 设计说明

AGV 需求要求定位数据 ≥10Hz、精度 ±10cm（RTK+GPS）。1010001 @ 1Hz 不满足实时监控，因此独立 type，**不持久化**。

### 3.2 数据结构

```json
{
  "id": 1740469352003,
  "time": 1740469352000,
  "type": "1010003",
  "data": {
    "dataType": "LOC_HIGH_FREQ",
    "persist": false,

    "latitude": 22.508236,
    "longitude": 114.05129,
    "heading": 81.85,
    "altitude": 39.19,
    "speedMps": 0.11,

    "posEast": -6.6,
    "posNorth": -1.0,
    "posUp": 0.06,
    "yaw": 81.86,
    "pitch": -0.20,
    "roll": -1.11,

    "rtkStatus": "FIXED",
    "localizationAccuracy": 0.05
  }
}
```

### 3.3 字段说明

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| dataType | String | 固定 `LOC_HIGH_FREQ` |
| persist | Boolean | 固定 false |
| posEast/posNorth/posUp | Number | RTK 定位偏差（cm） |
| rtkStatus | String | NONE / SINGLE / FLOAT / FIXED |
| localizationAccuracy | Number | 定位精度估计（米） |

---

## 四、云端统计计算

云端定时（建议 60 秒）从 1010001 时序数据计算：

| 统计项 | 数据源 | 计算方式 |
| ------ | ------ | -------- |
| 任务进度 | taskProgress | 直接读取 |
| 行驶距离 | vehicleInfo.vehicleOdomInfo | 任务起止里程差 |
| 电量消耗 | battery | 任务起止电量差 |
| 任务时长 | workStatus 变更时间 | 终端状态时间 - 开始时间 |
| 在线率 | online_status 事件 | 连接时长 / 总时长 |

---

## 五、上报规则总结

### 5.1 周期上报 vs 事件上报

| 数据 | 方式 | type | 频率 |
| ---- | ---- | ---- | ---- |
| 综合状态 | dev/pub | 1010001 | 1Hz |
| 高频定位 | dev/pub | 1010003 | 10Hz |
| 本地任务列表 | dev/pub | 1010002 | 事件触发 |
| 故障详情 | dev/pub | 1010004 | 见 rpc-client |
| 避障事件 | dev/pub | 1010005 | 见 rpc-client |
| 指令回复 | dev/reply | 201xxxx | 一次性 |

---

## 相关文档

- [车端事件上报](protocol-rpc-client.md)
- [状态机](protocol-state-machine.md)
- [载荷映射](protocol-mapping.md)
