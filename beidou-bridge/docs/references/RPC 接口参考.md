# RPC 接口参考

> 本文档汇总所有 RPC 方法，包括设备控制（云→车）、车端事件上报（车→云）和数据操作。
> 
> 

---

## 一、设计原则

### 1\.1 通信方式

|类型|方向|Topic \(发送\)|Topic \(订阅\)|用途|
|---|---|---|---|---|
|Server\-side RPC|云→车|`v1/devices/me/rpc/request/+`|\-|控制指令下发|
|Server\-side RPC Response|车→云|`v1/devices/me/rpc/response/{requestId}`|\-|设备响应|
|Client\-side RPC|车→云|`v1/devices/me/rpc/request/{requestId}`|\-|事件状态上报|
|Client\-side RPC Response|云→车|\-|`v1/devices/me/rpc/response/+`|服务端确认|

### 1\.2 上报边界

|数据类型|上报方式|频率|用途|
|---|---|---|---|
|任务状态 \(`taskStatus`\)|Telemetry|1Hz|状态同步，云端自动更新 TaskDO|
|任务进度 \(`taskProgress`\)|Telemetry|1Hz|进度追踪|
|车辆状态 \(位置/电量/水量等\)|Telemetry|1Hz|实时监控、云端统计|
|**故障码 \(****`faultCodes`****\)**|Telemetry|1Hz|故障监控，云端从配置表获取详情|
|断点保存确认|RPC \(`breakpointSaved`\)|一次性|断点信息可靠记录|
|环境/安全事件|RPC \(各事件方法\)|事件触发|关键事件通知|

> **注意**: 任务状态通过 Telemetry 上报，不使用 Client\-side RPC。事件 RPC 用于环境、安全等关键事件通知。
> 
> 

#### 1\.2\.1 `crashStatus` 与 `crashEvent` 联动规则

> **当前实现状态（2026\-06\-01）**: 联动逻辑**未实现**——`CrashRpcHandler` 未 override `handleBusinessLogic()`，碰撞事件仅记录到 `ops_task_rpc_event` 表，不联动修改 `crashStatus` 字段。两条通道完全独立。**待 P1\-1 修订实现**。
> 
> 

**双通道职责**:

|通道|字段|频率|职责|
|---|---|---|---|
|Telemetry 1Hz|`crashStatus`|持续|碰撞状态持续监控（NOT\_TRIGGERED / TRIGGERED）|
|Client\-side RPC|`crashEvent`|一次性|碰撞瞬间通知，携带图片附件（DETECTED / RESOLVED）|

**联动规则**:

|规则|说明|
|---|---|
|**规则 1**|`crashEvent` 为碰撞瞬间通知（一次性），携带 `cosImageKeys` 图片附件|
|**规则 2**|`crashStatus` 为碰撞持续状态（1Hz），用于云端持续监控|
|**规则 3**|碰撞发生时：优先发送 `crashEvent(DETECTED)`，同时 `crashStatus` 切为 `TRIGGERED`|
|**规则 4**|碰撞解除时：发送 `crashEvent(RESOLVED)`，同时 `crashStatus` 切回 `NOT_TRIGGERED`|
|**规则 5**|`crashStatus` 为辅助通道，`crashEvent` 为权威事件源（图片附件只能通过 RPC 上报）|

**未发送 ****`crashEvent`**** 时的退化**:

- 仅收到 `crashStatus=TRIGGERED` 但无 `crashEvent` → 云端记录到 `VehicleStatusDO` 但 `ops_task_rpc_event` 无事件记录，告警延迟

- 仅收到 `crashEvent(DETECTED)` 但 `crashStatus` 仍为 `NOT_TRIGGERED` → 视为车端实现异常，云端应 log\.warn

> **实现位置**: 待 `CrashRpcHandler.java` override `handleBusinessLogic()` 调用 `vehicleStatusService.updateCrashStatus(vehicleId, TRIGGERED)`
> 
> 

### 1\.3 格式规范

**请求格式**:

```json
{
  "method": "方法名",
  "params": {
    // 方法参数
  }
}
```

**响应格式**（对应 `ThingsboardRpcResponse`）：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 业务数据（各方法自定义）
  },
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}
```

|字段|类型|说明|
|---|---|---|
|`code`|Integer|响应码：`0`=成功，非 `0`=失败|
|`message`|String|响应消息，成功时为 `"success"`|
|`data`|Object|业务响应数据（各 RPC 方法自定义结构）|
|`requestId`|Integer|请求 ID，用于关联请求和响应|
|`deviceId`|String|设备 ID（IoT 设备标识）|

> **设备标识说明**: `deviceId` 由 ThingsBoard 提供，对应车辆的 `iotId`。Client\-side RPC 的 `deviceId` 即 `request.getDeviceId()`，云端直接用其查询 `VehicleDO.iotId` 匹配车辆，无需在 RPC 参数中额外传递 `vehicleId`。
> 
> 

**隐式映射约定**:

|场景|字段|来源|说明|
|---|---|---|---|
|**Client\-side RPC**|`request.getDeviceId()`|ThingsBoard RPC 框架|等于 `VehicleDO.iotId`（设备维度标识）|
|**breakpointSaved RPC**|`vehicleIotId` 参数|隐式传 `request.getDeviceId()`|协议不显式传 vehicleIotId|
|**事件类 RPC（crash/pipeline 等）**|`vehicleId`|通过 `BaseEventRpcHandler.getVehicleId(deviceId)` 解析|查 `VehicleDO` 反查 vehicleId|

**实现位置**:

- `BaseEventRpcHandler.java:160-163` —— `getVehicleId(deviceId)` 查 `VehicleDO.iotId`

- `BreakpointRpcHandler.java:89` —— `String vehicleIotId = request.getDeviceId()`

> **Why**: 协议层抽象掉"车端只发 deviceId，云端反查"模式，避免车端需要在每次 RPC 中显式传 vehicleId/iotId（不同 RPC 字段名不统一）。**新增 RPC 时必须遵循此约定**，禁止在 params 中要求 vehicleId/iotId 字段。
> 
> 

---

## 二、设备控制 \(Server\-side RPC\)

### 2\.1 设备重启 \(rebootDevice\)

设备重启指令，独立 RPC 方法。

**请求**:

```json
{
  "method": "rebootDevice",
  "params": {}
}
```

**响应**: 标准 ThingsboardRpcResponse

**说明**:

- 设备收到后执行系统重启

- 重启期间设备离线，ThingsBoard 会自动检测

- 无需额外参数

### 2\.2 紧急停止 \(emergencyStop\)

全局紧急停止，最高优先级。不需要 taskId，直接控制车辆进入/退出急停状态。

```json
// 进入紧急停止
{
  "method": "emergencyStop",
  "params": {
    "enable": true
  }
}

// 解除紧急停止
{
  "method": "emergencyStop",
  "params": {
    "enable": false
  }
}
```

- 紧急停止会立即中断当前所有任务

- 车辆进入 `EMERGENCY_STOP` 状态

- 需要显式解除才能恢复正常运行

### 2\.3 高频遥测开关 \(sensorToggle\)

高频遥测数据（10Hz SENSOR\_RAW）默认关闭，节省带宽。

```json
{
  "method": "sensorToggle",
  "params": {
    "enable": true,
    "sensorTypes": ["RTK", "OBSTACLE", "ULTRASONIC"],
    "duration": 300
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`enable`|Boolean|是|true\-开启，false\-关闭|
|`sensorTypes`|String\[\]|否|指定传感器类型，不传表示全部|
|`duration`|Integer|否|自动关闭时间（秒），0=手动控制|

**传感器类型**:

|类型|说明|频率|
|---|---|---|
|`RTK`|高精度定位数据|10Hz|
|`OBSTACLE`|障碍物检测数据|10Hz|
|`ULTRASONIC`|超声波传感器数据|10Hz|
|`TRAJECTORY`|局部规划轨迹|10Hz|
|`CHASSIS`|底盘姿态数据|10Hz|

### 2\.4 获取设备信息 \(getDeviceInfo\)

```json
{
  "method": "getDeviceInfo",
  "params": {}
}
```

响应:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "system": {
      "name": "AutoCityOS",
      "version": "2.0.0.131"
    },
    "vehicle": {
      "vin": "LAAAPLDL2R1000039",
      "model": "Adder"
    },
    "maps": {
      "hdMap": {
        "version": "20250101_001",
        "areaId": 1
      },
      "pcdMap": {
        "version": "20250101_001",
        "areaId": 1
      }
    }
  },
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}
```

### 2\.5 摄像头控制 \(cameraCapture\)

```json
{
  "method": "cameraCapture",
  "params": {
    "topics": [
      "/center_back/rgb/image_raw",
      "/center_front/rgb/image_raw",
      "/center_left/rgb/image_raw",
      "/center_right/rgb/image_raw"
    ]
  }
}
```

### 2\.6 片区切换 \(areaSwitch\)

片区切换是独立 RPC，不创建 TaskDO 记录。

```json
{
  "method": "areaSwitch",
  "params": {
    "areaId": 12345,
    "areaName": "科技园片区",
    "hdMapVersion": "20250226_001",
    "pcdMapVersion": "20250226_001"
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`areaId`|Long|是|目标片区 ID|
|`areaName`|String|是|目标片区名称|
|`hdMapVersion`|String|是|高精地图版本|
|`pcdMapVersion`|String|是|点云地图版本|

**使用场景**: areaSwitch RPC 用于车辆已在新工作区域（通过人工遥控或其他方式到达）后，云端下发指令更新片区绑定。片区切换是独立 RPC 操作，不创建 TaskDO，通过 `VehicleAreaTransferDO` 记录调拨历史。

**车端处理流程**:

1. 收到 `areaSwitch` RPC

2. 检查当前状态（云端已确保空闲）

3. 卸载旧地图数据

4. 加载新地图数据

5. 更新 Client Attributes（areaId, areaName, hdMapVersion, pcdMapVersion）

6. 返回 RPC 响应

**调拨条件检查**（云端下发前必须满足）:

|检查项|不满足时的处理|
|---|---|
|片区不同|提示"车辆已在目标片区"|
|同一客户|提示"目标片区不属于同一客户"|
|HD 地图已安装|提示"请先安装高精地图"|
|PCD 地图已安装|提示"请先安装点云地图"|
|车辆空闲|提示"车辆正在执行任务"|

#### 2\.6\.1 `areaSwitch` vs `dispatchTask(TRANSFER)` 选择规则

> **当前实现状态（2026\-06\-01）**: 选择规则**未在协议中明确文档化**——前端/调度系统开发者不确定何时用 `areaSwitch`、何时用 `TRANSFER` 任务。本节为**协议层约定**。
> 
> 

**职责对比**:

|维度|`areaSwitch`|`dispatchTask(TRANSFER)`|
|---|---|---|
|**方向**|空闲车辆 → 已在目标片区|任务态车辆 → 需转场导航|
|**是否创建 TaskDO**|❌ 否|✅ 是（taskType=TRANSFER）|
|**记录**|`VehicleAreaTransferDO` 调拨历史|`ops_task` \+ `ops_task_breakpoint`|
|**典型场景**|管理后台调拨、人工遥控后绑定|自动调度、任务链中转场|
|**依赖前置**|目标地图已安装|可抢占当前任务（Mode A/B）|
|**执行方式**|直接切换（不移动车辆）|车辆自动驾驶到目标点|

**选择决策表**:

|场景|选择|原因|
|---|---|---|
|车辆空闲 \+ 已在目标片区|`areaSwitch`|仅需更新绑定，无需移动|
|车辆空闲 \+ 在其他片区 \+ 需移动|`areaSwitch` \+ 人工调度|空闲态不应触发自动任务|
|车辆执行任务中 \+ 需到其他片区|`dispatchTask(TRANSFER)`|任务态必须用任务系统转场|
|任务链 "A 片区清扫 → B 片区清扫"|`dispatchTask(TRANSFER)`|自动调度流程|
|客户手动调拨（如客户搬迁）|`areaSwitch` \+ 人工到达|人工场景|
|抢占当前任务后转场|`dispatchTask(TRANSFER)` \+ `previousTaskAction`|抢占 \+ 转场组合|

**禁止场景**:

|禁止|原因|
|---|---|
|❌ 车辆空闲时下发 `dispatchTask(TRANSFER)` 仅用于切片区|应改用 `areaSwitch`，避免无意义的 TaskDO 记录|
|❌ 车辆执行任务时下发 `areaSwitch`|违反"车辆空闲"前置条件，areaSwitch 内部会拒绝|
|❌ 用 `areaSwitch` 移动车辆位置|areaSwitch 不会触发任何移动操作|

> **决策辅助**: 如果是"切片区"语义（更新绑定关系）→ `areaSwitch`；如果是"去另一片区"语义（实际移动）→ `dispatchTask(TRANSFER)`。
> **相关章节**: §2\.6 片区切换、`protocol-task-lifecycle.md §2.5` 转场任务参数。
> 
> 

---

### 2\.7 解除故障保护 \(releaseFaultGuard\)

```json
{
  "method": "releaseFaultGuard",
  "params": {}
}
```

响应:

```json
// 成功
{
  "code": 0,
  "message": "success",
  "data": null,
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}

// 失败（车辆不在故障保护模式）
{
  "code": 1,
  "message": "vehicle is not in fault guard mode",
  "data": null,
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}
```

### 2\.8 删除地图 \(deleteMap\)

删除车辆上已安装的地图数据。

```json
{
  "method": "deleteMap",
  "params": {
    "areaId": 1,
    "mapType": "HD"
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`areaId`|Long|是|片区 ID|
|`mapType`|String|是|地图类型：`HD` \(高精地图\) / `PCD` \(点云地图\) / `ALL` \(全部\)|

---

## 三、车端事件上报 \(Client\-side RPC\)

### 3\.1 红绿灯事件 \(trafficLightEvent\)

**触发时机**: 红绿灯状态变更时

```json
{
  "method": "trafficLightEvent",
  "params": {
    "eventStatus": "WAITING",
    "trafficLightId": "trafficlight_25",
    "trafficLightColor": "RED",
    "direction": "STRAIGHT",
    "latitude": 22.78,
    "longitude": 113.88,
    "heading": 288.67,
    "position": "APPROACHING_5M",
    "confidenceScore": 0.92,
    "cosImageKeys": []
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`confidenceScore`|Number|否|感知置信度 0\-1，低于阈值时车端可请求云端大模型辅助判断|
|`cosImageKeys`|String\[\]|否|COS 对象 Key 列表（图片等附件走腾讯云 COS 上传）|

**eventStatus 枚举**:

|值|说明|
|---|---|
|`APPROACHING`|接近红绿灯|
|`WAITING`|等待红绿灯|
|`PASSING`|正在通过红绿灯|
|`PASSED`|已通过红绿灯|

**trafficLightColor 枚举**:

|值|说明|
|---|---|
|`UNKNOWN`|未知|
|`RED`|红灯|
|`YELLOW`|黄灯|
|`GREEN`|绿灯|
|`BLACK`|黑灯|

### 3\.2 道闸事件 \(barrierEvent\)

**触发时机**: 道闸状态变更时

```json
{
  "method": "barrierEvent",
  "params": {
    "eventStatus": "QUEUEING",
    "barrierId": "barrier_001",
    "latitude": 22.78,
    "longitude": 113.88,
    "heading": 288.67,
    "confidenceScore": 0.88,
    "cosImageKeys": []
  }
}
```

**eventStatus 枚举**:

|值|说明|
|---|---|
|`APPROACHING`|接近道闸|
|`QUEUEING`|道闸前排队中|
|`WAITING`|道闸前等待中|
|`PASSING`|正在通道闸|
|`EXITING`|使出道闸|
|`PASSED`|已通过道闸|

### 3\.3 碰撞事件 \(crashEvent\)

**触发时机**: 检测到碰撞时

```json
{
  "method": "crashEvent",
  "params": {
    "eventStatus": "DETECTED",
    "frontCrashStatus": 1,
    "leftSweeperCrashStatus": 0,
    "rightSweeperCrashStatus": 0,
    "rearCrashStatus": 0,
    "latitude": 22.78,
    "longitude": 113.88,
    "heading": 288.67,
    "confidenceScore": 0.95,
    "cosImageKeys": [
      "autonomous/crash/front_20250226_001.jpg"
    ]
  }
}
```

**eventStatus 枚举**:

|值|说明|
|---|---|
|`DETECTED`|检测到碰撞|
|`RESOLVED`|碰撞已解决|

### 3\.4 管线缠绕事件 \(pipelineEvent\)

**触发时机**: 检测到管线缠绕时

```json
{
  "method": "pipelineEvent",
  "params": {
    "eventStatus": "DETECTED",
    "latitude": 22.78,
    "longitude": 113.88,
    "heading": 288.67,
    "confidenceScore": 0.85
  }
}
```

### 3\.5 弱交通场景事件 \(weakTrafficEvent\)

**触发时机**: 检测到弱交通场景时

```json
{
  "method": "weakTrafficEvent",
  "params": {
    "eventStatus": "DETECTED",
    "latitude": 22.78,
    "longitude": 113.88,
    "heading": 288.67,
    "confidenceScore": 0.75,
    "cosImageKeys": []
  }
}
```

**eventStatus 枚举**:

|值|说明|
|---|---|
|`DETECTED`|检测到弱交通场景|
|`PASSING`|弱交通通行中|
|`PARKING`|弱交通靠边停车中|
|`RESOLVED`|弱交通已解决|

### 3\.6 路线规划上报 \(routePlanUpdate\)

**设计说明**: 车端在开始执行清扫任务时，会将多个清扫区块合并成一条全局规划路线。该路线数据通过 Client\-side RPC 同步到云端，用于实时监控和历史回放。

```json
{
  "method": "routePlanUpdate",
  "params": {
    "taskId": 1234567890,
    "snapshotId": "BP001",
    "planType": "INITIAL",
    "timestamp": 1708210156789,
    "referencePoints": [
      {"x": 1.5, "y": 2.3, "z": 0, "heading": 1.57},
      {"x": 2.0, "y": 2.8, "z": 0, "heading": 1.60}
    ],
    "totalPoints": 350,
    "estimatedDistance": 1250.5,
    "estimatedDuration": 600
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`taskId`|Long|是|关联的任务 ID|
|`snapshotId`|String|否|断点 ID（断点续扫时必填）|
|`planType`|String|是|规划类型：`INITIAL` / `UPDATE`|
|`timestamp`|Long|是|规划完成时间戳（毫秒）|
|`referencePoints`|Array|是|全局规划参考点数组|
|`totalPoints`|Integer|是|参考点总数|
|`estimatedDistance`|Number|否|预估路线长度（米）|
|`estimatedDuration`|Integer|否|预估执行时长（秒）|

**planType 枚举**:

|值|说明|触发时机|
|---|---|---|
|`INITIAL`|初始规划|车端收到任务后首次完成全局路线规划|
|`UPDATE`|路线更新|执行过程中路线调整（如避障后重新规划）|

### 3\.7 多模态大模型辅助感知 \(multimodalAssist\)

> **⚠️ 预留功能**: 该 RPC 协议已定义，但云端**尚未实现**（无 Handler、无 Service）。车端不应在生产环境发送此 RPC。
> 
> 

**触发时机**: 车端感知置信度低于阈值时，请求云端多模态大模型辅助判断

**设计原则**: 自动驾驶不应被人审核。当车端感知置信度不足时，请求云端多模态大模型（而非人工）提供辅助感知决策。大模型输出仅作为参考特征，不接管车辆控制权。

```json
// 车→云：请求辅助感知
{
  "method": "multimodalAssist",
  "params": {
    "requestId": "MA_REQ_20250226_001",
    "sceneType": "TRAFFIC_LIGHT",
    "sceneDescription": "红绿灯颜色不明确，置信度 0.62",
    "priority": "HIGH",
    "vehicleState": {
      "latitude": 22.78,
      "longitude": 113.88,
      "heading": 288.67,
      "speed": 5.2
    },
    "cosObjectKeys": [
      "autonomous/scenes/traffic_light_front_20250226_001.jpg",
      "autonomous/scenes/traffic_light_left_20250226_001.jpg"
    ],
    "metadata": {
      "trafficLightId": "trafficlight_25",
      "detectedColor": "RED",
      "confidenceScore": 0.62
    }
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`requestId`|String|是|请求 ID，用于关联响应|
|`sceneType`|String|是|场景类型|
|`sceneDescription`|String|是|场景描述（自然语言，帮助大模型理解上下文）|
|`priority`|String|是|优先级：`HIGH` / `NORMAL` / `LOW`|
|`vehicleState`|Object|是|请求时的车辆状态（位置/朝向/速度）|
|`cosObjectKeys`|String\[\]|是|腾讯云 COS 对象 Key 列表（图片/点云等感知数据）|
|`metadata`|Object|否|场景相关的结构化元数据|

**云端响应**（符合 `ThingsboardRpcResponse`，业务数据在 `data` 内）：

```json
// 成功
{
  "code": 0,
  "message": "success",
  "data": {
    "requestId": "MA_REQ_20250226_001",
    "status": "SUCCESS",
    "decision": {
      "recommendedAction": "PROCEED",
      "confidenceScore": 0.89,
      "reasoning": "根据前向和左侧图像分析，红绿灯为红灯状态（概率 0.89），建议停止等待。",
      "alternativeActions": [
        {"action": "WAIT", "confidence": 0.89},
        {"action": "REROUTE", "confidence": 0.07}
      ]
    },
    "modelInfo": {
      "modelName": "hunyuan-vision-pro",
      "latencyMs": 320
    },
    "processedAt": 1708210156789
  },
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}

// 失败
{
  "code": 1,
  "message": "大模型超时未响应",
  "data": null,
  "requestId": 123,
  "deviceId": "7e4975b7-af2c-4746-a56f-2d3c4e5f6a7b"
}
```

**`data`**** 业务字段**:

|参数|类型|必填|说明|
|---|---|---|---|
|`requestId`|String|是|关联请求 ID|
|`status`|String|是|`SUCCESS` / `FAILED` / `TIMEOUT`|
|`decision.recommendedAction`|String|否|推荐动作|
|`decision.confidenceScore`|Number|否|置信度 0\-1|
|`decision.reasoning`|String|否|推理过程（自然语言）|
|`decision.alternativeActions`|Array|否|备选方案列表|
|`modelInfo.modelName`|String|否|模型名称|
|`modelInfo.latencyMs`|Integer|否|推理延迟（毫秒）|
|`processedAt`|Long|是|处理完成时间戳|

**关键约束**:

1. 云端仅返回大模型分析结果，不直接控制车辆

2. 车端自动驾驶系统拥有最终决策权

3. 大模型返回的 `recommendedAction` 仅作为参考输入，车端需结合本地感知综合判断

4. 所有图片/点云等附件通过腾讯云 COS 上传，`cosObjectKeys` 为已上传的对象 Key 列表

#### 3\.7\.1 超时、降级与触发阈值（协议约定）

> **当前实现状态（2026\-06\-01）**: 云端 Handler 未实现。本节为**协议层约定**，待 Handler 落地后须严格遵循。
> 
> 

**超时与降级**:

|场景|行为约定|
|---|---|
|**超时阈值**|5 秒（与 `dispatchTask` 接收确认超时一致）|
|**超时期间车辆行为**|保守策略：减速至停止或停车等待，禁止依赖未确认的辅助决策|
|**降级策略**|大模型不可用时，车端按本地感知结果决策；本地置信度仍低于阈值则选择保守等待|
|**重试策略**|不自动重试（同场景不重复请求，避免污染大模型）|

**触发阈值（置信度）**:

|配置项|默认值|说明|
|---|---|---|
|`multimodalAssistThreshold`|`0.7`|Shared Attributes 配置项，车端感知置信度低于此值时触发请求|
|阈值差异化|由车端按场景配置|不同 `sceneType`（红绿灯/道闸/弱交通）可使用不同阈值|

**响应状态语义**:

|`data.status`|语义|车端行为|
|---|---|---|
|`SUCCESS`|大模型返回有效决策|参考 `decision.recommendedAction` 但不强制遵循|
|`FAILED`|大模型分析失败|回退到本地感知|
|`TIMEOUT`|5 秒未收到响应|触发上述超时行为|

> **设计意图**: 预留功能上线时，必须配套实现：
> 
> 1. 云端 Handler（处理 `multimodalAssist` 请求）
> 
> 2. 大模型服务对接（图片/点云 → 推理结果）
> 
> 3. Shared Attributes `multimodalAssistThreshold` 配置入口
> 
> 4. 车端 5 秒超时监控 \+ 减速/停车触发
> 
> 

### 3\.8 车端发起任务 \(createTask\)

车端通过 Client\-side RPC 主动向云端发起任务创建请求。支持 6 种任务类型：CLEANING/PARKING/CHARGING/SUPPLY/WATERING/DUMPING。

**上报方式**: Client\-side RPC

**Topic**: `v1/devices/me/rpc/request/{requestId}`

**QoS**: 1

**请求格式**:

```json
{
  "method": "createTask",
  "params": {
    "taskType": "CLEANING",
    "templateId": 1234567890,
    "priority": 2,
    "clientRequestNo": "VEH_20260625_001"
  }
}
```

**参数说明**:

|字段|类型|必填|说明|
|---|---|---|---|
|`taskType`|String|是|枚举：CLEANING/PARKING/CHARGING/SUPPLY/WATERING/DUMPING|
|`templateId`|Long|否|仅 CLEANING 类型且使用模板时传；不传则一键清扫（fullMapClean=true）|
|`priority`|Integer|否|默认 2（中），1=高 2=中 3=低|
|`clientRequestNo`|String|否|车端幂等号，5 分钟内重复请求返回原 taskId|

**车端语义对照**:

|车端动作|taskType|其他参数|
|---|---|---|
|清扫模板任务|CLEANING|templateId=必填|
|一键清扫|CLEANING|不传 templateId（云端设 fullMapClean=true）|
|一键返航|PARKING|—|
|充电|CHARGING|—|
|补给|SUPPLY|—|
|一键加水|WATERING|—|
|一键倒垃圾|DUMPING|—|

**响应格式**（云端发布到 `v1/devices/me/rpc/response/{requestId}`）:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": 1234567890,
    "taskNo": "T202606250001"
  }
}
```

**错误码**:

|code|message|触发场景|
|---|---|---|
|2001200|车辆不存在|iotId 无对应车辆|
|2001448|车辆非空闲状态，无法发起任务|workStatus ≠ IDLE|
|2001449|车端不支持的任务类型|taskType 不在 6 种范围内|
|2001450|清扫模板不存在或未启用|templateId 无效|
|2001452|请求参数格式错误|params 为 null 或非 JSON 对象|

**协议约束**:

- 车端认证通过 Access Token，云端通过 `request.getDeviceId()` 反查 `VehicleDO.iotId`，无需车端额外传 vehicleId

- 车辆必须空闲（workStatus=IDLE），冲突直接拒绝，不抢占

- 幂等性：`clientRequestNo` 5 分钟内重复请求返回原 taskId

- 不支持类型：OTA 任务、TRANSFER（转场）

### 3\.9 车端任务控制 \(taskControl\)

车端通过 Client\-side RPC 主动向云端请求控制本车任务。该 RPC 只允许控制当前车端所属车辆的任务，云端会校验 `deviceId` 对应车辆与 `taskId` 的绑定关系。

**上报方式**: Client\-side RPC
**Method**: `taskControl`

> **方向说明**：本节定义的是车端 → 云端的 Client\-side RPC。云端 → 车端也使用 `taskControl` method 下发暂停、恢复、取消指令，二者 method 名相同但调用方向不同。
> 
> 

#### 请求参数

```json
{
  "method": "taskControl",
  "params": {
    "taskId": 1234567890,
    "action": "PAUSE",
    "reason": "operator_request",
    "clientRequestNo": "veh-001-20260625-0001"
  }
}
```

|字段|类型|必填|说明|
|---|---|---|---|
|`taskId`|int64|是|云端任务 ID|
|`action`|string|是|控制动作，支持 `PAUSE`、`RESUME`、`CANCEL`|
|`reason`|string|否|车端触发原因，用于日志排查|
|`clientRequestNo`|string|否|车端幂等号，5 分钟内重复请求返回首次处理结果|

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "taskId": 1234567890,
    "taskStatus": "PAUSED"
  }
}
```

#### 约束

- `PAUSE`：仅执行中任务可暂停。

- `RESUME`：暂停或中断任务可恢复。

- `CANCEL`：非终态任务可取消。

- 车端主动 `taskControl` 第一版不支持 `INTERRUPT`；中断仍由云端抢占或人工操作策略触发。

### 3\.10 车端拉取清扫模板 \(queryCleaningTemplates\)

车端通过 Client\-side RPC 拉取本车所属片区的清扫任务模板列表。

**上报方式**: Client\-side RPC

**Topic**: `v1/devices/me/rpc/request/{requestId}`

**QoS**: 1

**请求格式**:

```json
{
  "method": "queryCleaningTemplates",
  "params": {}
}
```

**响应格式**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "templates": [
      {
        "templateId": 1234567890,
        "templateNo": "TPL202606250001",
        "templateName": "主楼前广场清扫",
        "areaId": 1001,
        "areaName": "主楼片区",
        "blockCount": 3,
        "blocks": [
          {"blockId": 2001, "blockName": "区块A", "sweepCount": 2},
          {"blockId": 2002, "blockName": "区块B", "sweepCount": 1}
        ]
      }
    ]
  }
}
```

**错误码**:

|code|message|触发场景|
|---|---|---|
|2001200|车辆不存在|iotId 无对应车辆|
|2001451|车辆未绑定片区，无法查询模板|VehicleDO\.areaId 为空|

---

## 四、数据操作

### 4\.1 日志提取 \(logExtract\)

车端日志文件较大且按模块存储，不适合实时上报。云端通过 RPC 下发日志提取请求，车端将指定时间段和模块的日志打包上传到对象存储，上传完成后通知云端。

```json
{
  "method": "logExtract",
  "params": {
    "requestId": "LOG_REQ_20250226_001",
    "startTime": 1708123456789,
    "endTime": 1708209856789,
    "modules": ["TASK", "RPC", "MQTT"],
    "logLevel": "INFO",
    "uploadUrl": "https://cos.ap-guangzhou.myqcloud.com/logs/LOG_REQ_20250226_001.tar.gz?sign=...",
    "expiresIn": 3600
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`requestId`|String|是|请求 ID，用于关联提取结果|
|`startTime`|Long|是|日志开始时间（毫秒时间戳）|
|`endTime`|Long|是|日志结束时间（毫秒时间戳）|
|`modules`|String\[\]|否|指定模块，不传表示全部模块|
|`logLevel`|String|否|最低日志级别，默认 INFO|
|`uploadUrl`|String|是|腾讯云 COS 预签名上传 URL|
|`expiresIn`|Integer|否|URL 有效期（秒），默认 3600|

**模块枚举**:

|模块|说明|
|---|---|
|`TASK`|任务执行日志|
|`RPC`|RPC 通信日志|
|`MQTT`|MQTT 连接日志|
|`OTA`|OTA 升级日志|
|`SENSOR`|传感器日志|
|`NAVIGATION`|导航日志|
|`CLEANING`|清扫日志|
|`SYSTEM`|系统日志|

**车端处理流程**:

1. 收到 `logExtract` RPC 请求

2. 根据 `startTime`、`endTime`、`modules`、`logLevel` 过滤日志

3. 将符合条件的日志打包为 `.tar.gz` 或 `.zip` 文件

4. 上传到 `uploadUrl`（腾讯云 COS 预签名 URL，无需额外认证）

5. 上传完成后，通过 `logExtractResult` RPC 通知云端

### 4\.2 日志提取结果上报 \(logExtractResult\)

```json
// 提取成功
{
  "method": "logExtractResult",
  "params": {
    "requestId": "LOG_REQ_20250226_001",
    "status": "SUCCESS",
    "fileUrl": "https://cos.ap-guangzhou.myqcloud.com/logs/LOG_REQ_20250226_001.tar.gz",
    "fileSize": 10485760,
    "logCount": 12580,
    "modules": ["TASK", "RPC", "MQTT"],
    "timeRange": {
      "start": 1708123456789,
      "end": 1708209856789
    },
    "completedAt": 1708210156789,
    "failReason": ""
  }
}

// 提取失败
{
  "method": "logExtractResult",
  "params": {
    "requestId": "LOG_REQ_20250226_001",
    "status": "FAILED",
    "fileUrl": "",
    "fileSize": 0,
    "logCount": 0,
    "modules": [],
    "timeRange": {},
    "completedAt": 1708210156789,
    "failReason": "存储空间不足，无法打包日志"
  }
}
```

|参数|类型|必填|说明|
|---|---|---|---|
|`requestId`|String|是|关联原始请求 ID|
|`status`|String|是|`SUCCESS` / `FAILED`|
|`fileUrl`|String|否|文件下载 URL（成功时）|
|`fileSize`|Long|否|文件大小（字节）|
|`logCount`|Integer|否|日志条数|
|`modules`|String\[\]|否|实际包含的模块|
|`timeRange`|Object|否|实际日志时间范围|
|`completedAt`|Long|是|完成时间戳|
|`failReason`|String|否|失败原因（失败时）|

---

## 五、RPC 方法汇总

### 设备控制 \(云→车\)

|方法名|用途|主要参数|备注|实现状态|
|---|---|---|---|---|
|`deviceControl`|统一设备控制|target, command, params|sweeper/light/audio/camera/wiper/siren/fan/dustbin/water/reboot|已实现|
|`emergencyStop`|紧急停止|enable|全局最高优先级|已实现|
|`sensorToggle`|高频遥测开关|enable, sensorTypes, duration|节省带宽|已实现|
|`getDeviceInfo`|获取设备信息|\-|系统/车辆/地图|已实现|
|`cameraCapture`|摄像头抓拍|topics|获取图片 URL|模拟器|
|`areaSwitch`|片区切换|areaId, areaName, hdMapVersion, pcdMapVersion|不创建任务|已实现|
|`releaseFaultGuard`|解除故障保护|\-||已实现|
|`deleteMap`|删除地图|areaId, mapType|HD/PCD/ALL|已实现|
|`logExtract`|日志提取请求|requestId, startTime, endTime, modules, uploadUrl||已实现|

### 车端事件 \(车→云\)

|方法名|用途|主要参数|
|---|---|---|
|`trafficLightEvent`|红绿灯事件|eventStatus, trafficLightId, trafficLightColor, direction, confidenceScore|
|`barrierEvent`|道闸事件|eventStatus, barrierId, confidenceScore|
|`crashEvent`|碰撞事件|eventStatus, crashStatus, confidenceScore, cosImageKeys|
|`pipelineEvent`|管线缠绕事件|eventStatus, confidenceScore|
|`weakTrafficEvent`|弱交通场景事件|eventStatus, confidenceScore|
|`routePlanUpdate`|全局路线规划上报|taskId, planType, referencePoints|
|`multimodalAssist`|多模态大模型辅助感知|requestId, sceneType, sceneDescription, cosObjectKeys|
|`logExtractResult`|日志提取结果|requestId, status, fileUrl, fileSize|
|`createTask`|车端发起任务创建（CLEANING/PARKING/CHARGING/SUPPLY/WATERING/DUMPING）|taskType, templateId, priority, clientRequestNo|
|`taskControl`|车端主动任务控制（暂停/恢复/取消本车任务）|taskId, action, reason, clientRequestNo|
|`queryCleaningTemplates`|车端拉取本车所属片区的清扫模板列表|\-|

---

 (注：内容由 AI 生成，请谨慎参考）
