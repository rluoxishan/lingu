/**
 * Safe fix for 内部标准版.docx — preserves document.xml wrapper.
 */
import fs from 'fs';
import JSZip from 'jszip';

const DOCX = 'C:/Users/Administrator/Desktop/lingu/云平台-机器人通信协议-内部标准版.docx';
const FONT = '微软雅黑';
const H4 = '00000e';
const H2 = '00000a';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getDocFile(zip) {
  return zip.file('word/document.xml') || zip.file('word\\document.xml');
}

function paraText(full) {
  return [...full.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
}

function getParagraphs(xml) {
  const paras = [];
  const re = /<w:p[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    paras.push({ full: m[0], text: paraText(m[0]), start: m.index, end: m.index + m[0].length });
  }
  return paras;
}

function headingPara(text, level = 4) {
  const style = level === 2 ? H2 : H4;
  const sz = level === 2 ? '24' : '22';
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/><w:spacing w:before="80" w:after="40"/><w:rPr/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/><w:b w:val="1"/><w:sz w:val="${sz}"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function normalPara(text) {
  return `<w:p><w:pPr><w:rPr/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}"/><w:sz w:val="21"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
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
  const grid = `<w:tblGrid>${rows[0].map(() => '<w:gridCol w:w="2800"/>').join('')}</w:tblGrid>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>${grid}${rows.map((r, i) => tableRow(r, i === 0)).join('')}</w:tbl>`;
}

function applyHeading(full, level = 4) {
  const style = level === 2 ? H2 : H4;
  const inner = full.replace(/^<w:p>/, '').replace(/<\/w:p>$/, '');
  let updated = inner;
  if (updated.includes('<w:pStyle')) {
    updated = updated.replace(/<w:pStyle w:val="[^"]*"/, `<w:pStyle w:val="${style}"`);
  } else {
    updated = updated.replace('<w:pPr>', `<w:pPr><w:pStyle w:val="${style}"/><w:spacing w:before="80" w:after="40"/>`);
  }
  if (!updated.includes('<w:b w:val="1"/>')) {
    updated = updated.replace(/<w:rPr>/, '<w:rPr><w:b w:val="1"/>');
  }
  return `<w:p>${updated}</w:p>`;
}

function build518519() {
  return (
    headingPara('5.6.18 PerceptionEventStatus（1010001.perceptionInfo.eventStatus，String 枚举）') +
    table([
      ['枚举名', '说明'],
      ['DETECTED', '检测到异常/触发告警'],
      ['ALERTING', '告警持续中'],
      ['UPDATING', '事件状态更新'],
      ['RESOLVED', '已解除/恢复正常'],
    ]) +
    headingPara('5.6.19 AlarmTaskType（2010007.alarmTasks[].type，String 枚举）') +
    normalPara(
      '2010007 回复中 alarmTasks 的 type 取《口岸平台后台报警的机器人相关功能描述.xlsx》七项检测能力，与 §5.6.17 口岸子集枚举名一致。'
    ) +
    table([
      ['type（枚举名）', 'name（中文）', '说明'],
      ['FIRE_DETECTION', '火灾检测', '火焰/明火/异常高亮燃烧区域检测'],
      ['SMOKE_DETECTION', '烟雾检测', '烟雾/烟气扩散，辅助火情判断'],
      ['CROWD_DENSITY', '区域人员密度检测', '人数/密度超阈值聚集告警'],
      ['ABSENCE_FROM_POST', '离岗检测', '岗位无人值守/异常离岗'],
      ['ABNORMAL_OBJECT', '异常物检测', '遗留物/堆放物/可疑包裹'],
      ['INTERNAL_FACE_MATCH', '内部人脸库检测', '边检内部人员名单比对'],
      ['SENSITIVE_WORD', '敏感词检测', '语音关键词/风险语义命中告警'],
    ])
  );
}

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(DOCX));
  const docFile = getDocFile(zip);
  let xml = await docFile.async('string');
  if (!xml.includes('<w:body')) throw new Error('Invalid document.xml — aborting');

  // Remove corrupted mega-paragraph
  let paras = getParagraphs(xml);
  for (const p of paras) {
    if (p.text.includes('5.6.19 AlarmTaskType') && p.text.includes('第一篇 MQTT') && p.text.length > 200) {
      xml = xml.slice(0, p.start) + xml.slice(p.end);
    }
  }

  // Replace §5.6.18 ~ before 本篇约定 (includes tables between)
  paras = getParagraphs(xml);
  const startP = paras.find((p) => p.text.startsWith('5.6.18 '));
  const endP = paras.find((p) => p.text.includes('本篇约定 dev/pub'));
  if (!startP || !endP) throw new Error('Section range not found');
  xml = xml.slice(0, startP.start) + build518519() + xml.slice(endP.start);

  // Heading 4 for §5.6.14–5.6.17; Heading 2 for §7.7 (reverse order keeps indices valid)
  paras = getParagraphs(xml);
  const headingTargets = paras
    .filter(
      (p) =>
        (/^5\.6\.(1[4-7]) /.test(p.text) && !p.text.includes('枚举名')) || p.text.startsWith('7.7 2010007')
    )
    .sort((a, b) => b.start - a.start);
  for (const p of headingTargets) {
    const level = p.text.startsWith('7.7 ') ? 2 : 4;
    const next = applyHeading(p.full, level);
    xml = xml.slice(0, p.start) + next + xml.slice(p.end);
  }

  if (!xml.includes('V1.0.3')) xml = xml.replace(/V1\.0\.2/g, 'V1.0.3');

  zip.file(docFile.name, xml);
  fs.writeFileSync(DOCX, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('Patched safely:', DOCX);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
