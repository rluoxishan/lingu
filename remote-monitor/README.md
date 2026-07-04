# 远程监控与控制（吉狮）



本目录集中管理 **远程监控 + 远程控制 + 摄像头推流** 相关文档、参考材料与任务跟踪。  

与北斗中转（`beidou-bridge/`）、Hasun 云平台 HTTP API（`RPC 接口参考.md`）**相互独立**。



---



## 目录结构



```

remote-monitor/

├── README.md                 ← 本文件（总索引）

├── TASKS.md                  ← 任务清单与进度

├── docs/

│   ├── protocol/             ← 对外交付协议（Draft / 正式版）

│   ├── 确认清单-协议与改动.md  ← 瑜权答复（MQTT + 按钮映射）

│   ├── 上下位机串口协议830.pdf ← MCU A1/A2 能力边界

│   ├── 前端-协议字段对照-评审表.md

│   ├── references/           ← 第三方参考

│   └── internal/             ← 抓包指南、架构说明

└── frontend/                 ← 前端代码路径说明（见下表）

```



---



## 核心文档



| 文档 | 路径 | 状态 |

| ---- | ---- | ---- |

| **对外协议 V1.0.0（车端 MQTT）** | [docs/灵鱿科技远程监控与控制协议-V1.0.0.md](./docs/灵鱿科技远程监控与控制协议-V1.0.0.md) | 2010002/2010004/2010005/2010008；§12 已定稿 |
| Word 版 V1.0 | [docs/灵鱿科技远程监控与控制协议-V1.0.0.docx](./docs/灵鱿科技远程监控与控制协议-V1.0.0.docx) | 用 `scripts/build-protocol-docx.mjs` 生成（**勿**直接用裸 `md-to-docx`，腾讯文档表格会塌） |
| **对外协议 V2.0（云平台 API）** | [docs/灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md](./docs/灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md) | Draft：开流 playUrl、状态、控制转发 |
| 协议 Draft（通用 md） | [docs/protocol/远程监控与控制协议-V1.0-draft.md](./docs/protocol/远程监控与控制协议-V1.0-draft.md) | 与 V1.0.0 同步维护 |
| **r7 变更说明** | [docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r7.md](./docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r7.md) | 2026-07-03 定稿摘要 |
| r6 变更说明 | [docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.md](./docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.md) | 历史参考 |

| **瑜权确认清单** | [docs/确认清单-协议与改动.md](./docs/确认清单-协议与改动.md) | ✅ 控制/遥测字段已定义 |

| **MCU 串口协议** | [docs/上下位机串口协议830.pdf](./docs/上下位机串口协议830.pdf) | 参考：A2 无作业/刹车灯 |

| 前端↔协议对照表 | [docs/前端-协议字段对照-评审表.md](./docs/前端-协议字段对照-评审表.md) | ✅ 已标 V1.0 / 待车端 / 待中位机 |

| 摄像机架构与抓包 | [docs/internal/摄像头架构与联调抓包.md](./docs/internal/摄像头架构与联调抓包.md) | 监控页一次 HTTP 开流 |

| M1 联调 | [docs/internal/联调记录-2026-07-03.md](./docs/internal/联调记录-2026-07-03.md) · [发给瑜权](./docs/internal/发给瑜权-M1联调确认单.md) · [发给Hasun](./docs/internal/发给Hasun-API确认单.md) | 阶段 2 验收与 V2 补素材 |

| 云平台 OpenAPI | `http://8.155.18.62:48080/doc.html` | 车辆 API 有；开流走 `instructions`+`2010004`（sztu 已验证） |



---



## 实现分档（全项目统一口径）



| 分档 | 含义 |

| ---- | ---- |

| **V1.0** | 可立即对接（如 battery、云平台开流、2010002 转向灯） |

| **协议·车端** | 瑜权已定，MCU/上位机待改（如 2010005 模式 A、1010001 扩展） |

| **协议·中位机** | 瑜权已定，中位机 UDP 待实现（WORK/GIMBAL/AUDIO、view 5/6） |

| **待抓包** | 云平台 `/admin-api/camera/...` + playUrl |



详见 [TASKS.md](./TASKS.md)、[前端-协议字段对照-评审表.md](./docs/前端-协议字段对照-评审表.md)。



---



## 前端实现（Mock 阶段）



| 模块 | 代码路径 |

| ---- | -------- |

| 监控页 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/monitor/index.vue` |

| 视频面板 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/VideoPanel.vue` |

| 控制台 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/RemoteDrivePanel.vue` |

| 云台面板 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/PtzControlPanel.vue` |

| 车辆 API | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/api/car/vehicle/index.ts` |
| 监控遥测 composable | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/monitor/useMonitorVehicle.ts` |
| MQTT payload 封装 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/mqttPayload.ts` |
| 控制 Mock 下发 | `../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/monitorControl.ts` |



路由：`/car/car/monitor/:vehicleId`



---



## 工作阶段



```

阶段 1  文档定稿（V1.0 md + V2 大纲 + 联调模板）  ← 当前

阶段 2  M1 实验验收 → 勾选联调记录

阶段 3  Word 正式版 + 对外发放

阶段 4  前端真联调 + V2 API 补示例

阶段 5  （可选）AI 事件检测

```



---



## 外部待办



| 事项 | 找谁 | 状态 |

| ---- | ---- | ---- |

| MQTT 控制/遥测字段、MCU vs 中位机分工 | **瑜权** | ✅ 确认清单已回 |

| playUrl JSON、无观众 T 秒 | **Hasun** 或 **抓包** | 进行中 |

| 中位机 WORK/GIMBAL/作业/环视 | **导航/中位机** | 协议已定，待开发 |



---



## 更新 md 后重新生成 Word

```powershell
cd remote-monitor/scripts
npm install   # 首次
node build-protocol-docx.mjs "..\docs\灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md"
node build-protocol-docx.mjs "..\docs\灵鱿科技远程监控与控制协议-V1.0.0.md"
```

脚本会：md → docx → **固定表格列宽**（腾讯文档/WPS 可正常显示）。有 Python 时自动用完整版（含目录域）。

**上传腾讯文档**：请用上述脚本生成的 `.docx`，不要用裸 `npx @mohtasham/md-to-docx` 产物。

**打开 Word 后**：右键目录区域 → **更新域**，即可生成可点击目录并启用左侧导航窗。
