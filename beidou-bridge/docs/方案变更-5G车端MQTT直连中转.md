# 方案变更：5G 车端 MQTT 直连中转（替代云平台 HTTP）

> **版本**：V1.0（2026-07-02）  
> **背景**：中转机**不能连外网**，原「中转 → HTTPS → sztu 云平台 admin-api」在现场不可行。  
> **新方案**：车端加装 **5G 模块**，与中转建立专网/局域网可达链路；车端按《云平台-机器人通信协议》**MQTT 上报 1010001**；中转**订阅 MQTT** 后仍按原逻辑 **HTTP 推北斗**。

---

## 1. 架构对比

### 1.1 原方案（已废弃于无外网现场）

```
车端 ──MQTT──► 云平台(EMQX) ◄──HTTPS admin-api── 中转 ──HTTP──► 北斗
                      ▲
                 中转机需出网
```

### 1.2 新方案（无外网现场）

```
┌─────────┐  5G专网/局域网   ┌──────────────────────────────┐  HTTP内网  ┌─────────┐
│  车端   │ ──MQTT 1010001► │ 中转机：EMQX + beidou-bridge │ ─────────► │ 北斗系统 │
│ +5G模块 │ ◄─MQTT 2010001─ │  (不访问公网/云平台)          │ ◄───────── │         │
└─────────┘                 └──────────────────────────────┘            └─────────┘
```

| 链路 | 协议 | 说明 |
|------|------|------|
| 车 ↔ 中转 | MQTT（1010001 上报 / 2010001 下发） | Topic 与车云协议一致：`dev/pub/{clientId}`、`dev/sub/{clientId}` |
| 中转 ↔ 北斗 | HTTP | **不变**：register + 定时 POST 状态 + navigation |
| 中转 ↔ 云平台 | — | **取消**（无外网时不使用 admin-api） |

**北斗侧无感知**：仍对中转 register 回调 URL；中转推送 JSON 结构不变（见 0630 协议）。

---

## 2. 网络拓扑（待现场确认）

### 2.1 推荐：EMQX 部署在中转机

1. 中转机安装 **EMQX**（或 Mosquitto），监听 `1883`（内网），**无需出网**。  
2. 5G 模块为车端分配**可达中转机的 IP**（专网 APN / 固定 IP / VPN，由运营商或集成商提供）。  
3. 车端 MQTT 客户端 `broker = 中转机IP:1883`，`clientId = LU2606000100`（与 `vehicles.yaml` 一致）。  
4. beidou-bridge 与 EMQX **同机或同网段**，配置 `mqtt.yaml` 连本机 `127.0.0.1:1883`。

### 2.2 备选：5G 路由器自带 MQTT Broker

若 5G CPE 内置 Broker，需确认：

- 中转机能否作为 **MQTT 客户端** 连到 CPE 地址；  
- 车仍发布到 `dev/pub/{clientId}`，中转订阅同一 Broker。

---

## 3. MQTT 约定（与车云协议对齐）

| 方向 | Topic | type | QoS | 说明 |
|------|-------|------|-----|------|
| 车 → 中转 | `dev/pub/{clientId}` | 1010001 | 0 | 约 1Hz 状态；中转缓存最新一条 |
| 中转 → 车 | `dev/sub/{clientId}` | 2010001 | 2 | B2 反控导航（第二期；B1 不测） |
| 车 → 中转 | `dev/reply/{clientId}` | 2010001 等 | 2 | 指令应答（可选订阅） |

**1010001 消息体**：见 [1010001字段与北斗映射.md](./1010001字段与北斗映射.md)。  
**clientId**：现场 **`LU2606000100`**（与 `vehicleId` 相同）。

---

## 4. 中转程序改动摘要

| 项 | 原（cloud） | 新（mqtt） |
|----|-------------|------------|
| 配置 | `config/site/cloud.yaml` + `.env` 云账号 | `config/site/server.yaml` → `dataSource: mqtt` + `config/site/mqtt.yaml` |
| 取状态 | `CloudClient.fetchVehicleStatuses` HTTP 轮询 | 订阅 `dev/pub/{clientId}`，内存缓存 |
| register 响应 | 查云返回 online/battery 快照 | 读 MQTT 缓存（无消息则 offline） |
| 推北斗 | `statusMapper` | **不变** |
| 查车脚本 | `QUERY-vehicle.bat`（admin HTTP） | 看 bridge 日志 / `GET /health`（含 mqtt 连接状态） |

代码入口：`dataSource: mqtt` 时加载 `MqttVehicleDataSource`；`cloud` 保留用于有网实验室。

---

## 5. 现场配置示例

**`config/site/server.yaml`**

```yaml
dataSource: mqtt   # cloud | mqtt
server:
  host: "0.0.0.0"
  port: 8080
# push / dataDir 同原
```

**`config/site/mqtt.yaml`**

```yaml
brokerUrl: "mqtt://127.0.0.1:1883"
clientId: "beidou-bridge-site"
username: ""
password: ""
positionMode: "map_xy"
subscribeTopicPattern: "dev/pub/{clientId}"
publishTopicPattern: "dev/sub/{clientId}"
staleThresholdMs: 15000
```

**`.env`**：MQTT 模式下**不需要** `CLOUD_*` 账号（可删除或留空）。

---

## 6. 现场联调顺序（B1）

1. 中转机：安装 Node + EMQX + 解压 beidou-bridge（`dataSource: mqtt`）。  
2. 5G：确认车能 ping/访问中转机 IP；孟泽配置车 MQTT 指向中转机 Broker。  
3. 用 MQTT 工具或日志确认收到 `dev/pub/LU2606000100` 且 `type=1010001`。  
4. 启动 `START-bridge.bat`，北斗 register → 观察定时 POST 与 `code:1000`。  
5. 验收字段：position / battery / workStatus 非占位 0（车需定位、上电）。

**不再要求**：中转机访问 `https://sztu.lingubot.cn`。

---

## 7. 待现场确认（P0）

| # | 事项 | 负责人 |
|---|------|--------|
| 1 | 5G 模块型号、车端拿到的中转 IP/端口 | 集成商 / 孟泽 |
| 2 | EMQX 装在中转机还是 5G CPE | 我方 |
| 3 | MQTT 用户名密码（若无则留空） | 车端 / 我方 |
| 4 | `position` 还是 `position_xyz`（与 `positionMode` 一致） | 孟泽 |
| 5 | B2 navigation 是否本期要测（2010001 坐标节点） | 北斗 / 产品 |

---

## 8. 相关文档

| 文档 | 用途 |
|------|------|
| [1010001字段与北斗映射.md](./1010001字段与北斗映射.md) | 字段 → 北斗 |
| [现场安装与真北斗联调教程.md](./现场安装与真北斗联调教程.md) | 逐步操作（需按 MQTT 模式更新章节） |
| [云平台-机器人通信协议-内部标准版.docx](./云平台-机器人通信协议-内部标准版.docx) | MQTT 语义母版 |

---

## 9. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-02 | 无外网现场改为 5G + 车端 MQTT；中转取消云平台 HTTP |
