import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { AppConfig, CloudAuthConfig, CloudConfig, VehiclesConfig } from "../models/types.js";

function readYaml<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return yaml.load(raw) as T;
}

function resolveEnv(value: string): string {
  const match = value.match(/^\$\{(.+)\}$/);
  if (!match) return value;
  return process.env[match[1]] ?? value;
}

function hydrateAuth(auth: CloudAuthConfig): CloudAuthConfig {
  return {
    ...auth,
    tenantName: auth.tenantName ? resolveEnv(auth.tenantName) : undefined,
    username: resolveEnv(auth.username),
    password: resolveEnv(auth.password),
    publicKeyId: auth.publicKeyId ? resolveEnv(auth.publicKeyId) : undefined,
    tpapiBaseUrl: auth.tpapiBaseUrl ? resolveEnv(auth.tpapiBaseUrl) : undefined,
  };
}

function hydrateCloud(cloud: CloudConfig | undefined): CloudConfig {
  if (!cloud?.auth) {
    throw new Error("config/cloud.yaml: missing cloud auth section");
  }
  return {
    ...cloud,
    tenantId: resolveEnv(cloud.tenantId ?? "1"),
    enrichTaskFromList: cloud.enrichTaskFromList ?? true,
    positionMode: cloud.positionMode ?? "lonlat",
    statusQueryMode: cloud.statusQueryMode ?? "batch",
    statusBatchPath: cloud.statusBatchPath ?? "/device/select_all_device",
    tpapiDeviceDetailListPath:
      cloud.tpapiDeviceDetailListPath ?? "/tpapi/device/get_device_detail_list",
    tpapiSetTaskPointPath:
      cloud.tpapiSetTaskPointPath ?? "/tpapi/device/set_device_task_point",
    tpapiGetTaskPointPath:
      cloud.tpapiGetTaskPointPath ?? "/tpapi/device/get_device_task_point",
    adminApiBaseUrl: cloud.adminApiBaseUrl,
    apiMode:
      cloud.apiMode ??
      (cloud.auth?.type === "tpapi_login" ? "tpapi" : "admin"),
    auth: hydrateAuth(cloud.auth),
  };
}

export function loadConfig(configDir: string): AppConfig {
  const serverRaw = readYaml<Omit<AppConfig, "cloud" | "vehicles">>(
    path.join(configDir, "server.yaml"),
  );
  const cloud = hydrateCloud(readYaml<CloudConfig>(path.join(configDir, "cloud.yaml")));
  const vehiclesFile = readYaml<VehiclesConfig>(path.join(configDir, "vehicles.yaml"));

  const push = {
    retryTimes: serverRaw.push?.retryTimes ?? 2,
    retryIntervalMs: serverRaw.push?.retryIntervalMs ?? 500,
    requestTimeoutMs: serverRaw.push?.requestTimeoutMs ?? 5000,
    frequencyMinMs: serverRaw.push?.frequencyMinMs ?? 3000,
    frequencyMaxMs: serverRaw.push?.frequencyMaxMs ?? 5000,
  };

  return {
    ...serverRaw,
    push,
    cloud,
    vehicles: vehiclesFile.vehicles,
  };
}

export function getEnabledVehicles(config: AppConfig) {
  return config.vehicles.filter((v) => v.enabled);
}
