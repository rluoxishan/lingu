import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const docxPath = process.argv[2] ?? "docs/第三方对接接口.docx";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docx-"));
const zipPath = path.join(tmp, "doc.zip");
const unz = path.join(tmp, "unz");

fs.copyFileSync(docxPath, zipPath);
execFileSync(
  "powershell",
  ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${unz}' -Force`],
  { stdio: "inherit" },
);

const xml = fs.readFileSync(path.join(unz, "word", "document.xml"), "utf8");
const texts = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
console.log(texts.join(""));
