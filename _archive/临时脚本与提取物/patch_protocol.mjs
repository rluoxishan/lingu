/**
 * Finalize 内部标准版.docx patches (idempotent).
 * Skip: @hasun 7.11 placeholder.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCX = path.join(__dirname, '云平台-机器人通信协议-内部标准版.docx');
const FONT = '微软雅黑';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function para(text, bold = false) {
  const b = bold ? '<w:b w:val="1"/>' : '';
  return `<w:p><w:pPr><w:rPr/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/><w:sz w:val="21"/>${b}</w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function tableRow(cells, header = false) {
  const fill = header ? 'D9E2F3' : 'FFFFFF';
  return `<w:tr>${cells
    .map((c) => {
      const b = header ? '<w:b w:val="1"/>' : '';
      return `<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/></w:tcPr><w:p><w:pPr><w:rPr/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/><w:sz w:val="21"/>${b}</w:rPr><w:t>${esc(c)}</w:t></w:r></w:p></w:tc>`;
    })
    .join('')}</w:tr>`;
}

function table(rows) {
  const grid = `<w:tblGrid>${rows[0].map(() => '<w:gridCol w:w="2200"/>').join('')}</w:tblGrid>`;
  const trs = rows.map((r, i) => tableRow(r, i === 0)).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>${grid}${trs}</w:tbl>`;
}

function getParas(xml) {
  return [...xml.matchAll(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g)].map((m) => {
    const inner = m[1];
    const text = [...inner.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
    return { full: m[0], text };
  });
}

function replacePara(xml, needle, newFull) {
  const p = getParas(xml).find((x) => x.text.includes(needle));
  if (!p) throw new Error(`Not found: ${needle}`);
  return xml.replace(p.full, newFull);
}

function removeParasMatching(xml, pred) {
  let out = xml;
  for (const p of getParas(out)) {
    if (pred(p.text)) out = out.replace(p.full, '');
  }
  return out;
}

const extraPerceptionRows = [
  ['absenceDurationSec', 'Integer', '否', 'ABSENCE_FROM_POST：离岗持续秒数'],
  ['objectType', 'String', '否', 'ABNORMAL_OBJECT：遗留物/堆放物等类型描述'],
  ['matchScore', 'Number', '否', 'INTERNAL_FACE_MATCH：人脸比对分数 0-1'],
  ['keywords', 'String[]', '否', 'SENSITIVE_WORD：命中的敏感词列表'],
  ['transcript', 'String', '否', 'SENSITIVE_WORD：语音识别文本片段'],
];

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(DOCX));
  let xml = await zip.file('word/document.xml').async('string');

  // 5.6.17: fix field path + xlsx reference
  if (!xml.includes('口岸平台后台报警的机器人相关功能描述.xlsx')) {
    xml = replacePara(
      xml,
      '5.6.17 PerceptionEventType（1010001.eventType',
      para(
        '5.6.17 PerceptionEventType（1010001.perceptionInfo.eventType，String 枚举）'
      ) +
        para(
          '枚举定义对齐《口岸平台后台报警的机器人相关功能描述.xlsx》；自驾机器人场景可额外使用 TRAFFIC_LIGHT、BARRIER。'
        )
    );
  } else {
    xml = xml.replace(
      '5.6.17 PerceptionEventType（1010001.eventType，String 枚举）',
      '5.6.17 PerceptionEventType（1010001.perceptionInfo.eventType，String 枚举）'
    );
  }

  xml = xml.replace(/INTERNAL_FACE/g, 'INTERNAL_FACE_MATCH');
  xml = xml.replace(
    '5.6.18 PerceptionEventStatus（1010001.eventStatus，String 枚举）',
    '5.6.18 PerceptionEventStatus（1010001.perceptionInfo.eventStatus，String 枚举）'
  );

  // perceptionInfo: eventStatus 必填；补 xlsx 扩展字段
  xml = xml.replace(
    /<w:t>eventStatus<\/w:t>([\s\S]*?)<w:t>false<\/w:t>([\s\S]*?)<w:t>PerceptionEventStatus 枚举，见 §5.6.18<\/w:t>/,
    '<w:t>eventStatus</w:t>$1<w:t>true</w:t>$2<w:t>PerceptionEventStatus 枚举，见 §5.6.18</w:t>'
  );
  xml = xml.replace(
    /<w:t>eventId<\/w:t>([\s\S]*?)<w:t>false<\/w:t>([\s\S]*?)<w:t>事件唯一 id，车端生成<\/w:t>/,
    '<w:t>eventId</w:t>$1<w:t>true</w:t>$2<w:t>事件唯一 id，车端生成，用于去重</w:t>'
  );

  if (!xml.includes('absenceDurationSec')) {
    const insert = extraPerceptionRows.map((r) => tableRow(r)).join('');
    const anchor = getParas(xml).find((p) => p.text.includes('matchedPersonId'));
    if (anchor) xml = xml.replace(anchor.full, anchor.full + insert);
  }

  // 7.2 / 7.6: remove stray @ placeholder paragraphs (keep @hasun)
  xml = removeParasMatching(xml, (t) => {
    if (t.includes('hasun')) return false;
    return /^@\uE022?$/.test(t.trim()) || t.trim() === '@';
  });
  if (xml.includes('含 target/command/params/online') || xml.includes('@')) {
    const p = getParas(xml).find(
      (x) => x.text.includes('含 target/command/params/online') || (x.text.includes('@') && x.text.includes('deviceControl'))
    );
    if (p) {
      xml = xml.replace(
        p.full,
        para(
          'deviceControl 当前状态反馈：target、online（Boolean）、params（GIMBAL 含 pan/tilt/zoom）；2010002 SET 后可通过 2010006 GET 读取'
        )
      );
    }
  }

  // 7.7: document taskActions types explicitly
  if (!xml.includes('taskActions 常见类型')) {
    xml = replacePara(
      xml,
      'taskActions（任务动作）分组',
      para(
        '**回复 data**：Object，按 navPoints（导航点）/ routes（录制与巡航路线）/ taskActions（任务动作）分组（type 回传 2010007）。'
      ) + para('taskActions 常见类型：任务动作、语音播报、取水、开灯、拍照等，车端按产品线维护。')
    );
  }

  // Revision note
  if (!xml.includes('V1.0.2')) {
    const revBlock =
      para('2026-06-29') +
      para('V1.0.2') +
      para('补充口岸感知枚举（xlsx）、设备状态反馈、任务动作类型；保留 7.11 占位') +
      para('—');
    xml = replacePara(xml, 'Joey.Liu', revBlock + para('Joey.Liu'));
  }

  // Clear resolved comments
  zip.file(
    'word/comments.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}"></w:comments>`
  );
  xml = xml.replace(/<w:commentRangeStart[^/]*\/>/g, '');
  xml = xml.replace(/<w:commentRangeEnd[^/]*\/>/g, '');
  xml = xml.replace(/<w:commentReference[^/]*\/>/g, '');

  zip.file('word/document.xml', xml);
  fs.writeFileSync(DOCX, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('OK:', DOCX);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
