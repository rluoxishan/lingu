import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");

const docxName = fs.readdirSync(docsDir).find((f) => f.includes("0630") && f.endsWith(".docx"));
if (!docxName) throw new Error("0630 docx not found");
const docxPath = path.join(docsDir, docxName);

const registerResponse = `响应参数（成功）：
{
  "code": 0,
  "message": "success",
  "data": {
    "registeredAt": 1740469352000,
    "frequency": 4000,
    "vehicleCount": 2,
    "vehicleIds": [
      "hasun-test",
      "LU2606000100"
    ],
    "vehicles": [
      {
        "vehicleId": "hasun-test",
        "online": true,
        "workStatus": 1,
        "battery": 90,
        "position": {
          "x": 114.396,
          "y": 22.704
        },
        "taskId": "dd641d2b",
        "updatedAt": 1740469352000
      },
      {
        "vehicleId": "LU2606000100",
        "online": true,
        "workStatus": 0,
        "battery": 100,
        "position": {
          "x": 114.398,
          "y": 22.702
        },
        "updatedAt": 1740469352000
      }
    ],
    "configChanges": [
      "initial registration"
    ]
  },
  "timestamp": 1740469352000
}

说明：vehicleIds 在响应中返回，为本项目/本局域网启用的全部巡检车 ID（北斗 register 请求只需 url + frequency，无需传 vehicleIds）。

响应参数（失败）：
{
  "code": 400,
  "message": "frequency must be between 3000 and 5000 ms",
  "timestamp": 1740469352000
}`;

const navigationResponse = `响应参数（成功）：
{
  "code": 0,
  "message": "success",
  "data": {
    "vehicleId": "hasun-test",
    "cloudTaskId": "BD-NAV-1740469352001",
    "acceptedAt": 1740469352000
  },
  "timestamp": 1740469352000
}

说明：同步受理，已提交云平台即返回，不等待车到达目标点。

响应参数（失败）：
{
  "code": 400,
  "message": "invalid or unknown vehicleId",
  "timestamp": 1740469352000
}`;

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 将多行文本转为 Word 单元格内多段落（每行一段，保留缩进） */
function textToWordParagraphs(text, paraIdPrefix) {
  const lines = text.split("\n");
  return lines
    .map((line, i) => {
      const paraId = `${paraIdPrefix}${i.toString(16).padStart(8, "0")}`;
      const content = escapeXml(line);
      return `<w:p w14:paraId="${paraId}"><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:hint="eastAsia"/></w:rPr><w:t xml:space="preserve">${content}</w:t></w:r></w:p>`;
    })
    .join("");
}

function replaceResponseCell(xml, markerBefore, oldStartPattern, newText, paraIdPrefix) {
  const markerIdx = xml.indexOf(markerBefore);
  if (markerIdx < 0) throw new Error(`Marker not found: ${markerBefore.slice(0, 40)}`);

  const respIdx = xml.indexOf("响应参数", markerIdx);
  if (respIdx < 0) throw new Error(`响应参数 not found after marker`);

  // 找到包含「响应参数」的单元格：向前找 <w:tc>，向后找匹配的 </w:tc>
  const tcStart = xml.lastIndexOf("<w:tc>", respIdx);
  const tcEnd = xml.indexOf("</w:tc>", respIdx);
  if (tcStart < 0 || tcEnd < 0) throw new Error("Table cell bounds not found");

  const cellInner = xml.slice(tcStart, tcEnd + "</w:tc>".length);
  const respInCell = cellInner.indexOf("响应参数");
  const tcPrEnd = cellInner.indexOf("</w:tcPr>") + "</w:tcPr>".length;
  const before = cellInner.slice(0, tcPrEnd);
  const after = "</w:tc>";

  const newCell = before + textToWordParagraphs(newText, paraIdPrefix) + after;
  return xml.slice(0, tcStart) + newCell + xml.slice(tcEnd + "</w:tc>".length);
}

const tmp = path.join(docsDir, "_0630_patch");
const zip = path.join(docsDir, "_0630_patch.zip");
if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
fs.copyFileSync(docxPath, zip);
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Path '${zip.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
);

const xmlPath = path.join(tmp, "word", "document.xml");
let xml = fs.readFileSync(xmlPath, "utf8");

// 接口1：register 响应单元格
xml = replaceResponseCell(
  xml,
  "接口1北斗系统发送回调地址",
  "register",
  registerResponse,
  "A1REG000",
);

// 接口2：navigation 响应单元格
xml = replaceResponseCell(
  xml,
  "接口2 北斗系统反控巡检车辆",
  "navigation",
  navigationResponse,
  "A2NAV000",
);

fs.writeFileSync(xmlPath, xml, "utf8");

const bakPath = docxPath + ".bak";
if (!fs.existsSync(bakPath)) fs.copyFileSync(docxPath, bakPath);

execSync(
  `powershell -NoProfile -Command "Remove-Item '${docxPath.replace(/'/g, "''")}' -Force; Compress-Archive -Path '${tmp.replace(/'/g, "''")}\\*' -DestinationPath '${docxPath.replace(/'/g, "''")}.zip' -Force; Move-Item '${docxPath.replace(/'/g, "''")}.zip' '${docxPath.replace(/'/g, "''")}' -Force"`,
);

fs.rmSync(tmp, { recursive: true });
if (fs.existsSync(zip)) fs.unlinkSync(zip);

console.log("Patched:", docxPath);
