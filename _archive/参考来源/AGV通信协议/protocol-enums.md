# 枚举与错误码定义

> 本文档包含所有枚举类型和错误码，供车端/云端/前端开发参考。

---

## 一、1010001 workStatus（IOT §6.1）

| 值 | 说明 |
| -- | ---- |
| 0 | 空闲 |
| 1 | 任务中 |

**v1.0 拓展**（bridge 追加，IOT 平台可忽略未知值）：

| 值 | 说明 |
| -- | ---- |
| 2 | 故障 |
| 3 | 充电 |
| 4 | 急停 |

---

## 二、IOT 指令 type 表（§5.3，原样）

| type | 说明 |
| ---- | ---- |
| 1010001 | 状态上报 |
| 1010002 | 本地任务列表 |
| 2010001 | 下发任务 |
| 2010002 | 修改参数 |
| 2010003 | 通知出货 |
| 2010004 | 开启视频 |
| 2010005 | 遥控车辆 |
| 2010006 | 查看配置 |
| 2010007 | 获取点位 |
| 2010008 | 紧急开关 |

---

## 三、2010002 修改参数（IOT §7.2 flat 字段）

| 字段 | 值 | 说明 |
| ---- | -- | ---- |
| brake | 0/1 | 取消/开启制动 |
| headlights | 0/1 | 大灯 |
| ultrasonic | 0/1 | 超声波 |
| screen | 0/1 | 显示屏 |
| turnSignals | 0/1/2/3 | 全灭/左转/右转/双闪 |

---

## 四、组合任务 stepType（v1.0 拓展）

| stepType | 说明 | ICD |
| -------- | ---- | --- |
| GOAL_NAV | 目标点导航 | start_task + goal_nav |
| ACTION | 动作任务 | debug_custom_action |
| CUSTOM_ROUTE | 自定义路线 | start_task + custom_route_nav |
| CHARGING | 充电 | start_task + go_charging |
| INITIAL | 初始化/切图 | start_initial |

### actionType（ACTION 步骤）

| 值 | 参数 | 说明 |
| -- | ---- | ---- |
| wait_sec | seconds | 暂停 N 秒 |
| forward_m | distance_m | 定距前进/后退（米） |
| rotate_rad | angle_rad | 定角旋转（弧度） |

---

## 五、车辆控制 target（2010002 拓展）

| target | 说明 |
| ------ | ---- |
| ARM | 机械臂 |
| GIMBAL | 云台 |
| CONTAINER | 货柜 |
| AUDIO | 声音/语音 |
| LIGHT | 灯光/转向灯 |
| POWER | 电源/传感器供电 |
| NAV_CONFIG | 导航与离线策略参数 |

---

## 六、ICD request_type（算法层）

平台组合任务使用的 ICD 类型：

| 值 | 说明 | stepType |
| -- | ---- | -------- |
| goal_nav | 目标点导航 | GOAL_NAV |
| custom_route_nav | 自定义路线 | CUSTOM_ROUTE |
| go_charging | 充电 | CHARGING |
| debug_custom_action | 动作任务 | ACTION |
| start_initial | 初始化 | INITIAL |

<details>
<summary>ICD 其他能力（平台不使用，ICD 直传时可调用）</summary>

| 值 | 说明 |
| -- | ---- |
| back_goal_nav | 倒退导航 |
| enter_elevator / out_elevator | 电梯场景 |

</details>

---

## 七、ICD 状态枚举

### 7.1 localizationStatus

| 值 | 说明 |
| -- | ---- |
| unknown | 未定义 |
| initialization | 初始化中 |
| normal | 正常 |
| gps_fault | GPS 异常 |
| localization_fault | 融合定位异常 |

### 7.2 workingStatus

| 值 | 说明 |
| -- | ---- |
| idle | 无任务 |
| initializing | 初始化/切图 |
| working | 作业中 |
| pausing | 暂停 |
| fault | 故障 |

### 7.3 planningStatus

| 值 | 说明 |
| -- | ---- |
| normal | 正常行驶 |
| global_planning | 全局规划中 |
| recovery_planning | 重规划中 |
| obstacle_avoidance | 避障中 |
| robot_stop | 停止 |
| emergency_stop | 急停 |
| parking_courtesy | 礼让 |
| turn_left / turn_right | 转向 |
| fall_back | 后退 |
| rotate_in_place | 原地旋转 |
| fault_local_planning | 局部规划异常 |
| fault_global_planning | 全局规划异常 |

### 7.4 drivingMode

| 值 | 说明 |
| -- | ---- |
| auto_drive | 自动驾驶 |
| manual_drive | 手动 |
| remote_drive | 遥控 |

---

## 八、平台任务状态（云端 TaskDO）

| 状态 | 说明 |
| ---- | ---- |
| PENDING | 待下发 |
| EXECUTING | 执行中 |
| PAUSED | 已暂停 |
| COMPLETED | 已完成 |
| FAILED | 失败 |
| CANCELLED | 已取消 |

映射关系见 [protocol-state-machine.md](protocol-state-machine.md)。

---

## 九、2010005 遥控 command

| 值 | 说明 |
| -- | ---- |
| FORWARD | 前进 |
| BACKWARD | 后退 |
| LEFT | 左转 |
| RIGHT | 右转 |
| STOP | 停止 |
| EMERGENCY_STOP | 急停 |
| PAUSE | 暂停 |

---

## 十、2010009 任务控制 action

| 值 | ICD type |
| -- | -------- |
| PAUSE | suspend_task |
| RESUME | resume_task |
| CANCEL | stop_task |
| CHANGE_SPEED | change_task |

---

## 十一、2010002 扩展枚举

### offlineStrategy

| 值 | 说明 |
| -- | ---- |
| CONTINUE | 断线继续 |
| PAUSE | 暂停等待 |
| RETURN_CHARGE | 返回充电 |

### obstacleStrategy

| 值 | 说明 |
| -- | ---- |
| WAIT | 暂停等待 |
| REROUTE | 绕路 |
| EMERGENCY_STOP | 急停 |

---

## 十二、1010005 事件枚举

### eventType

| 值 | 说明 |
| -- | ---- |
| OBSTACLE_AVOIDANCE | 避障 |
| REPLANNING | 重规划 |
| YIELDING | 让行 |

### avoidanceAction

| 值 | 说明 |
| -- | ---- |
| WAIT | 等待 |
| REROUTE | 绕路 |
| EMERGENCY_STOP | 急停 |

---

## 十三、故障等级（ICD fault_level）

| 值 | 名称 | 说明 |
| -- | ---- | ---- |
| 1 | OK | 无故障 |
| 2 | WARN | 警告 |
| 3 | ERROR | 可恢复 |
| 4 | FATAL | 严重 |

---

## 十四、MQTT 回复 code

| code | 说明 |
| ---- | ---- |
| 200 | 成功 |
| 400 | 参数错误 |
| 500 | 执行失败 |

---

## 十五、业务错误码

| 错误码 | 说明 |
| ------ | ---- |
| 10001 | 任务下发失败 |
| 10002 | 任务不存在 |
| 10003 | 任务状态非法 |
| 10004 | 车辆离线 |
| 10005 | 车辆忙碌 |
| 10006 | 任务参数无效 |
| 10007 | 路径规划失败 |
| 10008 | 任务执行超时 |
| 30001 | 设备控制失败 |

---

## 十六、指令 type 编码表

### 车辆上报（101）

| type | 名称 | 来源 |
| ---- | ---- | ---- |
| 1010001 | 综合状态 | IOT + 扩展 |
| 1010002 | 本地任务列表 | IOT |
| 1010003 | 高频定位 | v1.0 新增 |
| 1010004 | 故障状态 | v1.0 新增 |
| 1010005 | 避障/重规划事件 | v1.0 新增 |

### 云平台下发（201）

| type | 名称 | 来源 |
| ---- | ---- | ---- |
| 2010001 | 组合任务下发 | IOT + 扩展 |
| 2010002 | 车辆控制 | IOT + 扩展 |
| 2010003 | 通知出货 | IOT |
| 2010004 | 视频监控 | IOT + 扩展 |
| 2010005 | 远程遥控 | IOT + 扩展 |
| 2010006 | 查看配置 | IOT |
| 2010007 | 获取点位 | IOT + 扩展 |
| 2010008 | 紧急开关 | IOT + 扩展 |
| 2010009 | 任务控制 | v1.0 新增 |
| 2010010 | 定位校准 | v1.0 新增 |
| 2010011 | 建图控制 | v1.0 新增 |
| 2010012 | 地图同步 | v1.0 新增 |

---

## 相关文档

- [状态机](protocol-state-machine.md)
- [协议调整说明](protocol-revision.md)
