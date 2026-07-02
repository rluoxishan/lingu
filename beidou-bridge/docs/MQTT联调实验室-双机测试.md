# MQTT 联调实验室：双机完整链路测试

> **目标**：中转机**无外网**，验证 **模拟车端(5G电脑) → MQTT → 中转 → 北斗(或Mock北斗)** 读推送链路。  
> **北斗侧接口不变**：仍是 register + 定时 POST + `code:1000`。

---

## 1. 拓扑（与你现在的环境一致）

```
┌─────────────────────┐         5G/以太网可达          ┌─────────────────────────────┐
│ 5G 模拟电脑          │  MQTT 1010001 (1883)          │ 中转机（无外网）              │
│ SIMULATE-vehicle.bat │ ────────────────────────────► │ EMQX/Mosquitto (0.0.0.0:1883)│
│ 模拟 LU2606000100    │                               │ beidou-bridge (8080)         │
└─────────────────────┘                               │ Mock北斗 或 真北斗 register    │
                                                       └──────────────┬──────────────┘
                                                                      │ HTTP 推送
                                                                      ▼
                                                               北斗 / Mock 回调
```

| 机器 | 跑什么 | 端口 |
|------|--------|------|
| **中转机** | EMQX + `START-bridge.bat` +（联调先用 Mock 北斗） | 1883, 8080 |
| **5G 电脑** | `SIMULATE-vehicle.bat` | 出站 → 中转机 1883 |

---

## 2. 准备清单

### 2.1 中转机

| # | 项 | 说明 |
|---|-----|------|
| 1 | Node.js 20+ | 已装 |
| 2 | beidou-bridge 部署包 | `npm run package:site` 打 zip，解压到例如 `D:\beidou-bridge` |
| 3 | **MQTT Broker** | EMQX 或 **Mosquitto**（推荐 Mosquitto，体积小、离线好装） |
| 4 | 配置 | `config/site/server.yaml` → `dataSource: mqtt`；`mqtt.yaml` → `brokerUrl: mqtt://127.0.0.1:1883` |

### 2.2 5G 模拟电脑

| # | 项 | 说明 |
|---|-----|------|
| 1 | Node.js 20+ | 与中转同版本更佳 |
| 2 | beidou-bridge 目录 | 至少含 `node_modules`、`scripts/sim/vehicle-mqtt-simulator.mjs`、`SIMULATE-vehicle.bat` |
| 3 | 5G 模块 | 插入后电脑获得可访问**中转机 IP** 的网段 |
| 4 | 网络 | `ping 中转机IP` 通；`telnet 中转机IP 1883` 或测试 MQTT 连接 |

---

## 3. 中转机：安装 Mosquitto（无外网可 U 盘装）

1. 下载 Windows 安装包（开发机提前下好拷 U 盘）：https://mosquitto.org/download/  
2. 安装后编辑 `mosquitto.conf`（安装目录下）：

```conf
listener 1883 0.0.0.0
allow_anonymous true
```

3. 以服务或命令行启动 Mosquitto，确认监听：

```bat
netstat -an | findstr :1883
```

4. **开放防火墙**（管理员 cmd）：

```bat
OPEN-firewall-1883.bat
```

（8080 若 Mock 北斗在本机回调，仍需要 `OPEN-firewall-8080.bat` 仅当有外部 register；Mock 场景 register 在本机 127.0.0.1 则不必。）

---

## 4. 联调步骤（推荐顺序）

### 步骤 A：中转机 — 一键实验室（Mock 北斗）

在 `beidou-bridge` 根目录 PowerShell：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-mqtt-lab-relay.ps1
```

会打开两个窗口：

- **Mock Beidou**（19090）：打印 `PUSH #N`，应返回 code 1000  
- **bridge**（8080）：日志含 `[mqtt] subscribed dev/pub/LU2606000100`

另开窗口检查：

```bat
curl http://127.0.0.1:8080/health
```

期望：`"dataSource":"mqtt","mqttConnected":true`

### 步骤 B：5G 电脑 — 模拟车端

1. 确认能 ping 通中转机 IP（例 `192.168.8.100`）。  
2. 进入 beidou-bridge 目录，双击或运行：

```bat
SIMULATE-vehicle.bat
```

输入中转机 IP。或预设环境变量：

```bat
set VEHICLE_MQTT_BROKER=mqtt://192.168.8.100:1883
SIMULATE-vehicle.bat
```

期望输出每秒一行：

```text
[sim] #12 pub workStatus=1 battery=42 pos=21.75,86.40,0.628
```

### 步骤 C：验收 READ 链路

| 检查点 | 期望 |
|--------|------|
| 5G 电脑 sim | `[sim] MQTT 已连接`，持续 `#N pub` |
| bridge 日志 | `[scheduler] pushed vehicle=LU2606000100` |
| Mock Beidou | 周期性 `PUSH #N`，`vehicleId=LU2606000100`，`x/y` 非 0 |
| `data-sim/push-log.jsonl` | 持续追加 JSON 行 |

**通过标准**：Mock Beidou 收到推送且 `code:1000` → **模拟车 → 中转 → 北斗回调** 读链路 OK。

### 步骤 D：接真北斗（可选，Mock 通过后）

1. 停 Mock Beidou，保留 bridge + Mosquitto。  
2. 由**北斗方**向中转机 POST register（与原先相同）：

```http
POST http://<中转机IP>:8080/api/v1/beidou/callback/register
Content-Type: application/json

{"url":"<北斗给的回调URL>","frequency":4000}
```

3. 5G 电脑继续跑 `SIMULATE-vehicle.bat`。  
4. 北斗侧确认收到状态 POST 且应答 1000。

---

## 5. 常见问题

| 现象 | 处理 |
|------|------|
| sim 连不上 MQTT | ping 中转机；查 Mosquitto 是否 `0.0.0.0:1883`；跑 `OPEN-firewall-1883.bat` |
| health 里 `mqttConnected:false` | 中转机 Mosquitto 未起；或 `mqtt.yaml` brokerUrl 错 |
| register 成功但无 PUSH | 5G 电脑未跑 sim；或 clientId 不是 `LU2606000100` |
| PUSH 里 x/y=0 | sim 已发非 0 坐标，查 `positionMode: map_xy` 与 `position_xyz` |
| bridge 报 no status | 15s 内没收到 1010001（`staleThresholdMs`），检查 Topic `dev/pub/LU2606000100` |

---

## 6. 命令速查

| 角色 | 命令 |
|------|------|
| 中转机 | `START-bridge.bat` 或 `run-mqtt-lab-relay.ps1` |
| 中转机 | `OPEN-firewall-1883.bat` |
| 5G 电脑 | `SIMULATE-vehicle.bat` |
| 5G 电脑 | `node scripts/sim/vehicle-mqtt-simulator.mjs --broker mqtt://IP:1883` |
| 检查 | `curl http://中转机IP:8080/health` |

---

## 7. 与正式车端的差异

| 项 | 模拟器 | 正式车（孟泽） |
|----|--------|----------------|
| 网络 | 5G 电脑以太网 | 车端 5G 模块 |
| 程序 | `vehicle-mqtt-simulator.mjs` | 车端 IOT/MQTT 客户端 |
| 消息 | 合成 1010001，坐标递增 | 真实定位/电量/任务 |
| Topic | `dev/pub/LU2606000100` | 相同 |

模拟通过后，只需把 5G 电脑换成真车 MQTT 客户端，中转与北斗配置**不用改**。

---

## 8. 相关文档

- [方案变更-5G车端MQTT直连中转.md](./方案变更-5G车端MQTT直连中转.md)  
- [1010001字段与北斗映射.md](./1010001字段与北斗映射.md)  
- [现场安装与真北斗联调教程.md](./现场安装与真北斗联调教程.md)
