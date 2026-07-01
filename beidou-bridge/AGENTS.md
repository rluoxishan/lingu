# beidou-bridge — Agent 指引

> AI 接手本项目时请先读本文。现场联调有专用流程。

## 项目是什么

云平台 ↔ **beidou-bridge（中转）** ↔ 北斗。Node.js 20+，默认端口 **8080**，现场车 **LU2606000100**，配置目录 **`config/site`**。

## 文档索引

| 文档 | 用途 |
|------|------|
| [docs/孟泽-AI联调助手.md](./docs/孟泽-AI联调助手.md) | **孟泽现场联调：AI 逐步引导** |
| [docs/现场部署清单.md](./docs/现场部署清单.md) | 完整部署与验收步骤 |
| [docs/给孟泽-现场部署包说明.md](./docs/给孟泽-现场部署包说明.md) | 部署包内容说明 |
| [docs/开发记录与AI交接.md](./docs/开发记录与AI交接.md) | 开发状态、阻塞项 |

---

## 孟泽现场联调模式（重要）

当用户说 **「我是孟泽」**、**「现场联调」**、**「联调测试」** 或打开 `docs/孟泽-AI联调助手.md` 时：

1. **立即阅读** [docs/孟泽-AI联调助手.md](./docs/孟泽-AI联调助手.md)，按其中 **AI 执行清单** 逐步操作。
2. **你自己运行命令**（`node -v`、启动、health、查云、Mock），不要只贴步骤让用户自己做。
3. **不要**修改业务代码，除非用户明确要求或脚本明显报错。
4. **不要**提交 `.env` 或把密码写入 git。
5. 中转机由 **北斗提供**；孟泽负责 **LU2606000100 商用版** 在线。
6. 本次主验 **B1 读推送**；**B2 反控** 默认不测（云 instructions 曾超时）。
7. Mock 北斗用 **19090**（`mock-beidou-server.mjs`），不要用 9090。

## 常用命令

```powershell
scripts\site-start.bat              # 启动中转（config/site）
npm run query:admin-device          # 查 LU2606000100
npm run pre-site:install            # 安装+检查
npm run sim:lab                     # Mock 实验室（真云）
Invoke-RestMethod http://127.0.0.1:8080/health
npm run package:site                # 打部署 zip
```

## 关键路径

- 配置：`config/site/`（勿混用 `config/tpapi`）
- 账号：项目根 `.env`（`CLOUD_*`，勿提交）
- 启动：`scripts/site-start.bat`（已设 `CONFIG_DIR=./config/site`）
