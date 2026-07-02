# 中转机离线部署手册（MQTT 模式 · 无外网）

> **版本**：V1.0（2026-07-02）  
> **适用**：中转机**不能连接外网**；车端（或 5G 模拟电脑）经 MQTT 上报 1010001；北斗侧 HTTP **不变**。  
> **现场车辆**：`LU2606000100`  
> **阅读顺序**：第 0 章填表 → 第 1 章（开发机打 U 盘）→ 第 2～5 章（中转机逐步安装）→ 第 6 章（5G 模拟电脑）→ 第 7 章（接北斗）

---

## 第 0 章：角色与网络（先填表）

| 项 | 填写 | □ |
|----|------|---|
| 日期 | | |
| **中转机 IP**（北斗提供/内网） | | |
| **5G 模拟电脑** 插 5G 后能否 ping 通中转机 | 是 / 否 | |
| Mosquitto 安装路径 | 默认 `C:\Program Files\mosquitto\` | |
| bridge 解压路径 | 建议 `D:\beidou-bridge` | |
| health | `http://____:8080/health` | |
| register | `http://____:8080/api/v1/beidou/callback/register` | |
| 北斗回调 URL（register Body 的 url） | | |
| 推送 frequency | 4000 ms | |
| 现场负责人 | | |

**拓扑（牢记）：**

```
5G电脑/真车 ──MQTT:1883──► 中转机(Mosquitto + beidou-bridge:8080) ──HTTP──► 北斗
```

中转机**不需要**访问 `sztu.lingubot.cn`，**不需要** `.env` 云账号。

---

## 第 1 章：出发前 — 在有网的开发机上准备 U 盘

> 全部文件用 U 盘拷到中转机；中转机全程**不要**连外网。

### 1.1 打离线部署 zip

在开发机 `beidou-bridge` 目录 PowerShell：

```powershell
cd D:\LINGUSET\beidou-bridge
npm run package:site
```

输出：`release\beidou-bridge-site-YYYYMMDD.zip`  
（zip 内已含 `dist`、`node_modules`、`config/site`、bat、文档，**无需在中转机 npm install**。）

也可一键检查 U 盘清单：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-offline-usb.ps1
```

### 1.2 U 盘必带清单（核对打勾）

| # | 文件 | 用途 | □ |
|---|------|------|---|
| 1 | `beidou-bridge-site-YYYYMMDD.zip` | 中转程序 + 依赖 + 配置 | |
| 2 | `node-v20.*-x64.msi` | 中转机装 Node（若无） | |
| 3 | `mosquitto-*-install-windows-x64.exe` | 中转机 MQTT Broker | |
| 4 | 本文档（打印或 U 盘 `docs\`） | 逐步操作 | |
| 5 | `docs\MQTT联调实验室-双机测试.md` | 双机联调 | |
| 6 | `docs\给北斗方-接口一页纸.txt` | 发给北斗 | |
| 7 | **同目录 zip 副本**（可选） | 拷到 5G 模拟电脑跑 `SIMULATE-vehicle.bat` | |

**下载地址（开发机有网时下载）：**

| 软件 | 地址 |
|------|------|
| Node.js 20 LTS | https://nodejs.org/ |
| Mosquitto Windows | https://mosquitto.org/download/ |

### 1.3 不要带 / 不需要

| 项 | 说明 |
|----|------|
| `.env` / 云账号 | MQTT 模式**不需要** |
| `QUERY-vehicle.bat` | 查云平台，无外网无用 |
| 在线 npm install | zip 已含 `node_modules` |

---

## 第 2 章：中转机 — 安装 Node.js（约 5 分钟）

1. U 盘插入中转机，双击 **`node-v20.*-x64.msi`**，全部默认下一步。  
2. **关闭**所有 cmd 窗口，新开 cmd：

```bat
node -v
```

| 结果 | 下一步 |
|------|--------|
| 显示 `v20.x` 或更高 | 第 3 章 |
| 命令不存在 | 重装 Node 或重启电脑后再试 |

---

## 第 3 章：中转机 — 安装 Mosquitto（约 10 分钟）

MQTT Broker 必须在中转机上，供车端/5G 电脑连接 **1883**。

### 3.1 安装

1. 双击 U 盘 **`mosquitto-*-install-windows-x64.exe`**，默认安装。  
2. 记下安装目录，一般为：

```text
C:\Program Files\mosquitto\
```

### 3.2 配置（允许 5G 电脑连接）

1. 用记事本**以管理员身份**打开：

```text
C:\Program Files\mosquitto\mosquitto.conf
```

2. 在文件**末尾**追加（联调阶段允许匿名；正式环境再加账号）：

```conf
listener 1883 0.0.0.0
allow_anonymous true
```

3. 保存。

> 仓库内有一份相同内容的参考：`config/site/mosquitto-onsite.conf.example`

### 3.3 启动 Mosquitto

**方式 A — Windows 服务（推荐）**

1. `Win + R` → `services.msc`  
2. 找到 **Mosquitto Broker** → 启动 → 启动类型选 **自动**

**方式 B — 命令行（临时）**

```bat
cd /d "C:\Program Files\mosquitto"
mosquitto.exe -c mosquitto.conf -v
```

保持窗口不关。

### 3.4 确认 1883 在监听

```bat
netstat -an | findstr :1883
```

应看到 `0.0.0.0:1883` 或 `[::]:1883` 的 `LISTENING`。

### 3.5 开放防火墙 1883

在 `D:\beidou-bridge`（解压后）**管理员**运行：

```bat
OPEN-firewall-1883.bat
```

北斗要能 register/访问中转时，还需（通常北斗方内网访问）：

```bat
OPEN-firewall-8080.bat
```

---

## 第 4 章：中转机 — 解压并部署 beidou-bridge（约 5 分钟）

### 4.1 解压

1. 复制 `beidou-bridge-site-YYYYMMDD.zip` 到 `D:\`  
2. 右键 → **全部解压缩** → `D:\beidou-bridge`  
3. 目录应含：

```text
D:\beidou-bridge\
  START-bridge.bat
  CHECK-env.bat
  RUN-mqtt-lab-relay.bat
  OPEN-firewall-1883.bat
  dist\main.js
  node_modules\
  config\site\
    server.yaml      ← dataSource: mqtt
    mqtt.yaml        ← brokerUrl: mqtt://127.0.0.1:1883
    vehicles.yaml    ← LU2606000100
  docs\
```

### 4.2 确认配置（一般不用改）

**`config/site/server.yaml`**

```yaml
dataSource: mqtt
server:
  host: "0.0.0.0"
  port: 8080
```

**`config/site/mqtt.yaml`**

```yaml
brokerUrl: "mqtt://127.0.0.1:1883"
clientId: "beidou-bridge-site"
positionMode: "map_xy"
```

若 Mosquitto 不在本机（极少见），只改 `brokerUrl` 的 IP。

### 4.3 环境检查

双击 **`CHECK-env.bat`**。

MQTT 模式预期（**无 FAIL**）：

```text
[OK]   Node.js v20.x
[OK]   dist/main.js exists
[OK]   dataSource=mqtt (no cloud .env required)
[OK]   config/site ready
[OK]   vehicles.yaml includes LU2606000100
[OK]   MQTT broker listening on 1883
========== summary: OK=... FAIL=0 ==========
```

| 若 FAIL | 处理 |
|---------|------|
| Node | 第 2 章 |
| dist 缺失 | zip 不完整，重新拷包 |
| 1883 未监听 | 第 3 章 Mosquitto 未启动 |

---

## 第 5 章：中转机 — 启动中转程序

### 5.1 正式运行（接北斗时用）

双击 **`START-bridge.bat`**。

窗口应出现类似：

```text
beidou-bridge listening on http://0.0.0.0:8080 dataSource=mqtt
[mqtt] connected broker=mqtt://127.0.0.1:1883
[mqtt] subscribed topic=dev/pub/LU2606000100
```

**不要关窗口**；停止按 `Ctrl+C`。

### 5.2 自检 health

新开 cmd：

```bat
curl http://127.0.0.1:8080/health
```

期望 JSON：

```json
{"status":"up","dataSource":"mqtt","mqttConnected":true}
```

`mqttConnected:false` → Mosquitto 未起或 `mqtt.yaml` 地址错误。

### 5.3 提供给北斗的信息

| 项 | 值 |
|----|-----|
| register URL | `POST http://<中转机IP>:8080/api/v1/beidou/callback/register` |
| Body 示例 | `{"url":"<北斗回调URL>","frequency":4000}` |
| health | `GET http://<中转机IP>:8080/health` |

内容详见 `docs\给北斗方-接口一页纸.txt`。

### 5.4 联调前 Mock 自测（推荐先做）

在接真北斗前，确认 **MQTT → bridge → 推送** 正常：

```bat
RUN-mqtt-lab-relay.bat
```

会启动 **Mock 北斗** + bridge 并自动 register。  
然后在 **5G 模拟电脑** 运行 `SIMULATE-vehicle.bat`（见第 6 章）。  
Mock 窗口出现 `PUSH #N` 即中转机部署成功。

---

## 第 6 章：5G 模拟电脑（验证完整链路）

> 真车联调时，由孟泽配置车端 MQTT 指向中转机 IP，步骤与模拟相同。

1. 5G 模块插入，确认 `ping <中转机IP>` 通。  
2. 拷贝 zip 解压（或仅拷贝含 `node_modules` + `SIMULATE-vehicle.bat` 的目录）。  
3. 安装 Node.js 20（若无）。  
4. 运行：

```bat
SIMULATE-vehicle.bat
```

输入中转机 IP。  
5. 回到中转机：Mock 北斗或 bridge 日志应出现推送。

**通过标准**

| 检查 | 期望 |
|------|------|
| 5G 电脑 | `[sim] MQTT 已连接`，每秒 `#N pub` |
| bridge | `[scheduler] pushed vehicle=LU2606000100` |
| Mock/北斗 | 收到 POST，`code:1000` |

---

## 第 7 章：接真北斗（Mock 通过后）

1. 关闭 Mock 北斗窗口，保留 Mosquitto + `START-bridge.bat`。  
2. 北斗方向中转 **POST register**（与原先协议相同）。  
3. 5G 电脑或真车持续发 1010001。  
4. 北斗确认收到周期 POST，字段含 `vehicleId`、`x`、`y`、`powerLevel` 等。  
5. 填写 `docs\到场确认清单.docx` 或联调检查表。

---

## 第 8 章：常见问题

| 现象 | 原因 | 处理 |
|------|------|------|
| START-bridge 一闪退出 | 无 Node / 无 dist | 第 2、4 章 |
| mqttConnected:false | Mosquitto 未运行 | 第 3 章 |
| 5G 电脑 MQTT 连不上 | 防火墙 / IP / 网不通 | `OPEN-firewall-1883`；ping；Mosquitto `0.0.0.0` |
| register 成功无推送 | 无 1010001 | 跑 SIMULATE-vehicle 或查真车 MQTT |
| PUSH 里 x/y=0 | 未收到有效坐标 | 查 sim 的 `position_xyz`；`positionMode: map_xy` |
| 想查云车辆 | 无外网不可用 | 用 health + bridge 日志 |

---

## 第 9 章：日常运维

| 操作 | 命令 |
|------|------|
| 启动顺序 | ① Mosquitto 服务 → ② `START-bridge.bat` |
| 停止 | bridge 窗口 Ctrl+C；Mosquitto 可在 services.msc 停止 |
| 开机自启 bridge | `scripts\windows\register-autostart.ps1`（需先测手动启动正常） |
| 升级版本 | 开发机重新 `package:site`，U 盘覆盖 `dist`+`node_modules`+`config/site` |

---

## 第 10 章：文档索引

| 文档 | 用途 |
|------|------|
| **本文** | 中转机离线部署主文档 |
| [MQTT联调实验室-双机测试.md](./MQTT联调实验室-双机测试.md) | 双机联调细节 |
| [方案变更-5G车端MQTT直连中转.md](./方案变更-5G车端MQTT直连中转.md) | 架构说明 |
| [现场安装与真北斗联调教程.md](./现场安装与真北斗联调教程.md) | 真北斗逐步验收 |
| [1010001字段与北斗映射.md](./1010001字段与北斗映射.md) | 字段含义 |

---

## 附录 A：时间线（建议）

| 阶段 | 地点 | 工作 | 时长 |
|------|------|------|------|
| T-1 | 开发机 | `package:site` + 下 Node/Mosquitto + 打 U 盘 | 30 min |
| T0 | 中转机 | 装 Node → Mosquitto → 解压 → CHECK-env | 30 min |
| T1 | 中转机 | `RUN-mqtt-lab-relay` + 5G 电脑 SIMULATE | 20 min |
| T2 | 中转机+北斗 | `START-bridge` + 北斗 register + 真推送验收 | 联调时段 |

---

## 附录 B：端口一览

| 端口 | 服务 | 谁访问 |
|------|------|--------|
| 1883 | Mosquitto MQTT | 5G 电脑 / 车端 |
| 8080 | beidou-bridge HTTP | 北斗 register |
| 19090 | Mock 北斗（仅自测） | 本机 |
