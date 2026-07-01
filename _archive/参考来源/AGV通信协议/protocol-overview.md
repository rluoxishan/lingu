# 协议概述与通信基础

> 本文档在《车辆IOT实现方案》第 4、5 章基础上整理，并补充车端 ROS ICD 桥接说明。  
> **原则**：IOT 方案已有字段、Topic、type 编码 **原样保留**；拓展字段/指令 **追加**，不修改已有语义。

---

## 一、云平台服务组件（IOT 方案 §3）

| 组件 | 版本 |
| ---- | ---- |
| EMQX | 5.8.4 |
| MySQL | 5.7 |
| Redis | 4.0 (1.9.1) |

---

## 二、IOT 交互流程（IOT 方案 §4）

### 2.1 车辆注册

1. 在云平台上注册车辆  
2. 注册后云平台提供秘钥文件下载  
3. 将秘钥文件保存到车辆指定位置  
4. 配置 EMQX 服务信息  

### 2.2 车辆与 EMQX 建立连接

1. 车辆启动读取秘钥文件、EMQX 服务信息  
2. 车辆与 EMQX 建立 MQTT 连接  
3. 连接成功/失败  

> EMQX 使用 `emqx_auth_mysql` 插件：根据 MySQL 中注册的用户名和密码验证连接是否合法。

### 2.3 车辆在线/离线状态

1. 车辆连接或断开 EMQX 时触发上/下线事件  
2. 云服务在线则实时消费事件，更新车辆在线状态  
3. 云服务离线时，EMQX 将事件保存到队列，待恢复后继续消费  

**EMQX 原始事件 Topic**：

- 上线：`$events/client_connected`
- 下线：`$events/client_disconnected`

**规则引擎转发**（IOT 方案 §4.3，设置 retain 以防丢失）：

```
/mqtt/onoff/{sn}
```

**云平台共享订阅**（IOT 方案 §5.1）：

```
$share/{app_name}/online_status/+
```

> 部署时由规则引擎将 `/mqtt/onoff/{sn}` 转发至 `online_status/{sn}` 或等价 Topic，本文档统一写作 `online_status/{clientId}`。

### 2.4 车辆接收云平台指令

1. 云服务通过 EMQX 向 `dev/sub/{clientId}` 发布指令  
2. 车辆订阅并处理  
3. 车辆向 `dev/reply/{clientId}` 发布执行结果  
4. 云服务订阅 `dev/reply/+` 获取回复  

### 2.5 车辆数据上报云平台

1. 车辆向 `dev/pub/{clientId}` 发布数据  
2. 未及时消费的消息进入队列  
3. 云服务通过 `$share/{app_name}/dev/pub/+` 消费并存储  

---

## 三、MQTT Topic（IOT 方案 §5.1）

### 3.1 车辆端

| Topic | 说明 |
| ----- | ---- |
| `dev/sub/{clientId}` | 订阅云服务下发 |
| `dev/reply/{clientId}` | 发布指令回复 |
| `dev/pub/{clientId}` | 发布状态/任务等上报 |

### 3.2 云平台端

| Topic | 说明 |
| ----- | ---- |
| `dev/sub/{clientId}` | 向车辆下发 |
| `dev/reply/+` | 订阅车辆回复 |
| `$share/{app_name}/dev/pub/+` | 共享订阅车辆上报 |
| `$share/{app_name}/online_status/+` | 共享订阅上/下线 |

---

## 四、消息信封（IOT 方案 §5.3）

### 4.1 云平台下发

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| id | Long | 雪花算法，车辆回复时原样回传 |
| time | Long | 时间戳（毫秒） |
| type | String | 指令类型 AAABBBB（AAA=模块，BBBB=编码） |
| data | Object | 业务数据体 |

```json
{
  "id": 1686004858937364480,
  "time": 1740469352000,
  "type": "2010001",
  "data": {}
}
```

### 4.2 车辆回复

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| id | Long | 回传云平台下发的 id |
| code | Integer | 200-成功，500-失败 |
| msg | String | 描述 |
| time | Long | 时间戳（毫秒） |
| type | String | 回传云平台 type |
| data | Object | 附加数据 |

```json
{
  "id": 1686004858937364480,
  "code": 200,
  "msg": "ok",
  "time": 1740469352100,
  "type": "2010001",
  "data": {}
}
```

### 4.3 车辆主动上报

结构与下发相同（无 code/msg），id 由车辆生成，确保短时间内不重复。

### 4.4 指令类型表（IOT 方案 §5.3）

| 发起方 | 模块 | 编码 | 完整 type | 说明 |
| ------ | ---- | ---- | --------- | ---- |
| 车辆 | 101 | 0001 | 1010001 | 状态上报 |
| 车辆 | 101 | 0002 | 1010002 | 本地任务列表上报 |
| 云平台 | 201 | 0001 | 2010001 | 下发任务 |
| 云平台 | 201 | 0002 | 2010002 | 修改参数 |
| 云平台 | 201 | 0003 | 2010003 | 车辆出货 |
| 云平台 | 201 | 0004 | 2010004 | 开启视频 |
| 云平台 | 201 | 0005 | 2010005 | 遥控车辆 |
| 云平台 | 201 | 0006 | 2010006 | 查看车辆配置 |
| 云平台 | 201 | 0007 | 2010007 | 获取车辆点位信息 |
| 云平台 | 201 | 0008 | 2010008 | 紧急开关操作 |

**v1.0 拓展 type**（不影响上表）：

| type | 说明 |
| ---- | ---- |
| 1010003 | 高频定位上报 |
| 1010004 | 故障状态上报 |
| 1010005 | 避障/重规划事件 |
| 2010009 | 任务控制（暂停/恢复/停止） |
| 2010010~2010012 | 定位校准/建图/地图同步 |

---

## 五、设备认证（IOT 方案 §5.2）

| 参数 | 值 |
| ---- | -- |
| ClientId | 车辆注册编号 |
| Username | 车辆注册编号 |
| Password | 从秘钥文件按双方约定规则解析 |
| Keep Alive | 60 秒（推荐） |

---

## 六、车端 ROS 桥接（拓展说明）

车端 `mqtt_iot_bridge` 在 IOT MQTT 层与 ICD 算法层之间转换载荷，算法层无感知 MQTT。

```
dev/sub ──► PayloadAdapter ──► /swj/swj_request_srv
/zwj/zwj_* ◄── 缓存 ◄── 算法上报
dev/pub ◄── 1010001 等
```

详见 [protocol-mapping.md](protocol-mapping.md)。

---

## 相关文档

- [周期性上报](protocol-telemetry.md) — IOT §6.1
- [车端事件上报](protocol-rpc-client.md) — IOT §6.2
- [云平台下发](protocol-rpc-server.md) — IOT §7
- [协议拓展说明](protocol-revision.md)
