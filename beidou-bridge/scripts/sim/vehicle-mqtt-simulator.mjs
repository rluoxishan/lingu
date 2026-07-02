/**
 * 模拟车端：向中转机 EMQX 周期性发布 1010001（dev/pub/{clientId}）
 *
 * 用法（5G 模拟电脑）：
 *   node scripts/sim/vehicle-mqtt-simulator.mjs --broker mqtt://192.168.x.x:1883
 *   node scripts/sim/vehicle-mqtt-simulator.mjs --broker mqtt://10.0.0.5:1883 --clientId LU2606000100
 *
 * 环境变量（可选）：
 *   VEHICLE_MQTT_BROKER=mqtt://192.168.1.10:1883
 */
import mqtt from "mqtt";

function parseArgs(argv) {
  const opts = {
    broker: process.env.VEHICLE_MQTT_BROKER ?? "",
    clientId: process.env.VEHICLE_CLIENT_ID ?? "LU2606000100",
    intervalMs: 1000,
    positionMode: process.env.VEHICLE_POSITION_MODE ?? "map_xy",
    username: process.env.VEHICLE_MQTT_USER ?? "",
    password: process.env.VEHICLE_MQTT_PASS ?? "",
    listenSub: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--broker" && argv[i + 1]) opts.broker = argv[++i];
    else if (arg === "--clientId" && argv[i + 1]) opts.clientId = argv[++i];
    else if (arg === "--interval" && argv[i + 1]) opts.intervalMs = Number(argv[++i]);
    else if (arg === "--positionMode" && argv[i + 1]) opts.positionMode = argv[++i];
    else if (arg === "--username" && argv[i + 1]) opts.username = argv[++i];
    else if (arg === "--password" && argv[i + 1]) opts.password = argv[++i];
    else if (arg === "--no-sub") opts.listenSub = false;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node vehicle-mqtt-simulator.mjs --broker mqtt://RELAY_IP:1883 [options]

Options:
  --broker        中转机 MQTT 地址（必填）
  --clientId      默认 LU2606000100
  --interval      发布间隔 ms，默认 1000
  --positionMode  map_xy | lonlat，默认 map_xy
  --username      MQTT 用户名（可选）
  --password      MQTT 密码（可选）
  --no-sub        不订阅 dev/sub（不打印下行指令）
`);
      process.exit(0);
    }
  }

  if (!opts.broker) {
    console.error("ERROR: --broker 必填，例如 --broker mqtt://192.168.1.10:1883");
    process.exit(1);
  }
  if (!Number.isFinite(opts.intervalMs) || opts.intervalMs < 200) {
    console.error("ERROR: --interval 至少 200 ms");
    process.exit(1);
  }
  return opts;
}

function build1010001(clientId, seq, positionMode) {
  const now = Date.now();
  const battery = 30 + (seq % 70);
  const workStatus = seq % 20 === 0 ? 0 : 1;
  const heading = (seq * 3) % 360;
  const baseX = 21.64 + (seq % 100) * 0.01;
  const baseY = 86.28 + (seq % 50) * 0.01;

  const data = {
    workStatus,
    taskId: workStatus === 1 ? `SIM-${seq}` : "",
    taskName: workStatus === 1 ? "模拟巡检" : "",
    battery,
    brakeStatus: 0,
    heading,
  };

  if (positionMode === "lonlat") {
    data.position = `${114.05129 + seq * 0.00001},${22.508236 + seq * 0.00001}`;
  } else {
    data.position_xyz = `${baseX.toFixed(2)},${baseY.toFixed(2)},${(heading * Math.PI / 180).toFixed(3)}`;
  }

  return {
    id: now,
    time: now,
    type: "1010001",
    data,
  };
}

const opts = parseArgs(process.argv);
const pubTopic = `dev/pub/${opts.clientId}`;
const subTopic = `dev/sub/${opts.clientId}`;

console.log("=== 车端 MQTT 模拟器 ===");
console.log(`broker   : ${opts.broker}`);
console.log(`clientId : ${opts.clientId}`);
console.log(`publish  : ${pubTopic} (1010001, QoS 0, ~${opts.intervalMs}ms)`);
if (opts.listenSub) console.log(`subscribe: ${subTopic} (2010001 等下行)`);
console.log("Ctrl+C 停止\n");

const client = mqtt.connect(opts.broker, {
  clientId: `sim-vehicle-${opts.clientId}-${process.pid}`,
  username: opts.username || undefined,
  password: opts.password || undefined,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

let seq = 0;
let timer = null;

client.on("connect", () => {
  console.log("[sim] MQTT 已连接");

  if (opts.listenSub) {
    client.subscribe(subTopic, { qos: 2 }, (err) => {
      if (err) console.error("[sim] subscribe failed", err.message);
      else console.log(`[sim] subscribed ${subTopic}`);
    });
  }

  const publishOnce = () => {
    seq++;
    const payload = build1010001(opts.clientId, seq, opts.positionMode);
    const raw = JSON.stringify(payload);
    client.publish(pubTopic, raw, { qos: 0 }, (err) => {
      if (err) {
        console.error("[sim] publish failed", err.message);
        return;
      }
      const d = payload.data;
      const pos =
        d.position_xyz ?? d.position ?? "-";
      console.log(
        `[sim] #${seq} pub workStatus=${d.workStatus} battery=${d.battery} pos=${pos}`,
      );
    });
  };

  publishOnce();
  timer = setInterval(publishOnce, opts.intervalMs);
});

client.on("message", (topic, buf) => {
  console.log(`\n[sim] << ${topic}`);
  try {
    console.log(JSON.stringify(JSON.parse(buf.toString("utf8")), null, 2));
  } catch {
    console.log(buf.toString("utf8").slice(0, 500));
  }
  console.log("");
});

client.on("error", (err) => console.error("[sim] error", err.message));
client.on("reconnect", () => console.log("[sim] reconnecting..."));
client.on("close", () => console.log("[sim] connection closed"));

function shutdown() {
  if (timer) clearInterval(timer);
  client.end(true, () => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
