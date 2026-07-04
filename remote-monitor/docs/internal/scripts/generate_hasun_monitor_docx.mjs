/**
 * 生成《发给Hasun-远程监控与控制API确认单.docx》
 * 运行：cd remote-monitor/docs/internal/scripts && npm install docx && node generate_hasun_monitor_docx.mjs
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
const OUT = path.join(__dirname, '..', '发给Hasun-远程监控与控制API确认单.docx')

const FONT = 'Microsoft YaHei'
const FONT_CODE = 'Consolas'
const BODY = 22
const SMALL = 20

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
    default: { document: { run: { font: FONT, size: BODY } } }
  },
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 720, after: 240 },
          children: [
            new TextRun({
              text: '云平台远程监控与控制',
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
              text: 'API 确认单（V2.0）',
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
        labelValue('文档版本：', 'V2.0 · 2026-07-04'),
        labelValue('范围：', '鉴权、车辆状态、开流/关流、远程反控（2010002/5/8）'),
        labelValue('不含：', '室内雷达感知（见《发给Hasun-监控页雷达感知API确认单》）'),
        labelValue('联调方式：', '前端本地 npm run dev 直连 admin-api（无独立测试环境）'),
        labelValue('协议正文：', 'remote-monitor/docs/灵鱿科技远程监控与控制协议-V2.0-云平台API篇.md'),
        spacer(),

        h1('目录'),
        new TableOfContents('', { hyperlink: true, headingStyleRange: '1-2' }),
        spacer(),

        h1('1. 环境与映射（请 Hasun 填写）'),
        makeTable(
          ['项', '填写说明', 'Hasun 填写'],
          [
            ['admin-api Base URL', '如 https://sztu.lingubot.cn/admin-api', ''],
            ['生产环境 Base URL', '如有不同请注明', ''],
            ['联调 vehicleId', '如 hasun-test、LU2605000922', ''],
            ['deviceId ↔ MQTT clientId', '映射规则或对照表', ''],
            ['联调账号', '测试用登录账号', '']
          ],
          [22, 38, 40]
        ),
        spacer(),

        h1('2. 开摄像头 — POST /device/instructions type=2010004'),
        body('sztu 实测（hasun-test）：view 1–4 已抓包验证；每次请求开启单路，响应字段为 url / name / info / status。'),
        h2('2.1 请求格式'),
        ...codeLines([
          '{',
          '  "deviceId": "hasun-test",',
          '  "type": "2010004",',
          '  "data": { "status": 1, "view": 1 }',
          '}'
        ]),
        body('view：1=前，2=右，3=后，4=左，5=环视。五路监控需对 view 1–5 分别请求。'),
        h2('2.2 五路对照（sztu · hasun-test）'),
        makeTable(
          ['view', 'info', 'name（实测）', '状态'],
          [
            ['1 前', '前', 'KRIPC_93002871_100', '✅ 已抓包'],
            ['2 右', '右', 'KRIPC_93003115_86', '✅ 已抓包'],
            ['3 后', '后', 'KRIPC_93003115_60', '✅ 已抓包'],
            ['4 左', '左', 'KRIPC_93002892_28', '✅ 已抓包'],
            ['5 环视', '待确认', '待抓包', '⏳ 待 Hasun 确认']
          ],
          [12, 12, 38, 38]
        ),
        h2('2.3 响应示例（view=1）'),
        ...codeLines([
          '{',
          '  "code": 0,',
          '  "data": [{',
          '    "name": "KRIPC_93002871_100",',
          '    "url": "https://sztu-video.lingubot.cn/.../webrtc?...&type=play",',
          '    "info": "前",',
          '    "status": 1',
          '  }],',
          '  "msg": ""',
          '}'
        ]),
        body('WebRTC：对每路 url POST offer SDP，换取 answer SDP 后播放。'),
        h2('2.4 待 Hasun 确认（视频）'),
        makeTable(
          ['确认项', 'Hasun 答复'],
          [
            ['view=5 环视响应 name / info 格式', ''],
            ['无环视硬件时 data 为空 [] 还是报错', ''],
            ['view=6 云台流是否支持', ''],
            ['哪些 deviceId 有五路摄像头', '']
          ],
          [45, 55]
        ),
        spacer(),

        h1('3. 关摄像头 — status=0 + cameraName'),
        body('关流使用开流响应 data[].name，不使用 view。'),
        ...codeLines([
          '{',
          '  "deviceId": "hasun-test",',
          '  "type": "2010004",',
          '  "data": { "status": 0, "cameraName": "KRIPC_93002871_100" }',
          '}'
        ]),
        makeTable(
          ['确认项', 'Hasun 答复'],
          [
            ['关流后响应 status 仍为 1 的含义', ''],
            ['无观众自动关流超时 T 秒', '']
          ],
          [45, 55]
        ),
        spacer(),

        h1('4. 车辆状态 — GET /device/select_device_detail_by_id'),
        body('聚合车端 1010001，约 1Hz。前端监控页约 3s 轮询。'),
        body('sztu 实测 hasun-test：有 battery、workStatus、taskId、nextNodeName、position；无 position_xyz、heading。'),
        makeTable(
          ['字段', '说明', 'hasun-test 实测'],
          [
            ['battery / workStatus / taskId', '基础遥测', '有'],
            ['position', 'GPS 经度,纬度', '有（近 0）'],
            ['position_xyz / heading', '室内地图位姿', '无'],
            ['nextNodeName / nextNodeTime', '任务节点', '有']
          ],
          [28, 42, 30]
        ),
        makeTable(
          ['确认项', 'Hasun 答复'],
          [
            ['detail 何时映射 position_xyz、heading 等字段', ''],
            ['列表 details 嵌套 vs 平铺规范', '']
          ],
          [45, 55]
        ),
        spacer(),

        h1('5. 远程反控 — POST /device/instructions'),
        body('路径与开流相同；type 不同。code=0 表示云平台已受理转发。'),
        makeTable(
          ['type', '用途', 'sztu'],
          [
            ['2010005', '遥控 WASD / speed+angle', 'HTTP 受理 ✅'],
            ['2010002', '灯光 / 云台 / 作业等', 'HTTP 受理 ✅'],
            ['2010008', '急停 / 解除', '待联调'],
            ['2010001', '任务下发', '待文档化']
          ],
          [15, 45, 40]
        ),
        h2('5.1 2010005 示例（模式 A）'),
        ...codeLines([
          '{',
          '  "deviceId": "LU2605000922",',
          '  "type": "2010005",',
          '  "data": { "command": "FORWARD", "speedLevel": 2, "seq": 1 }',
          '}'
        ]),
        makeTable(
          ['确认项', 'Hasun 答复'],
          [
            ['2010002/2010008 仅受理还是同步返回车端 dev/reply', ''],
            ['车端离线/超时 HTTP 错误码与秒数', ''],
            ['2010005 车端执行 M1 联调结论', ''],
            ['2010001 任务 Body 示例', '']
          ],
          [45, 55]
        ),
        spacer(),

        h1('6. HTTP 错误码（请 Hasun 补充）'),
        makeTable(
          ['code', '含义', 'Hasun 补充'],
          [
            ['0', '成功（含已受理转发）', ''],
            ['401', '未登录 / Token 失效', ''],
            ['403', '无权限', ''],
            ['502', '车端离线或转发失败', ''],
            ['', '其他业务错误码', '']
          ],
          [15, 40, 45]
        ),
        spacer(),

        h1('7. 验收清单'),
        checkbox('view 1–4 开流 + WebRTC 播放正常'),
        checkbox('关流 cameraName 逐路关闭正常'),
        checkbox('detail 返回监控页所需遥测字段'),
        checkbox('2010005 / 2010002 / 2010008 反控链路明确（受理或 reply）'),
        checkbox('deviceId 与 clientId 映射书面确认'),
        spacer(),

        h1('8. Hasun 确认签字'),
        makeTable(
          ['确认项', '答复'],
          [
            ['admin-api Base URL（sztu / 生产）', ''],
            ['deviceId ↔ clientId', ''],
            ['view=5 环视计划与 JSON', ''],
            ['关流语义 / 自动关流 T 秒', ''],
            ['detail 扩展字段计划', ''],
            ['反控 reply 格式 / 超时', ''],
            ['其他说明', '']
          ],
          [35, 65]
        ),
        spacer(),
        body('联系人：________________    日期：________________')
      ]
    }
  ]
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(OUT, buffer)
console.log('Wrote', OUT)
