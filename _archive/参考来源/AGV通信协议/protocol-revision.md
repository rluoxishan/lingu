# 协议拓展说明

> **基础协议**：《车辆IOT实现方案》（EMQX MQTT，1010001~1010002 / 2010001~2010008）  
> **本文档**：在 IOT 方案 **原样复用** 的前提下，列出 v1.0 拓展项及 ICD/AGV 需求补充。

---

## 一、IOT 方案原样复用（不做变更）

以下内容与《车辆IOT实现方案》**完全一致**，开发时以 IOT 文档为准：

| 章节 | 内容 |
| ---- | ---- |
| §3 | EMQX + MySQL + Redis 组件 |
| §4 | 注册、连接、上下线、指令收发、数据上报流程 |
| §5.1 | dev/sub · dev/pub · dev/reply Topic |
| §5.2 | ClientId / Username / Password 认证 |
| §5.3 | `{ id, time, type, data }` 信封及 101/201 指令表 |
| §6.1 | 1010001 状态字段（position/workStatus/battery 等 10 项） |
| §6.2 | 1010002 本地任务列表 + 平台确认回复 |
| §7.1 | 2010001 任务下发（taskId/taskNodes/cycleDays 等） |
| §7.2 | 2010002 修改参数（brake/headlights/ultrasonic/screen/turnSignals） |
| §7.3 | 2010003 通知出货（orderId） |
| §7.4 | 2010004 视频监控（status/view/url） |
| §7.5 | 2010005 遥控（speed/angle，无需回复） |
| §7.6 | 2010006 查看配置 |
| §7.7 | 2010007 获取点位（List&lt;String&gt;） |
| §7.8 | 2010008 紧急开关（类型表已定义） |

---

## 二、v1.0 拓展项（追加，不替换 IOT 字段）

### 2.1 车辆上报拓展

| type | 基础 | 拓展 |
| ---- | ---- | ---- |
| 1010001 | IOT 10 字段 | 追加 ICD 算法/硬件/故障摘要字段（见 telemetry §2.1） |
| 1010003 | — | 10Hz 高频定位（AGV 需求） |
| 1010004 | — | 独立故障 Topic |
| 1010005 | — | 避障/重规划事件 |

### 2.2 2010001 任务下发拓展

| 层级 | 说明 |
| ---- | ---- |
| **IOT 基础** | `taskId` / `taskName` / `returnPoint` / `taskNodes`（order/taskPoint/duration）/ 计划调度字段 |
| **拓展 taskSteps** | 有序组合步骤（GOAL_NAV / ACTION / CUSTOM_ROUTE / CHARGING），对齐 IDK 商用巡检咨询版组合任务 |
| **拓展 ICD 直传** | `data` 含 `type: start_task` 等 ICD JSON 时 bridge 原样转发 |

> 平台下发时 **优先使用 IOT taskNodes 结构**；需混合导航+动作+路线时使用 taskSteps 拓展。

### 2.3 2010002 修改参数拓展

| 层级 | 说明 |
| ---- | ---- |
| **IOT 基础** | data 内 flat 字段：brake / headlights / ultrasonic / screen / turnSignals |
| **拓展 target 模型** | 机械臂(ARM)、云台(GIMBAL)、货柜(CONTAINER)、声(AUDIO)、光(LIGHT)、电源(POWER) |
| **拓展 NAV_CONFIG** | 导航参数、离线策略 |

### 2.4 2010004 / 2010005 拓展

| type | IOT 基础 | 拓展 |
| ---- | -------- | ---- |
| 2010004 | status/view/url + 周期心跳机制（原文描述） | heartbeatIntervalSec / maxMissedHeartbeats 参数化 |
| 2010005 | speed + angle，无需回复 | command/speedLevel/摄像头云台/seq（AGV 远程遥操） |

### 2.5 2010007 拓展

IOT 回复 `data: List<String>` 保持不变；拓展可选返回 `points[]` 结构化坐标（追加字段，不删 names 列表）。

### 2.6 新增 type

| type | 说明 |
| ---- | ---- |
| 2010009 | 任务控制 → ICD suspend/resume/stop |
| 2010010 | 定位校准 |
| 2010011 | 建图控制 |
| 2010012 | 地图同步 |

### 2.7 车端桥接层

IOT 方案未涉及 ROS；`mqtt_iot_bridge` 负责 MQTT ↔ `/swj/swj_request_srv` / `/zwj/zwj_*` 转换（见 mapping 文档）。

---

## 三、刻意不引入

| 内容 | 原因 |
| ---- | ---- |
| ThingsBoard Topic | 与 IOT 方案冲突 |
| 清扫车专有业务 | 不在 AGV/巡检范围 |

---

## 相关文档

- [协议概述](protocol-overview.md)
- [载荷映射](protocol-mapping.md)
