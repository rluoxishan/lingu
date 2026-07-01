import fs from 'fs';
import JSZip from 'jszip';

const DOCX = 'C:/Users/Administrator/Desktop/lingu/云平台-机器人通信协议-内部标准版.docx';
const zip = await JSZip.loadAsync(fs.readFileSync(DOCX));
const f = zip.file('word/document.xml') || zip.file('word\\document.xml');
const xml = await f.async('string');

const paras = [...xml.matchAll(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g)].map((m) => {
  const inner = m[1];
  const text = [...inner.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
  const style = (inner.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || 'NONE';
  return { text, style };
});

console.log('XML ok:', xml.includes('<w:body'));
for (const p of paras) {
  if (/^5\.6\.(1[4-9]) /.test(p.text)) console.log(`[${p.style}] ${p.text.slice(0, 85)}`);
}
const bad = paras.filter((p) => p.text.includes('第一篇 MQTT') && p.text.includes('AlarmTaskType'));
console.log('corrupted paras:', bad.length);
const i77 = paras.findIndex((p) => p.text.startsWith('7.7 '));
console.log('\n7.7 section:');
paras.slice(i77, i77 + 20).forEach((p) => console.log(p.text.slice(0, 100)));
