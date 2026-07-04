/**
 * 生成《发给Hasun-监控页雷达感知API确认单.docx》
 * 运行：cd remote-monitor/docs/internal/scripts && npm install docx && node generate_hasun_perception_docx.mjs
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType
} from 'docx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', '发给Hasun-监控页雷达感知API确认单.docx')

const FONT = 'Microsoft YaHei'
const FONT_CODE = 'Consolas'
const BODY = 22 // 11pt
const SMALL = 20 // 10pt

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 }
  })
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 }
  })
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [new TextRun({ text, font: FONT, size: BODY, ...opts })]
  })
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: label, font: FONT, size: BODY, bold: true }),
      new TextRun({ text: value, font: FONT, size: BODY })
    ]
  })
}

function codeLines(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : lines
  return text.split('\n').map(
    (line) =>
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 420 },
        children: [new TextRun({ text: line, font: FONT_CODE, size: SMALL })]
      })
  )
}

function checkbox(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: `☐ ${text}`, font: FONT, size: BODY })]
  })
}

function makeTable(headers, rows, colWidths = null) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const headerShading = { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' }

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h, i) =>
        new TableCell({
          borders,
          shading: headerShading,
          width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, font: FONT, size: SMALL, bold: true })]
            })
          ]
        })
    )
  })

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              borders,
              width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              verticalAlign: 'center',
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, font: FONT, size: SMALL })]
                })
              ]
            })
        )
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows]
  })
}

function spacer() {
  return new Paragraph({ spacing: { after: 160 }, children: [] })
}

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: {
      document: {
        run: { font: FONT, size: BODY }
      }
    },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        run: { size: 44, bold: true, font: FONT, color: '1F3864' },
        paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER }
      }
    ]
  },
  sections: [
    {
      properties: {},
      children: [
        // 封面
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 720, after: 240 },
          children: [
            new TextRun({
              text: '云平台远程监控',
              font: FONT,
              size: 52,
              bold: true,
              color: '1F3864'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: '室内雷达感知 API 确认单',
              font: FONT,
              size: 40,
              bold: true,
              color: '2E5090'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          children: [
            new TextRun({ text: '（请 Hasun / 云平台填写）', font: FONT, size: BODY, color: '666666' })
          ]
        }),
        labelValue('文档版本：', 'V1.0 · 2026-07-04'),
        labelValue('协议依据：', '《云平台-机器人通信协议-内部标准版》§6.4 / §7.12 / §7.10'),
        labelValue('前端工程：', 'ling-ubot_front-end / yudao-ui-admin-vue3'),
        labelValue('联调方式：', '前端本地 npm run dev 直连云平台 API（无独立测试环境）'),
        spacer(),

        // 目录（Word 导航窗格 / 目录域）
        h1('目录'),
        new TableOfContents('', {
          hyperlink: true,
          headingStyleRange: '1-2'
        }),
        spacer(),

        h1('1. 文档说明'),
        body(
          '灵鱿前端监控页需展示室内车型雷达感知图（PGM 栅格底图 + 1010003 障碍物多边形 + 车位姿）。本文档约定云平台需提供的 HTTP / WebSocket 接口及字段，供 Hasun 确认并实现。'
        ),
        body('我方无独立「测试环境」：由前端项目在本地启动后，通过 .env 配置直连云平台 admin-api 进行联调验收。', {
          bold: true
        }),
        body(
          '1010001 / select_device_detail 仅 1Hz 且无 obstacles，不能替代 1010003 作为雷达感知数据源。'
        ),

        h1('2. 联调与对接信息（请 Hasun 填写）'),
        makeTable(
          ['项', '填写说明', 'Hasun 填写'],
          [
            ['admin-api Base URL', '与前端 .env 中 VITE_BASE_URL + VITE_API_URL 一致', ''],
            ['WebSocket 完整 URL 模板', 'perception/stream 含 deviceId、鉴权参数', ''],
            ['联调 deviceId', '室内车型，可收到 1010003', ''],
            ['deviceId ↔ MQTT clientId', '映射关系', ''],
            ['设备绑定 mapId', '例：lhgk_101', ''],
            ['坐标系确认', 'position_xyz 与 PGM origin/resolution 同一 map 系', '☐ 已确认  ☐ 待确认']
          ],
          [22, 38, 40]
        ),
        spacer(),
        h2('2.1 前端本地联调步骤（我方）'),
        body('1. cd ling-ubot_front-end/yudao-ui-admin-vue3 && npm run dev'),
        body('2. .env.local 配置云平台地址；可选 VITE_MONITOR_PERCEPTION_ENABLED=true'),
        body('3. 登录 → 车辆列表 → 监控 → F12 看 Network：detail 遥测、2010012 POST、map_meta/perception 响应'),
        spacer(),
        h2('2.2 已有数据与抓包边界'),
        body(
          'F12 只能看到浏览器 ↔ admin-api 的 HTTP/WS，抓不到车端 EMQX 上 dev/pub、dev/sub 原文。'
        ),
        makeTable(
          ['数据', '现有来源', 'F12 能否抓到', '雷达图够用吗'],
          [
            ['battery / workStatus / taskId', 'GET select_device_detail（聚合 1010001）', '能', '状态栏够用'],
            ['position_xyz / heading', '同上（视车端是否上报）', '有字段时能', '慢速车位姿可凑合；无 obstacles'],
            ['视频开/关等', 'POST instructions 2010004（sztu 已抓包）', '能', '—'],
            ['2010012 开关', 'POST instructions type=2010012', '待试（路径已有）', '开启 1010003 前置'],
            ['地图元数据', '协议 2010010（MQTT）；本文 map_meta 为 HTTP 封装', 'MQTT 看不到', '需 PNG URL + origin/resolution'],
            ['obstacles / 10Hz', '1010003 dev/pub', '看不到', '必须；1010001 不含']
          ],
          [22, 32, 18, 28]
        ),
        body(
          '结论：A 多为补 type=2010012 转发；B/C/D 是把协议侧已有数据暴露给前端，不是从零设计 MQTT。样例地图 lhgk_101 仅本地 demo。'
        ),
        spacer(),

        h1('3. 数据链路'),
        ...codeLines([
          '监控页打开（室内车，无 GPS）',
          '  → POST /device/instructions   type=2010012   status=ON',
          '  → 车端 dev/pub 1010003 @10Hz',
          '  → 云平台订阅 EMQX，缓存最新帧',
          '  → WS /device/perception/stream 推前端（或 GET /device/perception/latest）',
          '  → 前端叠加 PGM 底图 + obstacles + 车位姿',
          '',
          '监控页关闭',
          '  → 2010012 OFF + 断开 WS'
        ]),
        spacer(),

        h1('4. API 一览'),
        makeTable(
          ['编号', '方法', '路径', '状态', '说明'],
          [
            ['A', 'POST', '/device/instructions', '路径已有；2010012 待验证', '开/关 1010003（F12 试 POST）'],
            ['B', 'GET', '/device/map_meta', 'HTTP 待确认', '协议有 2010010；需 PNG + origin'],
            ['C', 'WebSocket', '/device/perception/stream', '待实现', '桥接 1010003；EMQX 抓不到'],
            ['D', 'GET', '/device/perception/latest', '待实现', 'WS 兜底']
          ],
          [8, 12, 28, 14, 38]
        ),
        spacer(),

        h1('5. API A — 2010012 高频开关'),
        body('经现有 instructions 接口转发至 dev/sub/{clientId}。监控页打开时发 ON，关闭时发 OFF；前端每 5 秒重发 ON 作心跳。'),
        h2('5.1 开启请求'),
        body('POST /device/instructions'),
        ...codeLines([
          '{',
          '  "deviceId": "{deviceId}",',
          '  "type": "2010012",',
          '  "data": {',
          '    "status": "ON",',
          '    "sensorTypes": ["RTK", "OBSTACLE", "TRAJECTORY"],',
          '    "frequencyHz": 10,',
          '    "durationSec": 300,',
          '    "keepAlivePeriods": 3,',
          '    "heartbeatIntervalSec": 5',
          '  }',
          '}'
        ]),
        h2('5.2 关闭请求'),
        ...codeLines(['{', '  "deviceId": "{deviceId}",', '  "type": "2010012",', '  "data": { "status": "OFF" }', '}']),
        h2('5.3 sensorTypes 与雷达图'),
        makeTable(
          ['sensorTypes', '1010003 字段', '雷达图用途'],
          [
            ['RTK', 'position_xyz, heading, speedMps', '车位姿（必须）'],
            ['OBSTACLE', 'obstacles[]', '障碍物多边形（必须）'],
            ['TRAJECTORY', 'trajectoryPoints[]', '局部规划线（建议）'],
            ['ULTRASONIC', 'ultrasonicSense[]', '超声（可选）']
          ],
          [22, 38, 40]
        ),
        body('室内 MVP 建议开启：RTK + OBSTACLE + TRAJECTORY。'),
        spacer(),

        h1('6. API B — GET /device/map_meta'),
        body('GET /device/map_meta?deviceId={deviceId}&mapId={mapId?}'),
        body('不传 mapId 时按设备当前绑定地图返回；mapId 须与 1010003 帧内一致。参考样例：remote-monitor/地图与雷达文件/lhgk_101.yaml'),
        h2('6.1 响应 data 字段'),
        makeTable(
          ['字段', '类型', '必填', '说明'],
          [
            ['mapId', 'String', '是', '如 lhgk_101'],
            ['imageUrl', 'String', '是', 'PNG/JPG 可访问 URL（PGM 转换）'],
            ['width', 'Integer', '是', '像素宽'],
            ['height', 'Integer', '是', '像素高'],
            ['resolution', 'Number', '是', '米/像素，如 0.05'],
            ['origin', 'Number[3]', '是', '图像左下角世界坐标 [x, y, yaw]'],
            ['negate', 'Integer', '否', '0 = 白空闲、黑占用']
          ],
          [18, 14, 10, 58]
        ),
        h2('6.2 响应示例'),
        ...codeLines([
          '{',
          '  "code": 0,',
          '  "data": {',
          '    "mapId": "lhgk_101",',
          '    "imageUrl": "https://{host}/static/maps/lhgk_101.png",',
          '    "width": 3153,',
          '    "height": 944,',
          '    "resolution": 0.05,',
          '    "origin": [-11.0641, -37.6333, 0.0]',
          '  }',
          '}'
        ]),
        h2('6.3 坐标换算（前端绘制）'),
        ...codeLines([
          'pixelX = (worldX - origin[0]) / resolution',
          'pixelY = height - (worldY - origin[1]) / resolution'
        ]),
        spacer(),

        h1('7. API C — WebSocket /device/perception/stream'),
        body('连接示例：wss://{host}/admin-api/device/perception/stream?deviceId={id}&token={jwt}'),
        body('请确认鉴权方式（Query token 或 Header Authorization 二选一）。仅推送该 deviceId 的 1010003，建议 5–10Hz。'),
        h2('7.1 下行消息示例'),
        ...codeLines([
          '{',
          '  "code": 0,',
          '  "msg": "1010003",',
          '  "data": {',
          '    "mapId": "lhgk_101",',
          '    "position_xyz": "64.882,-14.310,0",',
          '    "heading": 92.5,',
          '    "speedMps": 0.35,',
          '    "trajectoryPoints": [',
          '      { "x": 65.0, "y": -14.5, "z": 0 }',
          '    ],',
          '    "obstacles": [',
          '      {',
          '        "id": 1,',
          '        "type": "PEDESTRIAN",',
          '        "polygon": [',
          '          { "x": 68.1, "y": -12.0 },',
          '          { "x": 68.5, "y": -12.0 },',
          '          { "x": 68.5, "y": -11.6 },',
          '          { "x": 68.1, "y": -11.6 }',
          '        ]',
          '      }',
          '    ]',
          '  }',
          '}'
        ]),
        h2('7.2 data 字段（室内 MVP）'),
        makeTable(
          ['字段', '类型', '必填', '说明'],
          [
            ['mapId', 'String', '是', '与 map_meta 一致'],
            ['position_xyz', 'String', '是', 'x,y,z（米），map 坐标系'],
            ['heading', 'Number', '是', '航向角（度）'],
            ['obstacles', 'Array', '有感知时必填', '障碍物多边形，map 坐标'],
            ['trajectoryPoints', 'Array', '否', '局部规划轨迹'],
            ['ultrasonicSense', 'Array', '否', 'distance 单位：厘米']
          ],
          [18, 14, 14, 54]
        ),
        h2('7.3 obstacles[] 元素'),
        makeTable(
          ['字段', '类型', '必填', '说明'],
          [
            ['id', 'Integer', '是', '跟踪 id'],
            ['type', 'String', '是', 'PEDESTRIAN / VEHICLE / STATIC / UNKNOWN'],
            ['polygon', 'Array', '是', '≥3 顶点 {x,y}，map 坐标（米）']
          ],
          [18, 14, 10, 58]
        ),
        spacer(),

        h1('8. API D — GET /device/perception/latest'),
        body('GET /device/perception/latest?deviceId={deviceId}'),
        body('响应 data 与 WebSocket 相同；无数据时返回 data: null。前端 WS 连续失败 4 次后改 200ms 轮询。'),
        spacer(),

        h1('9. 车端 MQTT 1010003（云平台订阅来源）'),
        body('Topic：dev/pub/{clientId} · QoS 0 · type=1010003'),
        body('云平台：订阅 → 解析 → Redis 最新帧 → 推 WS。'),
        ...codeLines([
          '{',
          '  "type": "1010003",',
          '  "data": {',
          '    "mapId": "lhgk_101",',
          '    "position_xyz": "64.882,-14.310,0",',
          '    "heading": 92.5,',
          '    "obstacles": []',
          '  }',
          '}'
        ]),
        spacer(),

        h1('10. 验收清单'),
        h2('10.1 云平台（Hasun）'),
        checkbox('POST /device/instructions 支持 type=2010012，可转发至 dev/sub/{clientId}'),
        checkbox('订阅 dev/pub/+，识别 type=1010003'),
        checkbox('实现 GET /device/map_meta（至少一张室内 PGM）'),
        checkbox('实现 WS /device/perception/stream 或 GET /device/perception/latest'),
        checkbox('确认 position_xyz 与 PGM origin/resolution 为同一 map 坐标系'),
        checkbox('监控页关闭后会话结束，车端停止 1010003'),
        h2('10.2 车端'),
        checkbox('收到 2010012 ON 后开始 1010003 @10Hz'),
        checkbox('每帧含 mapId、position_xyz、heading'),
        checkbox('有障碍时 obstacles[].polygon 为 map 世界坐标（米）'),
        h2('10.3 前端（我方自测）'),
        checkbox('本地 npm run dev 可打开室内车监控页'),
        checkbox('map_meta 返回后 IndoorMapPanel 显示 PGM 底图'),
        checkbox('1010003 推送后障碍物/车位姿实时刷新'),
        spacer(),

        h1('11. Hasun 确认答复'),
        makeTable(
          ['确认项', '答复'],
          [
            ['admin-api Base URL', ''],
            ['WebSocket URL 与鉴权方式', ''],
            ['2010012 是否已支持 / 计划时间', ''],
            ['map_meta / perception 接口计划时间', ''],
            ['联调用 indoor deviceId', ''],
            ['坐标系与样例地图 mapId', ''],
            ['其他说明', '']
          ],
          [35, 65]
        )
      ]
    }
  ]
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(OUT, buffer)
console.log('Wrote', OUT)
