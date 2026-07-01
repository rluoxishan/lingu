import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");

const docxName = fs.readdirSync(docsDir).find((f) => f.includes("0629") && f.endsWith(".docx"));
if (!docxName) throw new Error("0629 docx not found");
const docxPath = path.join(docsDir, docxName);

const registerResponse = `响应参数：
{
  "code": 0,                          // 0=成功；非0失败，与HTTP状态码一致
  "message": "success",
  "data": {
    "registeredAt": 1740469352000,    // 注册生效时间(ms)
    "frequency": 4000,                // 确认的推送周期(ms)，范围3000~5000
    "vehicleCount": 2,
    "vehicleIds": ["hasun-test"],     // 持久化，重启后仍按此列表推送
    "vehicles": [                       // register时从云平台查询的设备快照
      {
        "vehicleId": "hasun-test",
        "online": true,
        "workStatus": 1,
        "battery": 90,
        "position": { "x": 114.396, "y": 22.704 },
        "taskId": "dd641d2b",
        "updatedAt": 1740469352000
      }
    ],
    "configChanges": ["initial registration"]  // 相对上次register的变更项
  },
  "timestamp": 1740469352000
}
失败示例：{ "code": 400, "message": "frequency must be between 3000 and 5000 ms", "timestamp": xxx }`;

const navigationResponse = `响应参数：
{
  "code": 0,                          // 0=成功；非0失败，与HTTP状态码一致
  "message": "success",
  "data": {
    "vehicleId": "hasun-test",        // 请求中的目标车
    "cloudTaskId": "BD-NAV-1740469352001",  // 中转下发云平台的任务ID
    "acceptedAt": 1740469352000       // 受理时间(ms)；同步返回，不等待车到达
  },
  "timestamp": 1740469352000
}
失败示例：{ "code": 400, "message": "invalid or unknown vehicleId", "timestamp": xxx }`;

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const tmp = path.join(docsDir, "_0629_patch");
const zip = path.join(docsDir, "_0629_patch.zip");
if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
fs.copyFileSync(docxPath, zip);
execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zip.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`);

const xmlPath = path.join(tmp, "word", "document.xml");
let xml = fs.readFileSync(xmlPath, "utf8");

const placeholder = "响应参数：中转平台定义";
let count = 0;
xml = xml.replace(
  new RegExp(`(<w:t[^>]*>)${placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(</w:t>)`, "g"),
  (_match, open, close) => {
    count++;
    const text = count === 1 ? registerResponse : navigationResponse;
    return `${open}${escapeXml(text)}${close}`;
  },
);

if (count !== 2) throw new Error(`Expected 2 replacements, got ${count}`);

fs.writeFileSync(xmlPath, xml, "utf8");

const outZip = path.join(docsDir, "_0629_out.zip");
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(tmp, "*").replace(/'/g, "''")}' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force"`,
);

// Compress-Archive puts files in a subfolder; repack properly via tar or manual zip
// Use PowerShell Compress-Archive on folder contents
fs.copyFileSync(docxPath, docxPath + ".bak");
execSync(
  `powershell -NoProfile -Command "Remove-Item '${docxPath.replace(/'/g, "''")}' -Force; Compress-Archive -Path '${tmp.replace(/'/g, "''")}\\*' -DestinationPath '${docxPath.replace(/'/g, "''")}.zip' -Force; Move-Item '${docxPath.replace(/'/g, "''")}.zip' '${docxPath.replace(/'/g, "''")}' -Force"`,
);

fs.rmSync(tmp, { recursive: true });
if (fs.existsSync(zip)) fs.unlinkSync(zip);
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

console.log("Patched:", docxPath);
console.log("Backup:", docxPath + ".bak");
