# 远程监控与控制 — 任务清单

> 最后更新：**2026-07-03**（当前聚焦：**文档定稿**）

**实现分档**：**V1.0** · **协议·车端** · **协议·中位机** · **V2 云平台 API** · **待抓包（暂缓）**

**材料索引**：[确认清单](./docs/确认清单-协议与改动.md) · [V1.0 车端](./docs/灵鱿科技远程监控与控制协议-V1.0.0.md) · [V2 云 API](./docs/灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md) · [联调记录](./docs/internal/联调记录-2026-07-03.md) · [发给瑜权](./docs/internal/发给瑜权-M1联调确认单.md) · [发给Hasun](./docs/internal/发给Hasun-API确认单.md)

---

## 当前阶段：文档定稿

### 文档 A — V1.0 车端 MQTT 篇

- [x] 瑜权确认清单已回并合并
- [x] §12 开放项关闭（view 1–4、WORK 枚举、url 格式、reply 顶层）
- [x] 模式 B：speed=m/s、angle=rad + 车型兼容
- [x] 2010005 频率 10–30 Hz；2010002 更新时发送
- [x] §10.6 WorkAction 枚举
- [ ] **M1 联调记录** P0 勾选（[联调记录-2026-07-03.md](./docs/internal/联调记录-2026-07-03.md)）
- [ ] 对照口岸/江阴模板，出 **V1.0 正式版 Word**
- [ ] 发 Word 给项目组 / 吉狮（如需）

### 文档 B — V2.0 云平台 API 篇

- [x] 大纲与章节骨架（[V2.0-云平台API篇.md](./docs/灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md)）
- [ ] 鉴权 / 状态 API 补正式示例（可摘自 OpenAPI）
- [x] 开流 playUrl API（**2010004 + instructions**，sztu 已抓包；view 1–4 五路 JSON 已写入 V2）
- [ ] view=5 环视开流实测 JSON
- [x] 关流请求格式（status=0 + cameraName，sztu 已抓包）
- [ ] 关流响应 status 语义、无观众 T 秒超时
- [x] 控制转发 API 路径与 Body 写入 V2（`POST /device/instructions`）
- [ ] 控制转发 M1 实测通过
- [ ] V2.0 Word 版（套模板）

### 配套文档

- [x] 变更说明 r7 要点写入 md 修订历史
- [ ] 更新 [变更说明 r7](./docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r7.md)（可选单独文件）
- [x] [前端-协议字段对照-评审表](./docs/前端-协议字段对照-评审表.md) 与 V1.0 同步
- [ ] [README.md](./README.md) 双文档索引（已更新则勾选）

---

## 阶段 2：M1 实验（与定稿并行）

- [ ] 与瑜权确认 M1 远程控制软件部署（[确认单](./docs/internal/发给瑜权-M1联调确认单.md)）
- [ ] 云平台对 M1 下发 2010005 / 2010008 / 2010002
- [ ] 填写联调记录 → 回写确认清单 §七 P0
- [ ] 确认清单 §七 ①–④、⑮ 勾选

---

## 阶段 3：前端 + 真联调（文档定稿后）

### 已完成

- [x] 监控页 UI 三模式 + 五路视频布局
- [x] 云平台遥测轮询
- [x] mqttPayload + monitorControl Mock

### 待做

- [x] VideoPanel WebRTC 骨架（`VITE_MONITOR_CAMERA_ENABLED=true`）
- [x] `VITE_MONITOR_CONTROL_ENABLED` 接 `POST /device/instructions`（待 M1 实测）
- [ ] 1010001 扩展、WORK/GIMBAL 真联调

---

## 暂缓

- [ ] playUrl F12 抓包（用户决定后做）
- [ ] sensorStatus（P2，不进 V1.0）
- [ ] AI 事件检测（可选）

---

## 不在本专项范围

- beidou-bridge / 北斗中转
- Hasun ThingsBoard RPC
- 全量 MQTT 2010001 任务协议
