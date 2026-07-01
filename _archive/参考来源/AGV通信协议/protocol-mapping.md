# MQTT ↔ ROS ICD 载荷映射

> 本文档定义 `mqtt_iot_bridge`（PayloadAdapter）的转换规则，与代码 `payload_adapter.cpp` 一致。

---

## 一、映射总览

```
dev/sub/{sn}                     mqtt_iot_bridge                    ROS
─────────────────────────────────────────────────────────────────────────
type=2010001  ──►  平台任务 → ICD / ICD直传  ──►  /swj/swj_request_srv
type=2010002~8  ──►  device_control 封装      ──►  /swj/swj_request_srv
type=2010009  ──►  action → ICD type          ──►  /swj/swj_request_srv
type=2010005  ──►  ros_delivery=msg           ──►  /swj/swj_request_msg

/zwj/zwj_response          ◄──
/zwj/zwj_hardware_response ◄──  缓存
/zwj/zwj_fault_response    ◄──
                    ──►  dev/pub type=1010001 / 1010004
```

---

## 二、下行映射

### 2.1 2010001 组合任务下发

```
IF data.type IN [start_task, start_initial, debug_custom_action, suspend_task, ...]:
    → ICD 直传
ELIF data 含 taskSteps[]:
    → 按 order 逐步转换为 ICD JSON，顺序执行
ELIF data 含 taskNodes[]（快捷模式 MULTI_POINT / PATROL）:
    → 合并转换为单条 start_task
ELIF data.ros_delivery == "msg":
    → 发布 /swj/swj_request_msg
```

**taskSteps 逐步映射**：

| stepType | 输出 ICD |
| -------- | -------- |
| GOAL_NAV | `{ type: start_task, request_type: goal_nav, task: [{pose}] }` |
| ACTION | `{ type: debug_custom_action, sub_action, ...params }` |
| CUSTOM_ROUTE | `{ type: start_task, request_type: custom_route_nav, custom_routes: [...] }` |
| CHARGING | `{ type: start_task, request_type: go_charging, task: [{pose}] }` |
| INITIAL | `{ type: start_initial, initial_map_info: {...} }` |

**ACTION 步骤示例**（对齐 IDK 组合调试）：

输入：`{ "stepType": "ACTION", "actionType": "rotate_rad", "angle_rad": 1.57 }`

输出：`{ "type": "debug_custom_action", "sub_action": "rotate_rad", "angle_rad": 1.57 }`

**快捷模式 MULTI_POINT**（taskNodes → goal_nav）：
```json
{
  "taskId": "T001", "taskType": "MULTI_POINT", "speed": 1.5,
  "taskNodes": [
    { "order": 1, "taskPoint": "A", "x": 21.64, "y": 86.28, "z": 0.694, "w": 0.719 },
    { "order": 2, "taskPoint": "B", "x": 35.20, "y": 92.15, "z": 0.0, "w": 1.0 }
  ]
}
```

输出（Service 请求体）：
```json
{
  "id": "1686004858937364480",
  "type": "start_task",
  "speed": 1.5,
  "request_type": "goal_nav",
  "task": [
    { "pose": { "x": 21.64, "y": 86.28, "z": 0.694, "w": 0.719 } },
    { "pose": { "x": 35.20, "y": 92.15, "z": 0.0, "w": 1.0 } }
  ]
}
```

**巡检任务转换示例**：

输入：
```json
{
  "taskType": "PATROL", "speed": 1.0, "routeJoinMode": "from_start",
  "taskNodes": [
    { "x": 10.0, "y": 20.0, "z": 0.0, "w": 1.0 },
    { "x": 30.0, "y": 25.0, "z": 0.0, "w": 1.0 }
  ]
}
```

输出：
```json
{
  "type": "start_task",
  "request_type": "custom_route_nav",
  "speed": 1.0,
  "custom_routes": [{
    "waypoints": [
      { "x": 10.0, "y": 20.0, "z": 0.0, "w": 1.0 },
      { "x": 30.0, "y": 25.0, "z": 0.0, "w": 1.0 }
    ],
    "custom_route_join_mode": "from_start"
  }]
}
```

### 2.2 2010002 车辆控制

```json
{
  "type": "device_control",
  "id": "<云平台id>",
  "mqtt_cmd_type": "2010002",
  "data": {
    "target": "GIMBAL",
    "command": "SET",
    "params": { "pan": 15, "tilt": -5 }
  }
}
```

| target | 转发目标 |
| ------ | -------- |
| ARM / GIMBAL / AUDIO / LIGHT / POWER | `/swj/swj_device_control_srv` |
| CONTAINER | `/swj/container_manager` Topic（params.cmd） |
| NAV_CONFIG | `/swj/swj_device_control_srv` 或本地持久化 |

flat 格式（无 target）仍走 device_control，兼容 IOT 方案灯光/制动字段。

### 2.3 2010003 ~ 2010008

统一封装：

```json
{
  "type": "device_control",
  "id": "<云平台id>",
  "mqtt_cmd_type": "2010002",
  "data": <原始 data>
}
```

### 2.4 2010009 任务控制

| data.action | 输出 ICD type | 附加 |
| ----------- | ------------- | ---- |
| PAUSE | suspend_task | — |
| RESUME | resume_task | — |
| CANCEL | stop_task | — |
| CHANGE_SPEED | change_task | speed 字段 |

### 2.5 2010005 遥控

```json
{
  "type": "device_control",
  "mqtt_cmd_type": "2010005",
  "data": { "command": "FORWARD", "speedLevel": 3, "ros_delivery": "msg" }
}
```

通过 `/swj/swj_request_msg` 高频发布，QoS=0。

---

## 三、上行映射

### 3.1 1010001 字段映射表

| MQTT data 字段 | ROS 来源 | JSON 路径 |
| -------------- | -------- | --------- |
| taskId | zwj_response | id |
| taskName | zwj_response | task_name |
| drivingMode | zwj_response | vehicle_info.driving_mode |
| localizationStatus | zwj_response | localization_status |
| workingStatus | zwj_response | working_status |
| planningStatus | zwj_response | planning_status |
| perceptionStatus | zwj_response | perception_status |
| speedMps | zwj_response | vehicle_info.vehicle_speed |
| globalPathLength | zwj_response | global_path_length |
| obstacleStopTime | zwj_response | obstacle_stop_time |
| battery | zwj_hardware | vehicle_info.vehicle_power_info |
| vehicleInfo | zwj_hardware | vehicle_info |
| sensorStatus | zwj_hardware | lidar_info + radar_info + ... |
| faultSummary | zwj_fault | fault_info[] 摘要 |

**workStatus 映射**：

```
idle                        → 0
working / initializing      → 1
fault                       → 2
vehicle_charging_status=1   → 3
emergency_stop              → 4
```

**position**：从定位模块获取，格式 `"longitude,latitude"`。

### 3.2 1010004

`/zwj/zwj_fault_response` → 原样映射 fault_info[]。

### 3.3 1010005

监听 zwj_response 的 planningStatus 变更，触发事件上报。

---

## 四、回复映射

```
Service res == true  →  code=200, msg="ok"
Service res == false →  code=500, msg=Service.data
```

data 字段：尝试解析 Service 返回 JSON；失败则放入 detail 字符串。

---

## 五、ICD 指令速查

| ICD type | 触发 MQTT type | ROS 接口 |
| -------- | -------------- | -------- |
| start_task | 2010001 | Service |
| start_initial | 2010001 / 2010010 | Service |
| suspend_task | 2010009 PAUSE | Service |
| resume_task | 2010009 RESUME | Service |
| stop_task | 2010009 CANCEL | Service |
| change_task | 2010009 CHANGE_SPEED | Service |
| device_control | 2010002~2010008 | Service / Msg |

| ROS Topic | 输出 MQTT type |
| --------- | -------------- |
| /zwj/zwj_response + hardware + fault | 1010001 |
| /zwj/zwj_fault_response | 1010004 |
| planningStatus 变更 | 1010005 |

---

## 相关文档

- [../PAYLOAD_MAPPING.md](../PAYLOAD_MAPPING.md)（代码实现）
- [周期性上报](protocol-telemetry.md)
- [云平台下发](protocol-rpc-server.md)
