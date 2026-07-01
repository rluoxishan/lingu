# 孟泽 — AI 联调助手（现场）

> **给孟泽**：在 Cursor 里打开 **本文件**，对 AI 说下面任意一句即可，AI 会带你一步步做完。  
> **给 AI**：用户表明孟泽身份或联调意图时，**必须**按本文「AI 执行清单」自动执行命令，不要只给文字步骤。

---

## 孟泽对 AI 怎么说（复制一句）

```
我是孟泽，要进行联调测试，请按 docs/孟泽-AI联调助手.md 带我做完。
```

或简短：

```
我是孟泽，帮我做现场 B1 联调。
```

---

## 你的分工（孟泽）

| 你来做 | 不用你做 |
|--------|----------|
| 确保 **LU2606000100 商用版** 已启动 | 提供中转机（北斗提供） |
| 把 **.env** 放到解压后的项目根目录 | 改程序代码 |
| 按 AI 提示在中转机上点确认/看窗口 | B2 反控（本次不测） |

---

## AI 执行清单（AI 必须按顺序做）

用户为孟泽联调时，AI **逐项执行**，每步报告 OK/FAIL：

### 阶段 0 — 确认环境

| 步 | AI 动作 | 通过标准 |
|----|---------|----------|
| 0.1 | 确认项目根目录含 `dist/main.js`、`config/site`、`scripts/site-start.bat` | 文件存在 |
| 0.2 | 运行 `node -v` | v20+ |
| 0.3 | 检查 `.env` 存在且非占位（非 your-password） | 有 CLOUD_* |
| 0.4 | 若无 `.env`，提示孟泽从我方领取，**勿编造密码** | — |

### 阶段 1 — 安装检查（可选，有 zip 且缺 dist 时）

```powershell
npm run pre-site:install
```

或解压后运行 `INSTALL.bat`。

### 阶段 2 — 查云 + 车端

```powershell
npm run query:admin-device
```

| 字段 | 说明 |
|------|------|
| workStatus / battery | 应有值 |
| position_xyz / heading | 为 0 时提醒孟泽开商用版，**不挡 B1** |

### 阶段 3 — 启动中转

1. 检查 8080 是否占用，占用则提示关闭旧进程  
2. 启动：

```powershell
scripts\site-start.bat
```

（后台运行或新开终端）

3. 验证：

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

预期：`status = up`

### 阶段 4 — Mock 预演（接北斗前，推荐）

```powershell
npm run sim:lab
```

或分步：

```powershell
node scripts/sim/mock-beidou-server.mjs    # 19090
# 另开终端 site-start.bat
# register + monitor
```

**通过**：monitor 显示 `[Compare] OK`；Mock 窗口有 periodic PUSH。

> Mock 端口 **19090**，不要用 9090。

### 阶段 5 — 接真北斗（北斗 URL 到位后）

1. 向孟泽确认：北斗 **回调 URL**、中转机 **IP**  
2. 北斗 POST：

```http
POST http://<中转IP>:8080/api/v1/beidou/callback/register
Content-Type: application/json

{"url":"http://<北斗回调URL>","frequency":4000}
```

3. 等 4~8 秒，确认：
   - register 响应含 `LU2606000100`
   - 北斗侧收到 POST
   - 北斗回 **code: 1000**
   - 中转日志 `[scheduler] pushed vehicle=LU2606000100`

### 阶段 6 — 验收结论（AI 输出模板）

```markdown
## 联调结果
- 中转 health: OK / FAIL
- 云查车 LU2606000100: OK / FAIL
- Mock 预演: OK / FAIL / 跳过
- 真北斗 B1: OK / FAIL / 未接（缺 URL）
- 备注: ...
```

---

## 常见问题（AI 自动排查）

| 现象 | AI 处理 |
|------|---------|
| 无 Node.js | 提示安装 Node 20 LTS，给链接 https://nodejs.org/ |
| 无 .env | 停止，请孟泽联系我方索取，勿猜测密码 |
| 8080 占用 | `Get-NetTCPConnection -LocalPort 8080` 查进程并建议关闭 |
| 云登录失败 | 检查 `.env`，运行 query-admin-device |
| Mock 9090 失败 | 改用 19090 + mock-beidou-server.mjs |
| battery/position 为 0 | 提醒孟泽商用版；B1 仍可继续 |
| navigation 超时 | 说明 B2 未测，不阻塞 B1 |

---

## 相关文档

| 文档 | 用途 |
|------|------|
| [现场部署清单.md](./现场部署清单.md) | 完整步骤 |
| [给孟泽-现场部署包说明.md](./给孟泽-现场部署包说明.md) | zip 内容 |
| [现场联调检查表.md](./现场联调检查表.md) | 签字验收 |
| [联调协调说明.md](./联调协调说明.md) | 北斗时间与环境 |

---

## 部署包从哪来

若目录里没有程序，孟泽应已有：

1. `beidou-bridge-site-YYYYMMDD.zip`（我方提供）  
2. `.env`（单独私发）  

解压到例如 `D:\beidou-bridge`，在 Cursor 中 **打开该文件夹** 作为工作区，再对 AI 说「我是孟泽…」。
