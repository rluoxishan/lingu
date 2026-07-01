import fs from 'fs';
import JSZip from 'jszip';

const DOCX = 'C:/Users/Administrator/Desktop/lingu/云平台-机器人通信协议-内部标准版.docx';
const buf = fs.readFileSync(DOCX);
const zip = await JSZip.loadAsync(buf);
const xml = await zip.file('word/document.xml').async('string');
const styles = await zip.file('word/styles.xml').async('string');

const paras = [...xml.matchAll(/<w:p[^>]*>([\s\S]*?)<\/w:p>/g)].map((m) => {
  const style = (m[1].match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
  const text = [...m[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
  return { style, text, full: m[0] };
}).filter((p) => p.text);

console.log('=== enum heading styles ===');
for (const p of paras) {
  if (/^5\.6\.\d+/.test(p.text) || /^7\.7 /.test(p.text)) {
    console.log(`[${p.style || 'NONE'}] ${p.text.slice(0, 100)}`);
  }
}

console.log('\n=== 7.7 section ===');
const i = paras.findIndex((p) => p.text.startsWith('7.7 '));
paras.slice(i, i + 35).forEach((p) => console.log(p.text));

// xlsx strings
const xlsxPath = 'C:/Users/Administrator/Desktop/lingu/口岸平台后台报警的机器人相关功能描述.xlsx';
const xbuf = fs.readFileSync(xlsxPath);
const xzip = await JSZip.loadAsync(xbuf);
const ss = await xzip.file('xl/sharedStrings.xml').async('string');
const strings = [...ss.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
console.log('\n=== xlsx strings ===');
strings.forEach((s) => console.log(s));
