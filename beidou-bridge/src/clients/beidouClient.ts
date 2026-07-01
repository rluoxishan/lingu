import type {
  BeidouClientResponse,
  BeidouPushPayload,
  PushConfig,
} from "../models/types.js";

export class BeidouClient {
  constructor(private readonly pushConfig: PushConfig) {}

  async pushStatus(url: string, payload: BeidouPushPayload): Promise<BeidouClientResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.pushConfig.retryTimes; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.pushConfig.requestTimeoutMs),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return (await response.json()) as BeidouClientResponse;
      } catch (error) {
        lastError = error;
        if (attempt < this.pushConfig.retryTimes) {
          await sleep(this.pushConfig.retryIntervalMs);
        }
      }
    }

    throw lastError;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
