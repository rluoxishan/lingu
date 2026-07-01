import fs from 'fs';
import JSZip from 'jszip';
const p = 'C:/Users/Administrator/Desktop/lingu/云平台-机器人通信协议-内部标准版.docx';
const z = await JSZip.loadAsync(fs.readFileSync(p));
console.log('keys', Object.keys(z.files).filter((k) => k.includes('word')));
console.log('doc', z.file('word/document.xml') ? 'ok' : 'missing');
