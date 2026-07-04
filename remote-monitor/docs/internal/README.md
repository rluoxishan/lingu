# 内部参考

## 发给 Hasun 的两份 Word 确认单

| 范围 | Word 文件（直接发给 Hasun） | 重新生成 |
| ---- | --------------------------- | -------- |
| **远程监控 + 反控** | [发给Hasun-远程监控与控制API确认单.docx](./发给Hasun-远程监控与控制API确认单.docx) | `node scripts/generate_hasun_monitor_docx.mjs` |
| **室内雷达感知** | [发给Hasun-监控页雷达感知API确认单.docx](./发给Hasun-监控页雷达感知API确认单.docx) | `node scripts/generate_hasun_perception_docx.mjs` |

在 `remote-monitor/docs/internal/scripts` 目录执行；需先 `npm install docx`。

**Word 打开后**：右键目录 → **更新域**，以填充导航窗格。

正式协议 Markdown（附件可选，非确认单）：

- 监控/反控：[灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md](../灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md)
- 雷达：[监控页-雷达感知-云平台API契约.md](./监控页-雷达感知-云平台API契约.md)

---

| 文档 | 路径 |
| ---- | ---- |
| M1 联调记录（2026-07-03） | [联调记录-2026-07-03.md](./联调记录-2026-07-03.md) |
| 摄像头架构与抓包 | [摄像头架构与联调抓包.md](./摄像头架构与联调抓包.md) |
| AGV 协议分册 | `../../../_archive/参考来源/AGV通信协议/` |
| 内部 docx | `../../../beidou-bridge/docs/云平台-机器人通信协议-内部标准版.docx` |

评审意见、会议纪要可放在本目录。
