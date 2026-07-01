import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./config/loadEnv.js";
import { loadConfig } from "./config/loadConfig.js";
import { createAppContext, startServer } from "./api/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
loadEnvFile(projectRoot);

const configDir = process.env.CONFIG_DIR ?? path.join(projectRoot, "config");

async function main(): Promise<void> {
  const config = loadConfig(configDir);
  const ctx = createAppContext(config);

  const shutdown = () => {
    ctx.pushScheduler.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await startServer(ctx);
}

main().catch((error) => {
  console.error("fatal:", error);
  process.exit(1);
});
