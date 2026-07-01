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

| **对外协议 V1.0.0** | [docs/灵鱿科技远程监控与控制协议-V1.0.0.md](./docs/灵鱿科技远程监控与控制协议-V1.0.0.md) | MQTT 车端篇：推流 + 远程控制 |
| Word 版 | [docs/灵鱿科技远程监控与控制协议-V1.0.0.docx](./docs/灵鱿科技远程监控与控制协议-V1.0.0.docx) | 用 `scripts/build-protocol-docx.mjs` 生成（表格列宽已修复） |
| 协议 Draft（通用 md） | [docs/protocol/远程监控与控制协议-V1.0-draft.md](./docs/protocol/远程监控与控制协议-V1.0-draft.md) | 与 V1.0.0 内容同步 |
| **r6 变更说明** | [docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.md](./docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.md) | 发参考版建议一并附上 |
| 变更说明 Word | [docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.docx](./docs/protocol/吉狮-远程监控与控制协议-变更说明-V1.0-draft-r6.docx) | |

| **瑜权确认清单** | [docs/确认清单-协议与改动.md](./docs/确认清单-协议与改动.md) | ✅ 控制/遥测字段已定义 |

| **MCU 串口协议** | [docs/上下位机串口协议830.pdf](./docs/上下位机串口协议830.pdf) | 参考：A2 无作业/刹车灯 |

| 前端↔协议对照表 | [docs/前端-协议字段对照-评审表.md](./docs/前端-协议字段对照-评审表.md) | ✅ 已标 V1.0 / 待车端 / 待中位机 |

| 摄像机架构与抓包 | [docs/internal/摄像头架构与联调抓包.md](./docs/internal/摄像头架构与联调抓包.md) | 监控页一次 HTTP 开流 |

| 云平台 OpenAPI | `http://8.155.18.62:48080/doc.html` | 车辆 API 有；开流 playUrl 待抓包 |



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

| 监控页 | `../yudao-ui-admin-vue3/src/views/car/car/monitor/index.vue` |

| 视频面板 | `../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/VideoPanel.vue` |

| 控制台 | `../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/RemoteDrivePanel.vue` |

| 云台面板 | `../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/PtzControlPanel.vue` |

| 车辆 API | `../yudao-ui-admin-vue3/src/api/car/vehicle/index.ts` |
| 监控遥测 composable | `../yudao-ui-admin-vue3/src/views/car/car/monitor/useMonitorVehicle.ts` |
| MQTT payload 封装 | `../yudao-ui-admin-vue3/src/views/car/car/visualization/mqttPayload.ts` |
| 控制 Mock 下发 | `../yudao-ui-admin-vue3/src/views/car/car/visualization/monitorControl.ts` |



路由：`/car/car/monitor/:vehicleId`



---



## 工作阶段



```

阶段 1  协议定稿（合并确认清单）           ← 当前

阶段 2  云平台开流 API + 控制转发

阶段 3  前端第一批 V1.0 → 第二批联调

阶段 4  （可选）AI 事件检测

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

npx --yes @mohtasham/md-to-docx `

  "c:\Users\Administrator\Desktop\lingu\remote-monitor\docs\protocol\吉狮-远程监控与控制协议-V1.0-draft.md" `

  "c:\Users\Administrator\Desktop\lingu\remote-monitor\docs\protocol\吉狮-远程监控与控制协议-V1.0-draft.docx"



npx --yes @mohtasham/md-to-docx `

  "c:\Users\Administrator\Desktop\lingu\remote-monitor\docs\前端-协议字段对照-评审表.md" `

  "c:\Users\Administrator\Desktop\lingu\remote-monitor\docs\前端-协议字段对照-评审表.docx"

```


