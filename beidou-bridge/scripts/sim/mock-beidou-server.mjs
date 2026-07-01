/**
 * Mock Beidou callback server (default port 19090). Avoids Windows HttpListener URL ACL issues.
 * Usage: node scripts/sim/mock-beidou-server.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.MOCK_BEIDOU_PORT ?? 19090);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const simDir = path.join(root, "data-sim");
fs.mkdirSync(simDir, { recursive: true });

const pushLog = path.join(simDir, "push-log.jsonl");
const statsFile = path.join(simDir, "mock-beidou-stats.json");

let pushCount = 0;

function writeStats() {
  fs.writeFileSync(
    statsFile,
    JSON.stringify({ pushCount, lastPushAt: Date.now() }, null, 2),
    "utf8",
  );
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    pushCount++;
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    console.log(`\n[${ts}] PUSH #${pushCount} ${req.method} ${req.url}`);
    if (body) {
      try {
        const parsed = JSON.parse(body);
        const d = parsed.data ?? {};
        console.log(
          `  vehicleId=${d.vehicleId} state=${d.state} powerLevel=${d.powerLevel} x=${d.x} y=${d.y}`,
        );
      } catch {
        console.log(body.slice(0, 500));
      }
    }
    fs.appendFileSync(
      pushLog,
      JSON.stringify({ at: ts, atMs: Date.now(), body }) + "\n",
      "utf8",
    );
    writeStats();

    const tsMs = Date.now();
    const resp = JSON.stringify({ code: 1000, msg: "成功", timestamp: tsMs });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(resp);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log("Mock Beidou (Node) http://127.0.0.1:" + port + "/callback");
  console.log("Stats: " + statsFile);
  console.log("Push log: " + pushLog);
});
