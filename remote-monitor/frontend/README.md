# 前端代码位置

监控与控制 UI 实现在 Gitee 仓库 `ling-ubot_front-end` 的 `yudao-ui-admin-vue3` 工程中，本目录仅作索引。

| 文件 | 说明 |
| ---- | ---- |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/list/index.vue` | 车辆列表（迁移自旧版监控专项页） |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/monitor/index.vue` | 监控页主入口 |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/VideoPanel.vue` | 五路视频 + 模式切换 |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/RemoteDrivePanel.vue` | 远程/自驾/云台控制台 |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/views/car/car/visualization/panels/PtzControlPanel.vue` | 云台方向/变焦 |
| `../../ling-ubot_front-end/yudao-ui-admin-vue3/src/api/car/vehicle/index.ts` | 车辆/开流/控制 API |

本地启动：

```powershell
cd c:\Users\Administrator\Desktop\lingu\ling-ubot_front-end\yudao-ui-admin-vue3
npm run dev
```

访问：`http://localhost:3000` → 登录后进入「车辆列表」→ 点击「监控」
