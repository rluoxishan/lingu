/**
 * 冒烟：tpapi set_device_task_point（双模式）
 *
 * 站名：npm run test:tpapi-set-task-point -- lingu_test2 中德西北角
 * 坐标：npm run test:tpapi-set-task-point -- lingu_test2 --xyzw 21.64 86.28 0.0 1.0
 */
import { loadEnvFile } from "../config/loadEnv.js";
import { buildTpapiSetTaskPointBody } from "../mapper/taskPointDispatch.js";
import { loginTpapi } from "../clients/tpapiAuth.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFile(root);

const args = process.argv.slice(2);
const deviceId = args[0] ?? "lingu_test2";

let payload: Record<string, unknown>;
if (args[1] === "--xyzw") {
  const [x, y, z, w] = args.slice(2).map(Number);
  if ([x, y, z, w].some((n) => Number.isNaN(n))) {
    console.error("Usage: ... --xyzw <x> <y> <z> <w>");
    process.exit(1);
  }
  payload = buildTpapiSetTaskPointBody(deviceId, {
    taskPointXYZW: { x, y, z, w },
  });
} else {
  const taskPoint = args[1] ?? "中德西北角";
  payload = buildTpapiSetTaskPointBody(deviceId, { taskPoint });
}

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

const response = await fetch(`${tpapiBaseUrl}/tpapi/device/set_device_task_point`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${login.accessToken}`,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10000),
});

const body = (await response.json()) as {
  code: number;
  data?: Array<{ id: string; details?: { taskId?: string; workStatus?: number } }>;
  msg: string;
};

const target = body.data?.find((d) => d.id === deviceId);

console.log(
  JSON.stringify(
    {
      httpStatus: response.status,
      code: body.code,
      msg: body.msg,
      request: payload,
      targetDetails: target?.details,
    },
    null,
    2,
  ),
);

if (body.code !== 0) process.exit(1);
