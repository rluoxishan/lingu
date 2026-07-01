import fs from "node:fs";
import path from "node:path";
import type { BeidouCallbackRegistration } from "../models/types.js";

const FILE_NAME = "beidou-callback.json";

export class CallbackStore {
  private readonly filePath: string;
  private registration: BeidouCallbackRegistration | null = null;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, FILE_NAME);
    this.load();
  }

  get(): BeidouCallbackRegistration | null {
    return this.registration;
  }

  save(registration: BeidouCallbackRegistration): void {
    this.registration = registration;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(registration, null, 2), "utf8");
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as BeidouCallbackRegistration;
      this.registration = {
        ...parsed,
        vehicleIds: Array.isArray(parsed.vehicleIds) ? parsed.vehicleIds : [],
      };
    } catch {
      this.registration = null;
    }
  }
}
