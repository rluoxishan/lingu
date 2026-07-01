/**
 * 冒烟：tpapi 获取设备任务点位 get_device_task_point
 * 用法：npm run test:tpapi-get-task-point -- LU2606000100
 */
import { loadEnvFile } from "../config/loadEnv.js";
import { loginTpapi } from "../clients/tpapiAuth.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFile(root);

const deviceId = process.argv[2] ?? "LU2606000100";

const username = process.env.CLOUD_USERNAME;
const password = process.env.CLOUD_PASSWORD;
const publicKeyId = process.env.CLOUD_TPAPI_ID ?? username;
const tpapiBaseUrl = "https://sztu.lingubot.cn/third-party-api";

if (!username || !password || password === "your-password") {
  console.error("Configure .env: CLOUD_USERNAME, CLOUD_PASSWORD, CLOUD_TPAPI_ID");
  process.exit(1);
}

const login = await loginTpapi({
  tpapiBaseUrl,
  publicKeyPath: "/tpapi/auth/public_key",
  publicKeyId: publicKeyId!,
  loginPath: "/tpapi/auth/login",
  username,
  password,
  timeoutMs: 10000,
});

const url = `${tpapiBaseUrl}/tpapi/device/get_device_task_point?deviceId=${encodeURIComponent(deviceId)}`;

const response = await fetch(url, {
  method: "GET",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${login.accessToken}`,
  },
  signal: AbortSignal.timeout(10000),
});

const body = (await response.json()) as { code: number; data?: unknown; msg: string };

console.log(
  JSON.stringify(
    {
      httpStatus: response.status,
      url,
      code: body.code,
      msg: body.msg,
      deviceId,
      data: body.data,
    },
    null,
    2,
  ),
);

if (body.code !== 0) process.exit(1);
