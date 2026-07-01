# 变更日志（CHANGELOG）

本文件记录各版本**功能级**变更，便于追溯。详细交接见 [开发记录与AI交接.md](./开发记录与AI交接.md)。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

### 计划中
- refreshToken 自动刷新
- tpapi 坐标反控 API（若云平台提供）
- 教研版 HTTP 字段与商用对齐

---

## [0.6.1] - 2026-06-30

### Added
- tpapi **获取任务点位**：`GET /tpapi/device/get_device_task_point?deviceId=`
- `cloudClient.fetchTpapiDeviceTaskPoints`、`npm run test:tpapi-get-task-point`

### Changed
- 文档：任务点位 get/set 成对记录；待云确认可选站点列表字段

---

## [0.6.0] - 2026-06-30

### Added
- tpapi **下发任务点位**：`POST /tpapi/device/set_device_task_point`（`deviceId` + `taskPoint`）
- navigation 支持 **站名模式**：Body `{ vehicleId, taskPoint }` 与坐标模式二选一
- `npm run test:tpapi-set-task-point` 冒烟脚本

### Changed
- tpapi 模式坐标反控仍走 admin `2010001`；站名反控走 tpapi 新接口
- [云平台-对接需求.md](./docs/云平台-对接需求.md) 功能 D1/D2 拆分

---

## [0.5.0] - 2026-06-30

### Added
- [到场前准备.md](./docs/到场前准备.md)：出发前检查、携带清单、现场速查
- `config/site/`：现场 B1 专用配置（LU2606000100、独立 `data-site/`）
- 脚本：`pre-site-check.ps1`、`query-admin-device.ps1`、`run-pre-site-b1.ps1`、`site-start.bat`
- npm：`pre-site:check`、`pre-site:install`、`pre-site:b1`、`query:admin-device`

### Changed
- 商用版 admin HTTP 已确认返回 `workStatus`/`battery`/`position_xyz`/`heading`（同 sztu）
- [开发记录与AI交接.md](./docs/开发记录与AI交接.md) V2.0：§8 阻塞项、§11.1 字段实测
- [1010001字段与北斗映射.md](./docs/1010001字段与北斗映射.md) §5 更新 LU2606000100 HTTP 样例

---

## [0.4.0] - 2026-06-30

### Added
- [1010001字段与北斗映射.md](./docs/1010001字段与北斗映射.md)：workStatus §5.6.1 枚举、云→北斗映射、车端确认清单
- 现场 B1 联调范围说明（admin + LU2606000100，不测 navigation）

### Changed
- register **幂等**：url+frequency 未变时不重启推送，响应仍刷新云快照
- register 请求**不再**要求北斗传 `vehicleIds`；由 `vehicles.yaml` 解析并在**响应**返回
- 推送 Body 对齐 **0630 协议**：`data.vehicleId`、`alertList[]`
- Mock 北斗回调响应 `code: 1000`
- [开发记录与AI交接.md](./docs/开发记录与AI交接.md) V1.9：AI 接手路径、§8 阻塞项、§11.1 合入摘要

---

## [0.3.0] - 2026-06-29

### Added
- Git 分支规范：`develop` 日常开发，`master` 稳定合并目标（`docs/Git工作流.md`）
- 云平台**批量查状态**：默认 `POST /device/select_all_device`，每轮推送 1～2 次 HTTP
- 任务列表 5 秒缓存，减少 `select_task_by_page` 调用

### Changed
- `PushScheduler` 使用 `fetchVehicleStatuses` 批量拉取，不再逐车 `getVehicleStatus`
- register 与定时推送共用同一套查云逻辑

---

## [0.2.0] - 2026-06-29

### Added
- register 必填 **`vehicleIds`**，持久化到 `beidou-callback.json`
- register 时**透传云平台**查询设备信息，响应返回 `vehicles` 快照
- frequency 限制 **3000～5000 ms**
- 再次 register：**停止旧推送**、generation 作废进行中 tick、启动新任务
- Windows 客户机部署：`scripts/windows/*`、`.env`、`docs/客户电脑部署指南.md`
- 生产启动：`npm run build` + `node dist/main.js`，`loadEnv.ts` 读 `.env`

### Changed
- 推送车辆列表优先使用 register 的 `vehicleIds`（`pushTargets.ts`）
- navigation 校验 register 中的 vehicleIds

---

## [0.1.1] - 2026-06-29

### Changed
- 文档整理：`云平台-对接需求.md`、`北斗-对接需求.md`、`实地部署待办清单.md`
- 删除重复云/北斗需求文档

---

## [0.1.0] - 2026-06-29

### Added
- 初版 beidou-bridge：Fastify HTTP 服务
- `POST /api/v1/beidou/callback/register`（url + frequency）
- `POST /api/v1/beidou/navigation`（反控 + vehicleId）
- 定时推送调度器、北斗 HTTP Client、回调持久化
- 云平台 Client：login、device detail、select_all_device、instructions 2010001
- Mock 云模式、字段映射 `statusMapper`
- 2010001 Body 对齐管理后台抓包（站名模式）

---

[Unreleased]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/compare/master...develop
[0.6.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/compare/a387c07...master
[0.5.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/compare/e5538fe...master
[0.4.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/compare/159e7f4...master
[0.3.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/commit/731ddbb
[0.2.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/commit/1ac1459
[0.1.1]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/commit/71470f1
[0.1.0]: https://192-168-0-128.lingubot.direct.quickconnect.cn:5001/git/platform_software/Beidou_bridge/commit/d004f11
