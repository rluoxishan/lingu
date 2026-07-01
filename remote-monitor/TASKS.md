# 远程监控与控制 — 任务清单



> 最后更新：2026-07-01



**实现分档**：**V1.0** · **协议·车端** · **协议·中位机** · **待抓包（暂缓）**



**瑜权材料**：[确认清单-协议与改动.md](./docs/确认清单-协议与改动.md) · [上下位机串口协议830.pdf](./docs/上下位机串口协议830.pdf)



---



## 阶段 1：对外协议（当前）



- [x] 从 R13 裁剪 Draft

- [x] 瑜权确认清单已回

- [x] 前端对照表已标分档

- [x] 协议 Draft §1.5 / §12 已合并确认清单结论

- [ ] 对照口岸/江阴模板，出 **V1.0 正式版** Word

- [ ] 发 Word 给项目组 / 吉狮客户（如需）



### 暂缓



- [ ] ~~抓包 playUrl~~（用户决定后做）



### 产品决策（已采纳）



- [x] 取消独立「刹车灯」→ 急停统一 **2010008**

- [x] **sensorStatus** 不进 V1.0，标 P2



---



## 阶段 2：云平台后端



- [ ] 开/关摄像头 API → 响应 playUrl（抓包后再定形）

- [ ] 控制 REST：`device/instructions` 或 MQTT 转发



---



## 阶段 3：前端 + 联调



### 已完成



- [x] 监控页 UI 三模式 + 五路视频布局

- [x] **云平台遥测**：`select_device_detail_by_id` 轮询（battery/taskId/workStatus 等）

- [x] **mqttPayload.ts** + **monitorControl.ts**（Mock 日志，§八 映射）

- [x] 控制台去刹车灯；急停按钮文案修正



### 待做



- [ ] VideoPanel WebRTC（依赖抓包 / 后端开流 API）

- [ ] `VITE_MONITOR_CONTROL_ENABLED=true` 时接真控制 API

- [ ] 第二批：1010001 扩展、WORK/GIMBAL 真联调



---



## 阶段 4：AI 事件检测（可选）



- [ ] 评估是否在监控页展示 AI 告警



---



## 不在本专项范围



- Hasun ThingsBoard RPC、北斗中转 HTTP、全量 MQTT 2010001 等


