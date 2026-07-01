# AGV 小车通信协议

> **版本**: v1.0  
> **基础协议**:《车辆IOT实现方案》（EMQX MQTT，1010001~1010002 / 2010001~2010008）  
> **拓展**: ICD 桥接、AGV/巡检需求、IDK 商用巡检组合任务  

---

## 文档说明

本协议集 **以《车辆IOT实现方案》为正文基础**，字段/Topic/type/QoS **原样复用**；仅在各章节「拓展」小节追加新能力，不修改 IOT 已有语义。

```
AGV 管理平台 ──IOT MQTT（dev/sub·pub·reply）──► mqtt_iot_bridge ──ROS ICD──► 自驾算法
```

| 层级 | 文档来源 |
| ---- | -------- |
| MQTT 信封、Topic、101/201 指令 | 《车辆IOT实现方案》 |
| 组合 taskSteps、设备 target 控制 | v1.0 拓展 |
| MQTT ↔ ROS 转换 | protocol-mapping.md |

---

## 文档索引

| 文档 | 内容 |
| ---- | ---- |
| [protocol-overview.md](protocol-overview.md) | IOT §3~§5 + 指令类型表 |
| [protocol-telemetry.md](protocol-telemetry.md) | IOT §6.1 状态上报 + 拓展 |
| [protocol-rpc-client.md](protocol-rpc-client.md) | IOT §6.2 任务列表 + 拓展 |
| [protocol-rpc-server.md](protocol-rpc-server.md) | IOT §7.1~7.8 云平台下发 + 拓展 |
| [protocol-enums.md](protocol-enums.md) | IOT 枚举 + 拓展枚举 |
| [protocol-mapping.md](protocol-mapping.md) | MQTT ↔ ROS ICD |
| [protocol-revision.md](protocol-revision.md) | 基础 vs 拓展对照 |
| [protocol-state-machine.md](protocol-state-machine.md) | 状态映射 |

---

## 快速导航

### 按功能

- **组合任务下发**：rpc-server §2.1（IOT taskNodes + 拓展 taskSteps）
- **车辆控制**：rpc-server §2.2（IOT flat 参数 + 拓展 target）
- **状态上报**：telemetry §二（IOT 1010001 十字段）
- **任务列表同步**：rpc-client §二（IOT 1010002）
- **出货/视频/遥控**：rpc-server §2.3~2.5（IOT 原样）
- **MQTT ↔ ROS**：protocol-mapping.md

---

## 版本历史

| 版本 | 日期 | 说明 |
| ---- | ---- | ---- |
| v1.0 | 2026-06-06 | 以 IOT 方案为基础整理，追加 ICD/AGV/组合任务拓展 |
