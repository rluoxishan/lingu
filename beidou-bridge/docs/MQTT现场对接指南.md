# MQTT 现场对接指南（无外网 · 2026-07-02）

> **适用**：中转机不能出网；车端 5G/MQTT 直连中转机；北斗 HTTP 不变。  
> **现场测试车**：`LU2605000922`  
> **详细操作**：[中转机启动与加车操作手册.docx](./中转机启动与加车操作手册.docx)

---

## 1. 拓扑

```
真车/5G模拟 ──MQTT 1010001:1883──► 中转机(Mosquitto + bridge:8080) ──HTTP POST──► 北斗
                                      ▲
                         北斗 POST register / navigation
```

| 链路 | 协议 | 说明 |
|------|------|------|
| 车 ↔ 中转 | MQTT | Topic `dev/pub/{SN}`、`dev/sub/{SN}` |
| 中转 ↔ 北斗 | HTTP | register + 定时推送（frequency 由北斗 register 指定） |
| 中转 ↔ 云平台 | — | **现场不使用** |

---

## 2. 现场地址（2026-07-02 机房）

| 角色 | 地址 |
|------|------|
| 中转机 IP | `192.168.199.88` |
| health | `GET http://192.168.199.88:8080/health` |
| register | `POST http://192.168.199.88:8080/api/v1/beidou/callback/register` |
| 北斗回调 URL（register Body 的 url） | `http://192.168.199.89:7055/patroL_vehicle/V1/vehicle/data` |
| 推送 frequency | `4000`（毫秒） |
| MQTT Broker | `mqtt://192.168.199.88:1883`（匿名） |
| 现场车 SN | `LU2605000922` |

---

## 3. 发给北斗方

1. **先测 health**：`GET http://192.168.199.88:8080/health` → `status=up`
2. **register**：

```http
POST http://192.168.199.88:8080/api/v1/beidou/callback/register
Content-Type: application/json

{
  "url": "http://192.168.199.89:7055/patroL_vehicle/V1/vehicle/data",
  "frequency": 4000
}
```

3. **验收**：约每 4 秒收到 POST；`data.vehicleId` = **`LU2605000922`**；HTTP 响应 **`{"code":1000,...}`**
4. **反控（B2，可选）**：`POST http://192.168.199.88:8080/api/v1/beidou/navigation`

附件：`给北斗方-接口一页纸.txt`、`协议0629-中转响应定稿.md`

---

## 4. 发给车端（孟泽）

| 项 | 值 |
|----|-----|
| Broker IP | `192.168.199.88` |
| 端口 | `1883` |
| SN / clientId | `LU2605000922` |
| 上报 Topic | `dev/pub/LU2605000922`（1010001，~1Hz） |
| 订阅 Topic | `dev/sub/LU2605000922`（2010001 下行） |
| 用户名/密码 | 空 |

**注意**：连中转机 Mosquitto，不是云平台公网 EMQX。真车联调时停 5G 模拟脚本。

---

## 5. 我方中转机职责

1. Mosquitto 监听 `0.0.0.0:1883`；防火墙开放 1883、8080  
2. `config/site/vehicles.yaml` 中 `vehicleId`/`clientId` 与车端 SN 一致  
3. 双击 `START-bridge.bat`（窗口保持）  
4. 改车后：**重启 bridge + 重新 register**  
5. 加车：编辑 `vehicles.yaml` → 重启 → register（不必改代码）

---

## 6. 联调顺序

| # | 动作 |
|---|------|
| 1 | Mosquitto + bridge 启动 |
| 2 | 车端/模拟器发 1010001 |
| 3 | 北斗 register |
| 4 | bridge 日志 `pushed vehicle=LU2605000922` |
| 5 | 北斗回 code:1000 |

---

## 7. 相关文档

| 文档 | 读者 |
|------|------|
| [中转机离线部署手册-MQTT模式.md](./中转机离线部署手册-MQTT模式.md) | 安装人员 |
| [MQTT联调实验室-双机测试.md](./MQTT联调实验室-双机测试.md) | 5G 模拟 + 双机 |
| [方案变更-5G车端MQTT直连中转.md](./方案变更-5G车端MQTT直连中转.md) | 架构说明 |
| [开发记录与AI交接.md](./开发记录与AI交接.md) §11.2 | AI/开发接手 |
