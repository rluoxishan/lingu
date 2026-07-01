import Fastify from "fastify";
import type { AppConfig } from "../models/types.js";
import { BeidouClient } from "../clients/beidouClient.js";
import { CloudClient } from "../clients/cloudClient.js";
import { CallbackStore } from "../store/callbackStore.js";
import { PushScheduler } from "../scheduler/pushScheduler.js";
import { registerBeidouRoutes } from "./routes/beidou.js";

export interface AppContext {
  config: AppConfig;
  callbackStore: CallbackStore;
  cloudClient: CloudClient;
  beidouClient: BeidouClient;
  pushScheduler: PushScheduler;
}

export function createAppContext(config: AppConfig): AppContext {
  const callbackStore = new CallbackStore(config.dataDir);
  const cloudClient = new CloudClient(config.cloud);
  const beidouClient = new BeidouClient(config.push);
  const pushScheduler = new PushScheduler(
    config,
    callbackStore,
    cloudClient,
    beidouClient,
  );

  return { config, callbackStore, cloudClient, beidouClient, pushScheduler };
}

export async function createServer(ctx: AppContext) {
  const app = Fastify({ logger: true });

  registerBeidouRoutes(app, {
    config: ctx.config,
    callbackStore: ctx.callbackStore,
    cloudClient: ctx.cloudClient,
    pushScheduler: ctx.pushScheduler,
  });

  return app;
}

export async function startServer(ctx: AppContext): Promise<void> {
  const app = await createServer(ctx);
  const { host, port } = ctx.config.server;

  ctx.pushScheduler.restart();

  await app.listen({ host, port });
  console.log(`beidou-bridge listening on http://${host}:${port}`);
}
