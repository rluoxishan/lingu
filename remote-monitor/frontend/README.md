# 前端代码位置

监控与控制 UI 实现在芋道 Vue3 工程中，本目录仅作索引。

| 文件 | 说明 |
| ---- | ---- |
| `../../yudao-ui-admin-vue3/src/views/car/car/monitor/index.vue` | 监控页主入口 |
| `../../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/VideoPanel.vue` | 五路视频 + 模式切换 |
| `../../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/RemoteDrivePanel.vue` | 远程/自驾/云台控制台 |
| `../../yudao-ui-admin-vue3/src/views/car/car/visualization/panels/PtzControlPanel.vue` | 云台方向/变焦 |
| `../../yudao-ui-admin-vue3/src/views/car/car/visualization/types.ts` | MonitorControlMode、CameraKey |

本地启动：

```powershell
cd c:\Users\Administrator\Desktop\lingu\yudao-ui-admin-vue3
npx vite --mode env.local
```

访问：`http://localhost:3000/car/car/monitor/{vehicleId}`
