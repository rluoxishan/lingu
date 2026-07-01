# beidou-bridge

云平台与北斗系统之间的 HTTP 中转程序（第一期）。

> **AI/新人接手**：请先读 [docs/开发记录与AI交接.md](./docs/开发记录与AI交接.md)  
> **现场部署（孟泽）**：请读 **[docs/孟泽-AI联调助手.md](./docs/孟泽-AI联调助手.md)**（Cursor 说「我是孟泽联调」）  
> **现场部署（清单）**：请读 **[docs/现场部署清单.md](./docs/现场部署清单.md)**  
> **出发前准备**：请读 [docs/到场前准备.md](./docs/到场前准备.md)  
> **现场联调**：请读 [docs/现场联调检查表.md](./docs/现场联调检查表.md)  
> **变更历史**：见 [CHANGELOG.md](./CHANGELOG.md)

## 架构

```
车端 ──MQTT──► 云平台 ──HTTP+鉴权──► beidou-bridge ──HTTP内网──► 北斗系统
```

## 资料

文档索引见 [docs/README.md](./docs/README.md)。

| 文档 | 用途 |
|------|------|
| [现场部署清单](./docs/现场部署清单.md) | **孟泽现场**：安装、配置、Mock、接北斗 |
| [到场前准备](./docs/到场前准备.md) | **出发前**一键检查与 Mock 预演 |
| [现场联调检查表](./docs/现场联调检查表.md) | **到场当天**主文档 |
| [开发记录与AI交接](./docs/开发记录与AI交接.md) | 接手、变更摘要 |
| [实地部署待办清单](./docs/实地部署待办清单.md) | 从现在到上线的任务跟踪 |
| [云平台-对接需求](./docs/云平台-对接需求.md) | 发给云平台 |
| [北斗-对接需求](./docs/北斗-对接需求.md) | 发给北斗方 |

## 第一期能力

| 接口 | 路径 | 说明 |
|------|------|------|
| 健康检查 | `GET /health` | 探活 |
| 注册回调 | `POST /api/v1/beidou/callback/register` | 北斗注册 url + frequency |
| 反控导航 | `POST /api/v1/beidou/navigation` | 北斗下发坐标，转发云平台 |
| 定时推送 | （内部调度） | 按 frequency 向北斗 url POST 各车状态 |

## Git 工作流

日常开发在 **`develop`** 分支进行，测试通过后合并到 **`master`**，不直接向 `master` push。

详见 [docs/Git工作流.md](./docs/Git工作流.md)。

```powershell
git checkout develop
git pull origin develop
# 开发、提交...
git push origin develop
# 合并到 master 见文档
```

## 快速开始

```bash
cd beidou-bridge
npm install
npm run dev
```

默认监听 `http://0.0.0.0:8080`。

### 真云模式（sztu.lingubot.cn）

```powershell
cd beidou-bridge
$env:CLOUD_TENANT_NAME = "超级管理员"
$env:CLOUD_USERNAME = "your-user"
$env:CLOUD_PASSWORD = "your-password"
npm run dev
```

`config/cloud.yaml` 已配置 `baseUrl: https://sztu.lingubot.cn/admin-api`，`mock: false`。

开发 Mock：`config/cloud.yaml` 设 `mock: true` 则无需云平台账号。

阻塞项与进度见 [docs/实地部署待办清单.md](./docs/实地部署待办清单.md)。

## 客户电脑部署（Windows 开机自启）

详见 **[docs/客户电脑部署指南.md](./docs/客户电脑部署指南.md)**。

```powershell
# 首次安装（需 Node.js 20+）
npm run install:windows

# 编辑 .env 和 config\vehicles.yaml 后测试
scripts\windows\start-bridge.bat

# 注册开机自启动（需管理员）
npm run autostart:install
```

生产环境使用编译后的 `node dist/main.js` 启动，账号密码写在项目根目录 `.env`（参考 `.env.example`）。

## 配置

| 文件 | 说明 |
|------|------|
| `config/server.yaml` | 监听地址、推送重试 |
| `config/cloud.yaml` | 云平台 baseUrl、登录账号（环境变量）、positionMode、**statusQueryMode** |
| `config/vehicles.yaml` | 车辆清单 vehicleId / clientId / floor |

环境变量：`CLOUD_TENANT_NAME`、`CLOUD_USERNAME`、`CLOUD_PASSWORD`。

指定配置目录：`CONFIG_DIR=./config npm start`

## 本地验证

注册北斗回调（Mock 推送目标可用 [webhook.site](https://webhook.site) 或本地 mock 服务）：

```bash
curl -X POST http://127.0.0.1:8080/api/v1/beidou/callback/register ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"http://127.0.0.1:9090/callback\",\"frequency\":4000}"
```

反控导航：

```bash
curl -X POST http://127.0.0.1:8080/api/v1/beidou/navigation ^
  -H "Content-Type: application/json" ^
  -d "{\"vehicleId\":\"V001\",\"x\":21.64,\"y\":86.28,\"z\":1.42,\"direction\":82,\"floor\":1}"
```

## 目录结构

```
beidou-bridge/
  docs/                 # 设计定稿、云/北斗接口需求、协议 docx
  config/               # 运行配置
  data/                 # 北斗回调注册持久化
  src/
    api/                # HTTP 服务与路由
    clients/            # 云平台、北斗 HTTP 客户端
    config/             # 配置加载
    mapper/             # 云状态 → 北斗字段
    scheduler/          # 定时推送
    store/              # 回调注册存储
    models/             # 类型定义
```

## 后续待接

- [ ] 确认 `POST /device/instructions` **2010001** Body（抓包「保存/执行任务」）
- [ ] refreshToken 接口与自动刷新
- [ ] 北斗确认 z、direction、经纬度 vs 米制 x/y
- [ ] 中转专用机机账号（替代 admin 登录）
