/**
 * 本地联调用 MQTT Broker（替代 Mosquitto，仅开发机自动化测试）
 * Usage: node scripts/sim/local-mqtt-broker.mjs
 */
import { createServer as createNetServer } from "node:net";
import { Aedes } from "aedes";

const port = Number(process.env.LOCAL_MQTT_PORT ?? 1883);
const host = process.env.LOCAL_MQTT_HOST ?? "0.0.0.0";

const broker = await Aedes.createBroker();
const server = createNetServer(broker.handle);

server.listen(port, host, () => {
  console.log(`[local-mqtt-broker] listening mqtt://${host}:${port}`);
});

broker.on("client", (client) => {
  console.log(`[local-mqtt-broker] client connect id=${client?.id ?? "?"}`);
});

broker.on("publish", (packet, client) => {
  if (!client) return;
  const topic = packet.topic ?? "";
  if (topic.startsWith("dev/pub/")) {
    console.log(`[local-mqtt-broker] relay ${topic} (${packet.payload?.length ?? 0} bytes)`);
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
