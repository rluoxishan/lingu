# 开发记录与 AI 交接文档

> **最后更新**：2026-07-02（V2.4 MQTT 无外网现场 + 真北斗 B1 验收）  
> **项目**：beidou-bridge（云平台 ↔ 中转程序 ↔ 北斗系统）  
> **用途**：给后续开发者或 **另一个 AI 会话** 快速接手；读完本文应能立刻知道做了什么、在哪改、下一步做什么  

---

## 0. 30 秒速览（给 AI）

| 项 | 内容 |
|----|------|
| **是什么** | Node.js/TypeScript HTTP 中转：云 API 读状态 → 推北斗；北斗反控 → 云 2010001 |
| **仓库** | https://github.com/rluoxishan/lingu.git（`beidou-bridge/` 子目录） |
| **开发分支** | `develop`（日常提交 push 这里） |
| **稳定分支** | `master`（测试通过后 merge） |
| **技术栈** | Node 20+、TypeScript、Fastify |
| **当前阶段** | **MQTT 无外网现场 ✅ 模拟+B1**；真车 `LU2605000922` 待联调；**B2 反控** 未测 |
| **联调测试车** | **MQTT 现场**：`LU2605000922`；**admin 实验室**：`LU2606000100`；**tpapi**：`hasun-test` |
| **MQTT 现场** | [MQTT现场对接指南.md](./MQTT现场对接指南.md) · [中转机离线部署手册-MQTT模式.md](./中转机离线部署手册-MQTT模式.md) |
| **模拟联调** | [模拟联调实验室.md](./模拟联调实验室.md)（Mock北斗+真云，接真北斗前） |
| **现场联调** | [到场前准备.md](./到场前准备.md) → [现场联调检查表.md](./现场联调检查表.md) |
| **字段/枚举** | [1010001字段与北斗映射.md](./1010001字段与北斗映射.md) |
| **云环境** | 商用/教研同一台 `sztu.lingubot.cn`；车端需 IDK **商用版** 启动 |
| **正式协议** | `docs/中转系统与北斗系统交互协议0630.docx` |

**AI 接手第一步（30 秒）：**

```powershell
git pull origin master   # 或 develop
cd beidou-bridge && npm ci && npm run build
# 读：本文 §0 → MQTT现场对接指南 → 中转机启动与加车操作手册.docx
# MQTT 实验室：npm run test:mqtt-lab
# 现场：START-bridge.bat → register → 真车/模拟 1010001
```

---

## 1. 架构与数据流

```
车端 ──MQTT──► 云平台 ◄──HTTP── 中转程序 ──HTTP──► 北斗系统
                      （中转主动拉）    ▲
                                      │
                            北斗 register / navigation
```

| 方向 | 谁发起 | 做什么 |
|------|--------|--------|
| 北斗 → 中转 | 北斗 | `register`（一次或变更时）、`navigation`（反控） |
| 中转 → 北斗 | 中转 | 按 frequency 定时 POST 各车状态到同一 url |
| 中转 → 云 | 中转 | 登录、批量/单车查状态、下发 2010001 |
| 云 → 中转 | 无 | 云不需要回调中转 |

---

## 2. Git 分支与提交记录

### 2.1 分支（必须遵守）

| 分支 | 用途 |
|------|------|
| `develop` | **日常开发**，`git push origin develop` |
| `master` | 稳定版，仅 merge，详见 [Git工作流.md](./Git工作流.md) |

本地 `main` 跟踪远程 `origin/master`（历史命名）。

### 2.2 提交历史（从新到旧）

| Commit | 说明 |
|--------|------|
| `2d2213c` | 到场前准备：`config/site`、pre-site 脚本、商用版 HTTP 字段实测 |
| `753768a` | docs V1.9：1010001 映射、B1 范围 |
| `7c3697a` | register **幂等**：url+frequency 未变不重启推送 |
| `006619d` | 0630 协议对齐、tpapi A 阶段、现场联调检查表 |
| `c0ea490` | AI 交接文档 + CHANGELOG |
| `8639c1a` | 新增 `docs/Git工作流.md`，约定 develop → master |
| `731ddbb` | **批量查云**：每轮推送 1 次 HTTP；scheduler/register 共用 `fetchVehicleStatuses` |
| `1ac1459` | register 持久化、frequency 3000～5000ms、Windows 部署脚本 |
| `d004f11` | 初版：Fastify、Mock 云、北斗两接口、调度器 |

**master 当前**：见 `git log origin/master -1`

---

## 3. 已实现功能清单

### 3.1 HTTP 接口（中转暴露给北斗）

| 接口 | 路径 | 文件 |
|------|------|------|
| 健康检查 | `GET /health` | `src/api/routes/beidou.ts` |
| 注册回调 | `POST /api/v1/beidou/callback/register` | 同上 |
| 反控导航 | `POST /api/v1/beidou/navigation` | 同上 |

#### register 请求（0630 定稿）

```json
{
  "url": "http://北斗/callback",
  "frequency": 4000
}
```

| 字段 | 规则 |
|------|------|
| `url` | 所有设备共用同一回调地址 |
| `frequency` | **3000～5000 ms**（`config/server.yaml` 可配 `frequencyMinMs/MaxMs`） |

> **北斗不传 `vehicleIds`**：中转按 `config/vehicles.yaml` 中 `enabled: true` 的车辆生成监控名单，在 **register 响应** 的 `data.vehicleIds` 中返回。

#### register 响应（节选）

```json
{
  "code": 0,
  "data": {
    "registeredAt": 1740469352000,
    "frequency": 4000,
    "vehicleCount": 2,
    "vehicleIds": ["hasun-test", "LU2606000100"],
    "vehicles": [{ "vehicleId": "hasun-test", "online": true, "workStatus": 1, "battery": 85 }],
    "configChanges": ["initial registration"]
  }
}
```

**行为**：
- **首次 register** 或 **url/frequency 变更**：停止旧调度 → 查云 → 持久化 → 重启推送
- **重复 register 且 url、frequency 未变**：**不重启**推送任务；仍查云并返回最新 `vehicles` 快照；`registeredAt` 保持不变；`configChanges: []`
- 电脑重启后从 `data/beidou-callback.json` 恢复，北斗无需重复 register

### 3.2 定时推送

| 项 | 实现 |
|----|------|
| 调度器 | `src/scheduler/pushScheduler.ts` |
| 推送目标 | `src/config/pushTargets.ts`（register 快照的 vehicleIds，源于 yaml 启用列表） |
| 持久化 | `src/store/callbackStore.ts` → `data/beidou-callback.json` |
| 每轮查云 | `cloudClient.fetchVehicleStatuses()` **一次批量** + 可选任务列表 |
| 推北斗 | 每车一条 POST，0629：`vehicleId` 在 `data` 内，`alertList[]` |

### 3.3 云平台 Client

文件：`src/clients/cloudClient.ts`

| 能力 | 路径/方式 | 状态 |
|------|-----------|------|
| 登录（admin） | `POST /system/auth/login` | ✅ `lingu_admin_login` |
| 登录（tpapi） | 公钥 + RSA + `POST /tpapi/auth/login` | ✅ `tpapi_login` |
| 批量设备（admin） | `POST /device/select_all_device` | ✅ `apiMode: admin` |
| **批量设备（tpapi）** | `POST /tpapi/device/get_device_detail_list` | ✅ `apiMode: tpapi` |
| 单车详情回退（admin） | `GET /device/select_device_detail_by_id` | ✅ admin 批量缺字段时 |
| 任务列表（admin） | `POST /device/select_task_by_page` | ✅ 补 currentTask |
| 下发 2010001（admin） | `POST /device/instructions` | ✅ 站名模式；**tpapi 模式未接** |
| refreshToken | — | ❌ tpapi 无；admin 未实现 |

#### 3.3.1 第三方 tpapi API（2026-06-30）

`apiMode: tpapi` + `auth.type: tpapi_login` 时，登录与查设备均走 **`https://sztu.lingubot.cn/third-party-api`**。

**账号策略（重要）**

| 环境 | 账号 | 用途 | 限制 |
|------|------|------|------|
| **联调测试** | `szjsdx` / 见 `docs/第三方对接接口.docx` | 验证公钥 + RSA 登录 + 查设备 | **只能查该账号绑定的 deviceId**；`LU2606000100` 等未绑定车可能查不到 |
| **正式发布** | 向云平台 **注册并申请** 专用机机账号 | 7×24 生产运行 | 需云平台开通、绑定正式车辆列表 |

测试账号配置（`.env`，勿提交 git）：

```ini
CLOUD_TPAPI_ID=szjsdx
CLOUD_USERNAME=szjsdx
CLOUD_PASSWORD=<docx 明文密码，程序内 RSA 加密>
```

| 接口 | Method | 路径 | 说明 |
|------|--------|------|------|
| 获取公钥 | GET | `/tpapi/auth/public_key?id={id}` | 无鉴权 |
| 登录 | POST | `/tpapi/auth/login` | Body: `{ username, password: RSA Base64 }` |
| **批量设备详情** | POST | `/tpapi/device/get_device_detail_list` | Body: `{ deviceIdList: [...] }`，Header: `Bearer` |

**批量查设备 — 响应结构（节选）**

```json
{
  "code": 0,
  "data": [
    {
      "id": "hasun-test",
      "online": true,
      "updateTime": 1782787812000,
      "details": {
        "workStatus": 1,
        "position": "114.396451,22.703971",
        "battery": 95,
        "taskId": "dd641d2b",
        "inNodeName": "花坛"
      },
      "errors": null
    }
  ]
}
```

| 字段 | 映射到中转 |
|------|------------|
| `online` | `CloudVehicleStatus.online` |
| `details.workStatus` | 北斗 `state` |
| `details.battery` | 北斗 `powerLevel` |
| `details.position` | x/y（依 `positionMode`） |
| `details.position_xyz` | 米制 x/y（车端上报后有值） |
| `details.taskId` | 北斗 `currentTask` |
| `errors` | `isAlert` / `alertMsg`（非 null 视为有故障） |

云平台说明：**全量返回**，车端上报字段齐后 `details` 会补全；`errors` 为故障明细。

**配置示例**：`config/cloud.tpapi.example.yaml`

```yaml
baseUrl: "https://sztu.lingubot.cn/third-party-api"
apiMode: "tpapi"
enrichTaskFromList: false
statusBatchPath: "/tpapi/device/get_device_detail_list"
auth:
  type: "tpapi_login"
  tpapiBaseUrl: "https://sztu.lingubot.cn/third-party-api"
  publicKeyId: "${CLOUD_TPAPI_ID}"
  username: "${CLOUD_USERNAME}"
  password: "${CLOUD_PASSWORD}"
```

**冒烟命令**

```powershell
npm run test:tpapi-login
npm run test:tpapi-devices -- hasun-test lingu_test2
```

**仍缺**

| 项 | 说明 |
|----|------|
| refreshToken | 登录响应无，过期重新 login |
| tpapi 站名反控 | ✅ `set_device_task_point` |
| tpapi 获取任务点 | ✅ `get_device_task_point`（响应字段待云确认） |
| tpapi 坐标反控 | ❌ 用 admin 2010001 或 navigation 传 taskPoint |
| `position_xyz` / `heading` | 商用版 HTTP 已有字段；待车端非 0 上报 |

**登录 — 请求/响应**（摘要）

| 项 | 值 |
|----|-----|
| URL | `POST https://sztu.lingubot.cn/third-party-api/tpapi/auth/login` |
| Header | `Content-Type: application/json` |
| Body | `{ "username": "<机机用户名>", "password": "<RSA加密后Base64>" }` |

**登录 — 响应**

```json
{
  "code": 0,
  "data": {
    "accessToken": "...",
    "expiresTime": 1764225918741
  },
  "msg": ""
}
```

`expiresTime` 为毫秒时间戳（文档注明约 **1 天**）；**无 refreshToken**，过期后重新走公钥 + 登录。

**代码位置**

| 文件 | 说明 |
|------|------|
| `src/clients/tpapiAuth.ts` | 取公钥、RSA 加密、登录 |
| `src/clients/cloudClient.ts` | tpapi 登录 + `fetchStatusesTpapiBatch` |
| `npm run test:tpapi-devices` | 登录后批量查设备冒烟 |

~~业务查车仍走 admin-api~~ → **tpapi 查车** `get_device_detail_list`；**站名反控** `set_device_task_point`（2026-06-30）；坐标反控仍 admin `2010001`。

**获取公钥 — 请求**

| 项 | 值 |
|----|-----|
| Query | `id=szjsdx`（必填，租户/接入方标识） |
| Header | 无特殊要求 |

**获取公钥 — 响应**

```json
{
  "code": 0,
  "data": "<RSA 公钥 Base64，无 PEM 头尾>",
  "msg": ""
}
```

**典型流程**：

```
GET public_key?id=szjsdx  →  RSA 加密明文 password  →  POST login  →  accessToken（约1天）
```

~~当前 `config/cloud.yaml` 仍为 `lingu_admin_login`；~~ 默认 `cloud.yaml` 仍为 admin 登录；切换见 `config/cloud.tpapi.example.yaml`。

**批量模式配置**（`config/cloud.yaml`）：

```yaml
statusQueryMode: batch          # batch | single
statusBatchPath: /device/select_all_device
```

### 3.4 字段映射

文件：`src/mapper/statusMapper.ts`

- 云 `workStatus` → 北斗 `state`
- 云 `battery` → 北斗 `powerLevel`
- 云 `position_xyz` 米制 → 北斗 x/y（`positionMode: map_xy`，**当前联调默认**；`lonlat` 仍可用）
- 云 `position` 经纬度 → 北斗 x/y（`positionMode: lonlat`，**待北斗确认是否接受经纬度**）
- 云 `heading` → 北斗 `direction`
- 任务名 → `currentTask`

### 3.5 客户机部署

| 文件 | 说明 |
|------|------|
| `docs/客户电脑部署指南.md` | Windows 安装与开机自启 |
| `scripts/windows/install.ps1` | 首次安装 |
| `scripts/windows/register-autostart.ps1` | 任务计划程序自启 |
| `scripts/mock-beidou-receiver.ps1` | 本地 Mock 北斗（9090），响应 `{"code":0}` |
| `scripts/real-cloud-smoke.ps1` | 真云 register + 等待推送冒烟 |
| `.env.example` | 云账号模板 |
| `src/config/loadEnv.ts` | 启动读 `.env` |

生产启动：`npm run build` → `node dist/main.js`（不是 tsx）

---

## 4. 与北斗/云平台已对齐的约定

### 4.1 北斗方（口头/文档，待正式签字）

| 约定 | 中转实现 |
|------|----------|
| 所有设备 **同一回调 url** | ✅ register 只存一个 url |
| 只有 **变更时** 才再次 register | ✅ 持久化 + 重启恢复 |
| register 响应返回 **vehicleIds** | ✅ yaml 启用列表，北斗无需事先知道 |
| frequency **一般 3000～5000ms** | ✅ 校验 + 默认可配 |
| 推送 `data.vehicleId` + `alertList[]`（0630） | ✅ 云批量查 + 北斗每车单独 POST |
| 再次 register **停旧任务启新任务** | ✅ stop + generation cancel + restart |

### 4.2 云平台方

| 约定 | 中转实现 |
|------|----------|
| 多车 **一次批量查** | ✅ `select_all_device` 默认 |
| **定时推送由中转做**，云不提供定时器 | ✅ PushScheduler |
| 定时器间隔由北斗 register 的 frequency 决定 | ✅ setInterval(frequency) |

---

## 5. 目录与关键文件

```
beidou-bridge/
  config/
    server.yaml          # 端口、推送重试、frequency 范围
    cloud.yaml           # 云 baseUrl、mock、statusQueryMode
    vehicles.yaml        # 默认车辆；联调车 LU2606000100（register 有 vehicleIds 时作 floor 回退）
    test/                # Mock 测试配置
    tpapi/               # A 阶段 tpapi 联调配置（独立 data-tpapi）
  data/
    beidou-callback.json # admin 联调 register 持久化
  data-tpapi/
    beidou-callback.json # tpapi A 阶段 register 持久化
  src/
    main.ts              # 入口，loadEnv + loadConfig
    api/routes/beidou.ts # 北斗两接口 + /health
    clients/cloudClient.ts
    clients/beidouClient.ts
    scheduler/pushScheduler.ts
    store/callbackStore.ts
    config/pushTargets.ts
    mapper/statusMapper.ts
  docs/                  # 见 §7 文档索引
  scripts/
    mock-beidou-receiver.ps1
    run-phase-a.ps1        # A 阶段：tpapi + hasun-test + Mock 9090
    real-cloud-smoke.ps1
    windows/             # 客户机部署
```

---

## 6. 如何本地运行与测试

### 6.1 Mock 模式（无需云账号）

```powershell
cd beidou-bridge
npm install
npm run build
$env:CONFIG_DIR = ".\config\test"
node dist/main.js
```

另开终端 Mock 北斗（可选）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\mock-beidou-receiver.ps1
# 监听 http://127.0.0.1:9090/callback，打印收到的 POST
```

测试 register：

```powershell
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8080/api/v1/beidou/callback/register `
  -ContentType "application/json" `
  -Body '{"url":"http://127.0.0.1:9090/callback","frequency":4000,"vehicleIds":["lingu_test2","V002"]}'
```

### 6.2 真云模式

```powershell
copy .env.example .env   # 填写 CLOUD_TENANT_NAME / CLOUD_USERNAME / CLOUD_PASSWORD（勿提交 git）
# config/cloud.yaml: mock: false, positionMode: map_xy
# config/vehicles.yaml: 联调车 LU2606000100 enabled: true
npm run build
node dist/main.js
```

另开终端 Mock 北斗 + 冒烟（或手动 register）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\mock-beidou-receiver.ps1
powershell -ExecutionPolicy Bypass -File scripts\real-cloud-smoke.ps1
```

register 示例（测试车 `LU2606000100`）：

```powershell
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8080/api/v1/beidou/callback/register `
  -ContentType "application/json" `
  -Body '{"url":"http://127.0.0.1:9090/callback","frequency":4000,"vehicleIds":["LU2606000100"]}'
```

**运行中现象**：register 成功后终端约每 `frequency` 毫秒刷一行（查云 + 推送），属正常；配置持久化在 `data/beidou-callback.json`，重启进程后会自动恢复推送。

### 6.3 已通过的 Mock 测试项（2026-06-29）

- [x] GET /health
- [x] register frequency 超出 3000～5000 → 400
- [x] register + vehicleIds → 返回 vehicles 快照
- [x] 定时推送到 Mock 北斗（多车）
- [x] navigation 反控
- [x] 再次 register → cancelled + 新 frequency/vehicleIds
- [x] beidou-callback.json 持久化

### 6.4 已通过的真云读链路联调（2026-06-30）

**环境**：`https://sztu.lingubot.cn/admin-api`，`mock: false`，`positionMode: map_xy`，回调为本机 Mock 北斗 `http://127.0.0.1:9090/callback`。

| 步骤 | 结果 | 备注 |
|------|------|------|
| 云登录 | ✅ | `POST /system/auth/login`，联调暂用超级管理员账号（上线前换机机账号） |
| register `LU2606000100` | ✅ | 返回 `battery=100`、`workStatus=0` |
| 批量查云 | ⚠️ | `select_all_device` 项字段不全，**自动回退** `select_device_detail_by_id`（日志：`batch item incomplete ... used detail fallback`） |
| 定时推送 | ✅ | 每 4s POST 到 Mock 北斗，Body 含 `vehicleId` + `data` |
| navigation 反控 | ⚠️ | 2026-06-30 站名「中德西北角」实测：中转收请求 OK，云 `instructions` **10s 超时** → 500 |

**register 快照（节选，2026-06-30）**：

```json
{
  "vehicleId": "LU2606000100",
  "online": false,
  "workStatus": 0,
  "battery": 100,
  "position": { "x": 0, "y": 0 }
}
```

**Mock 北斗收到的推送样例**：

```json
{
  "data": {
    "vehicleId": "LU2606000100",
    "x": 0, "y": 0, "z": 0, "floor": 1,
    "state": 0, "powerLevel": 100,
    "currentTask": "", "direction": 0,
    "isAlert": false, "alertList": []
  },
  "timestamp": 1782787765046
}
```

**已知现象（非中转 bug，待各方补齐）**：

| 现象 | 原因 / 负责方 |
|------|----------------|
| `x/y` 恒为 0 | 云侧 `position_xyz` 仍为 `0,0,0`，需 **孟泽/车端** 上报真实位置 |
| register 里 `online: false` | 批量接口 `online` 与后台展示可能不一致，待 **云平台** 确认 |
| `currentTask` 为空 | 云侧 `taskId`/`taskName` 暂无，任务列表也未命中 |
| scheduler 曾报 `beidou non-success code=undefined` | Mock 早期返回 `{"ok":true}`；已改脚本返回 `{"code":0,"message":"success"}` |

**持久化文件**（联调后生成，勿提交 git 若含内网 url）：

```json
// data/beidou-callback.json
{
  "url": "http://127.0.0.1:9090/callback",
  "frequency": 4000,
  "vehicleIds": ["LU2606000100"]
}
```

**未提交代码（develop 工作区，交接时注意）**：tpapi 全量、`config/tpapi/`、`run-phase-a.ps1`、admin 联调改动等。

### 6.5 A 阶段：tpapi + Mock 北斗（2026-06-30，已通过）

**目标**：云（tpapi）→ 中转 → **本机 Mock 北斗**，不依赖 admin 后台、不依赖真北斗 URL。

**环境**

| 项 | 值 |
|----|-----|
| 配置目录 | `CONFIG_DIR=./config/tpapi` |
| 云 API | `https://sztu.lingubot.cn/third-party-api`（`apiMode: tpapi`） |
| 测试账号 | `szjsdx`（见 `docs/第三方对接接口.docx`；**仅联调**，正式须注册机机账号） |
| 测试车 | `hasun-test`（该账号绑定设备；数据较全） |
| Mock 北斗 | `http://127.0.0.1:9090/callback` |
| 中转 | `http://127.0.0.1:8080` |
| 持久化 | `data-tpapi/beidou-callback.json`（与 admin 联调 `data/` 分离） |

**方式一：一键脚本（推荐）**

```powershell
cd beidou-bridge
# .env 或环境变量（勿提交 git）：
#   CLOUD_TPAPI_ID=szjsdx
#   CLOUD_USERNAME=szjsdx
#   CLOUD_PASSWORD=<docx 明文密码>
$env:CLOUD_PASSWORD = "<your-password>"
powershell -ExecutionPolicy Bypass -File scripts\run-phase-a.ps1
```

脚本会：释放 8080/9090 → 开 Mock 北斗窗口 → 开中转窗口 → register `hasun-test` → 等待推送。

**方式二：手动**

```powershell
cd beidou-bridge
npm run build
$env:CONFIG_DIR = ".\config\tpapi"
$env:CLOUD_TPAPI_ID = "szjsdx"
$env:CLOUD_USERNAME = "szjsdx"
$env:CLOUD_PASSWORD = "<your-password>"

# 终端 1
powershell -ExecutionPolicy Bypass -File scripts\mock-beidou-receiver.ps1

# 终端 2
node dist/main.js

# 终端 3
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:8080/api/v1/beidou/callback/register `
  -ContentType "application/json" `
  -Body '{"url":"http://127.0.0.1:9090/callback","frequency":4000}'
```

**验收结果（2026-06-30）**

| 步骤 | 结果 |
|------|------|
| tpapi 登录 | ✅ |
| register + 云快照 | ✅ `battery≈90`, `workStatus=1`, `taskId` 有值 |
| 定时推送 Mock | ✅ 约每 4s（看 Mock 窗口 POST） |

**下一阶段 B**：向北斗索取**真回调 URL**，将 register 的 `url` 从 Mock 地址改为北斗地址；见 §11.4、§12。

### 6.6 模拟联调实验室验收（2026-06-30，V2.3）

**脚本**：`npm run sim:lab` / `npm run sim:lab:mock` / `npm run sim:monitor` / `npm run sim:write`  
**文档**：[模拟联调实验室.md](./模拟联调实验室.md)

| 项 | 结果 | 说明 |
|----|------|------|
| Mock 北斗服务 | ✅ | `scripts/sim/mock-beidou-server.mjs`（Node，默认 **19090**；本机 9090 常被系统占用） |
| 读链路 monitor | ✅ | Mock 云模式 **6/6 轮 OK**（`state`/`battery` 与云 mock 一致） |
| 真云 admin 登录 | ✅ | 现场账号 **admin**（`.env` 配置，勿提交 git） |
| 查 LU2606000100 | ✅ | `workStatus`/`battery` 有值；`position_xyz`/`heading` 仍 0 |
| 站名反控 write | ❌ | `POST /navigation` + `taskPoint=中德西北角` → 云 `/device/instructions` 超时 |
| 真北斗端到端 | ❌ | 未接；接时仅改 register 的 `url` |

**Mock 与真北斗替换点**：register Body 中 `url` 从 `http://127.0.0.1:19090/callback` 改为北斗提供的回调地址；中转代码无需改。

**本机验收证据**（`data-sim/`，已在 `.gitignore`）：`lab-evidence.txt`、`lab-monitor-output.txt`、`write-path-station-test.txt`

---

## 7. 文档索引

| 文档 | 何时读 |
|------|--------|
| **本文** | AI/新人接手第一站 |
| [Git工作流.md](./Git工作流.md) | 提交、push、merge |
| [中转程序-第一期设计定稿.md](./中转程序-第一期设计定稿.md) | 接口定稿、映射、验收用例 |
| [实地部署待办清单.md](./实地部署待办清单.md) | 上线阶段任务与阻塞项 |
| [云平台-对接需求.md](./云平台-对接需求.md) | **发给云平台** |
| [北斗-对接需求.md](./北斗-对接需求.md) | **发给北斗** |
| [客户电脑部署指南.md](./客户电脑部署指南.md) | 客户 Windows 部署 |
| 协议 docx | 原始协议依据 |

---

## 8. 未完成 / 阻塞项（AI 下一步优先看这里）

### P0 — 阻塞 / 现场联调

| # | 项 | 负责方 | 状态 | 说明 |
|---|-----|--------|------|------|
| 1 | **`position_xyz` 有效非 0** | 车端（孟泽） | ⚠️ 仍 0,0,0 | 商用版 HTTP 已有字段；待定位上报 |
| 2 | **北斗回调 URL + 网络** | 北斗 + 现场 | ❌ | B1 真联调必需；Mock 实验室已通过，接真北斗只换 register url |
| 3 | **admin HTTP 字段** | 云平台 | ✅ | `workStatus`/`battery` 已返回；定位字段待车端 |
| 4 | **heading 有效值** | 车端（孟泽） | ⚠️ 当前 0 | 有字段，待商用版定位 |
| 5 | **taskId 无任务用 `""`** | 车端 | ⚠️ 当前 `"0"` 或 qt_* | 见 1010001 映射 §5 |
| 6 | **反控站名 mode** | 云 + 中转 | ⚠️ | 中转已实现；**云 instructions 超时**（2026-06-30） |
| 7 | refreshToken | 云平台 | ❌ | 长期运行，不挡 B1 |
| 8 | 正式机机账号 | 云平台 | ⚠️ | 现场 admin 可用 |

### P1 — 后续

| # | 项 |
|---|-----|
| 9 | tpapi 坐标反控 API（若后续提供） |
| 10 | 教研版 HTTP 字段与商用对齐 |

---

## 9. 给下一个 AI 的建议任务顺序

1. **读本文 §0、§6.6、§11.4** → [模拟联调实验室.md](./模拟联调实验室.md) → [到场前准备.md](./到场前准备.md)
2. **`git pull origin master`**，`npm run pre-site:install`
3. **出发前**：填 `.env`（admin）；`npm run pre-site:b1` 或 `npm run sim:lab`（真云 + LU2606000100）
4. **现场**：`scripts/site-start.bat` → Mock 预演 OK → 北斗 register（换真 url）→ 验收 code:1000
5. 孟泽：**商用版** + 非 0 `position_xyz`
6. B2：云确认 `instructions` 不超时后再测 navigation；站名 UTF-8 调用见 write-path-test
7. Mock 端口：**19090**（9090  Windows 常 EACCES）

---

## 10. 环境变量与配置速查

```ini
# .env
CLOUD_TENANT_NAME=超级管理员
CLOUD_USERNAME=xxx
CLOUD_PASSWORD=xxx
# CONFIG_DIR=./config/site   # 现场 B1，或 scripts/site-start.bat
```

```yaml
# config/cloud.yaml 要点
baseUrl: https://sztu.lingubot.cn/admin-api
mock: false
statusQueryMode: batch
statusBatchPath: /device/select_all_device
positionMode: map_xy   # 联调 LU2606000100；或 lonlat
```

```yaml
# config/server.yaml 要点
server: { host: "0.0.0.0", port: 8080 }
push:
  frequencyMinMs: 3000
  frequencyMaxMs: 5000
```

---

## 11. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-06-29 | 初版：完整开发记录、交接说明、提交历史、阻塞项 |
| V1.1 | 2026-06-30 | 补充真云读链路联调结果（LU2606000100）、§6.4、联调脚本、阻塞项状态更新 |
| V1.2 | 2026-06-30 | §3.3.1 第三方 tpapi 获取公钥接口（已实测，待登录文档接入） |
| V1.3 | 2026-06-30 | tpapi 登录已实现（`tpapiAuth.ts`、`tpapi_login` 配置） |
| V1.4 | 2026-06-30 | tpapi 批量查设备 `get_device_detail_list` + `errors` 故障映射 |
| V1.5 | 2026-06-30 | tpapi 测试账号 szjsdx 策略：仅绑定设备可查；正式须注册机机账号 |
| V1.6 | 2026-06-30 | §6.5 A 阶段步骤；§12 对外联调短消息（北斗/云平台） |
| V1.8 | 2026-06-30 | register 幂等：url+frequency 未变时不重启推送 |
| V1.9 | 2026-06-30 | 1010001 映射；B1 范围；workStatus 枚举 |
| V2.0 | 2026-06-30 | 到场前准备；商用版 HTTP 字段实测 |
| V2.1 | 2026-06-30 | tpapi set_device_task_point 站名反控 |
| V2.2 | 2026-06-30 | tpapi **get_device_task_point** 获取任务点位 |
| V2.3 | 2026-06-30 | Node Mock 北斗(19090)、sim:lab:mock、实验室 6/6 OK、站名反控云超时、接北斗交接 §11.4 |

---

## 11.4 接真北斗前检查清单（2026-06-30）

### 中转侧（已完成，无需改代码）

- [x] `POST /api/v1/beidou/callback/register`（url + frequency）
- [x] 定时推送：云批量查 → 每车 POST 到 register 的 url
- [x] 推送 Body：0630 字段 + `data.vehicleId` + `alertList[]`
- [x] Mock 实验室读链路 6/6 OK
- [x] register 持久化 `data/beidou-callback.json`，重启恢复
- [x] `POST /api/v1/beidou/navigation`（站名 / 坐标 / 北斗 x,y,direction）

### 到场当天顺序

| 步 | 操作 | 通过标志 |
|----|------|----------|
| 1 | `git pull origin master` + `npm ci` + `npm run build` | 无编译错误 |
| 2 | `.env` 填 admin；`npm run query:admin-device` | LU2606000100 有 workStatus/battery |
| 3 | `npm run sim:lab` 或 `run-pre-site-b1.ps1`（Mock **19090**） | monitor **OK**；Mock 有 PUSH |
| 4 | `scripts/site-start.bat` 常驻 | `/health` up |
| 5 | 北斗 POST register，`url`=**北斗回调** | 响应 `vehicleIds` 含 LU2606000100 |
| 6 | 等一个 frequency | 北斗收到 POST，回 **code:1000** |

### 仍缺外部输入（接北斗 P0）

| # | 项 | 负责方 |
|---|-----|--------|
| 1 | 北斗回调 URL（完整 http://...） | 北斗 |
| 2 | 北斗 → 中转机 8080 互通 | 现场 IT |
| 3 | 中转机 → 北斗回调 URL 互通 | 现场 IT |
| 4 | 北斗 register / 收推送 / 回 code:1000 | 北斗 |

### 测试结论汇报（给负责人）

| 类别 | 状态 |
|------|------|
| 读推送（Mock） | ✅ 通过 |
| 读推送（真云查车） | ✅ admin + LU2606000100 可查 |
| 读推送（真北斗） | ❌ 未接，等 URL |
| 写反控（站名） | ⚠️ 中转 OK，云 instructions 超时 |
| 定位字段 | ⚠️ position/heading 为 0，待孟泽商用版 |

---

## 11.3 tpapi 任务点位接口（2026-06-30）

| 接口 | 方法 | 路径 | 中转 |
|------|------|------|------|
| 获取 | GET | `/tpapi/device/get_device_task_point?deviceId=` | `fetchTpapiDeviceTaskPoints` |
| 下发 | POST | `/tpapi/device/set_device_task_point` | **A** `taskPoint` **B** `taskPointXYZW` |

**云 Body 双模式（对齐 2010001）**：站名只填 `taskPoint`；坐标只填 `taskPointXYZW`（`taskPoint` 空串）。北斗 x/y/direction 中转转为 `taskPointXYZW`。

冒烟：`npm run test:tpapi-get-task-point -- LU2606000100`

**待云确认**：GET 响应里**可选站点列表**字段（示例 data 像设备详情，非纯站点名数组）。

---

## 11.1 合入变更摘要（截至 2026-06-30）

### 2026-06-30 晚：到场前准备 + 云字段实测

| 变更 | 说明 |
|------|------|
| `config/site/` | 现场 B1 专用配置（admin、LU2606000100、`data-site/`） |
| `scripts/pre-site-check.ps1` | 到场前一键检查（`-Install` 安装编译） |
| `scripts/query-admin-device.ps1` | admin 查单车字段 |
| `scripts/run-pre-site-b1.ps1` | Mock 北斗 B1 预演 |
| `scripts/site-start.bat` | 现场启动（自动 `CONFIG_DIR=./config/site`） |
| [到场前准备.md](./到场前准备.md) | 携带清单、命令、现场速查 |

**LU2606000100 admin HTTP 实测（商用版，同 sztu）：**

| 字段 | 值 | 推北斗 |
|------|-----|--------|
| workStatus | 0（空闲） | state ✅ |
| battery | 37 | powerLevel ✅ |
| position_xyz | 0.00,0.00,0.00 | x/y ❌ 待定位 |
| heading | 0 | direction ⚠️ |
| taskId | "0" | currentTask ⚠️ |

**结论**：云 HTTP 字段通路 OK，**B1 链路可验**；坐标/朝向待孟泽商用版 + 定位。

### 2026-07-02：MQTT 无外网现场 + 真北斗 B1（AI 会话）

| 变更 | 说明 |
|------|------|
| **架构** | `dataSource: mqtt`：车端 5G → 中转机 Mosquitto → bridge 订阅 1010001 → HTTP 推北斗；**不访问云平台** |
| **代码** | `MqttVehicleDataSource`、`vehicleStatusStore`、`mqtt1010001Mapper`；`VehicleDataSource` 抽象 cloud/mqtt |
| **配置** | `config/site/mqtt.yaml`；`config/site/server.yaml` → `dataSource: mqtt`；现场车 **`LU2605000922`** |
| **脚本/bat** | `START-bridge.bat`、`SIMULATE-vehicle.bat`、`CHECK-env.bat`、`OPEN-firewall-*.bat`、离线 U 盘打包 |
| **测试** | `npm run test:mqtt-lab`（自动化 MQTT 实验室） |
| **文档** | MQTT 部署/对接/启动 Word；[MQTT现场对接指南.md](./MQTT现场对接指南.md) |
| **现场验收** | 5G 模拟 + 北斗 register + 定时推送 **已通过**；真车 LU2605000922 **待联调** |

**现场地址（2026-07-02）**

| 项 | 值 |
|----|-----|
| 中转机 | `192.168.199.88:8080` |
| Mosquitto | `192.168.199.88:1883` |
| 北斗回调 | `http://192.168.199.89:7055/patroL_vehicle/V1/vehicle/data` |
| 现场车 SN | `LU2605000922` |

**加车（不改代码）**

1. 编辑 `config/site/vehicles.yaml`（`vehicleId` = `clientId` = 车端 SN）  
2. 重启 `START-bridge.bat`  
3. 重新 `POST /api/v1/beidou/callback/register`  

**关键文件**

| 文件 | 职责 |
|------|------|
| `src/clients/mqttVehicleDataSource.ts` | 订阅 `dev/pub/{clientId}`，缓存 1010001 |
| `src/store/vehicleStatusStore.ts` | MQTT 状态内存；15s stale |
| `config/site/vehicles.yaml` | 推送车辆名单 |
| `data-site/beidou-callback.json` | register 持久化（gitignore，运行时生成） |

**接手命令**

```powershell
git pull origin main
cd beidou-bridge
npm ci && npm run build
npm run test:mqtt-lab          # 有网开发机验证
# 现场：START-bridge.bat + register + SIMULATE-vehicle 或真车
```

### 协议与北斗（既有）

| 变更 | 说明 |
|------|------|
| 正式协议 | `docs/中转系统与北斗系统交互协议0630.docx` |
| register | 请求 `url`+`frequency`；**响应**返回 `vehicleIds`+`vehicles`（yaml 启用列表） |
| register 幂等 | 同 url+frequency 重复请求 **不重启推送**，响应仍查最新云快照 |
| 推送 | `data.vehicleId` + `alertList[]`；云批量查 + 北斗每车单独 POST |
| Mock 北斗 | `code:1000` |

### 文档（AI/现场接手）

| 文档 | 用途 |
|------|------|
| [现场联调检查表.md](./现场联调检查表.md) | 到场步骤与验收 |
| [1010001字段与北斗映射.md](./1010001字段与北斗映射.md) | 云车字段 → 北斗、枚举、待确认项 |
| [协议0629-中转响应定稿.md](./协议0629-中转响应定稿.md) | JSON 定稿 |

### 代码要点

| 文件 | 职责 |
|------|------|
| `src/api/routes/beidou.ts` | register / navigation |
| `src/mapper/statusMapper.ts` | 1010001 → 北斗 data |
| `src/clients/cloudClient.ts` | admin 批量查 + admin 2010001 下发 |
| `src/clients/tpapiAuth.ts` | tpapi 登录（A 阶段） |
| `config/vehicles.yaml` | 现场车 `LU2606000100` |

### 接手后命令

```powershell
git pull origin master
cd beidou-bridge && npm ci && npm run build
copy .env.example .env   # admin 账号
node dist/main.js
# 本地预演：scripts/run-phase-a.ps1（tpapi，与现场 admin 不同）
```

---

## 12. 对外联调短消息（可复制发送）

> 详细需求见附件：`docs/北斗-对接需求.md`、`docs/云平台-对接需求.md`、**[现场联调检查表.md](./现场联调检查表.md)**。

### 12.1 发给北斗方（当前推荐）

**主题**：0630 协议 — 请提供回调 URL，现场 register 联调

各位好，

我方中转程序已按 **《中转系统与北斗系统交互协议0630》** 完成开发：

- register：贵方只需 POST `url` + `frequency`；响应返回本项目全部巡检车 `vehicleIds`
- 推送：每车单独 POST 到同一回调地址，`data.vehicleId` 区分车辆；贵方返回 `code:1000`
- 反控：按需 POST `vehicleId` + 坐标

请协助（P0）：**联调回调 URL**、网络互通、联调联系人。  
附件：0630.docx、`docs/现场联调检查表.md`

---

### 12.1-old 发给北斗方（历史模板）

**主题**：beidou-bridge 第一期联调 — 请提供回调 URL 与字段确认

各位好，

我方 **beidou-bridge（云平台 ↔ 中转 ↔ 北斗）** 第一期开发进度如下：

- 中转程序已完成：注册回调、定时推送、反控转发接口；
- **A 阶段已通过**：已从云平台拉取车辆状态，并按协议格式 POST 到本地测试接收器（Mock）；
- 下一步进入 **B 阶段**：需北斗提供 **真实回调 URL**，用于接收车辆状态推送。

请北斗方协助提供（P0）：

1. **联调环境回调地址**（完整 URL，如 `http://ip:port/...`），用于我方 register；
2. **网络要求**：是否限制来源 IP；我方中转部署 IP 确定后回传；
3. **字段确认**：推送 Body 中 `x/y` 为 **米制地图坐标** 还是 **经纬度**；`z`、`direction`、`alertType` 枚举含义；
4. **联调联系人**。

我方将提供：

- 中转内网地址与端口（默认 `8080`）；
- 接口说明：`POST /api/v1/beidou/callback/register`、`POST /api/v1/beidou/navigation`、`GET /health`；
- 附件：《北斗-对接需求.md》。

感谢配合。

---

### 12.2 发给云平台（hasun / 第三方接口）

**主题**：beidou-bridge tpapi 联调进展 — 请补充反控接口与正式账号

各位好，

我方中转程序 **beidou-bridge** 已对接贵方 **third-party-api / tpapi**，当前进展：

- ✅ 获取公钥、`/tpapi/auth/login`（RSA 加密）、`POST /tpapi/device/get_device_detail_list`；
- ✅ 测试账号 `szjsdx` 登录与查 `hasun-test` 设备已成功；
- ✅ 定时推送至 Mock 接收器（A 阶段验收通过）。

请云平台协助（P0）：

1. **正式第三方账号注册流程**（上线不可用测试号 `szjsdx`）及绑定的 `deviceId` 列表；
2. **tpapi 下发导航 / 2010001** 接口文档（含 **坐标模式** Request 示例；站名模式我方已在 admin-api 验证）；
3. **`details` / `errors` 字段完整说明**（尤其 `position_xyz`、`heading`、故障结构）；
4. **Token 刷新**：登录响应无 refreshToken，请确认过期后是否仅允许重新 login。

附件：《云平台-对接需求.md》§3、§8 回复栏。

感谢配合。
