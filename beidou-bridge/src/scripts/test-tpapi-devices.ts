/**
 * 冒烟：tpapi 登录 + 批量查设备
 * 用法：npm run build && node dist/scripts/test-tpapi-devices.js hasun-test
 */
import { loadEnvFile } from "../config/loadEnv.js";
import { loginTpapi } from "../clients/tpapiAuth.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFile(root);

const deviceIds = process.argv.slice(2);
if (deviceIds.length === 0) {
  deviceIds.push("hasun-test");
}

const username = process.env.CLOUD_USERNAME;
const password = process.env.CLOUD_PASSWORD;
const publicKeyId = process.env.CLOUD_TPAPI_ID ?? username;
const tpapiBaseUrl = "https://sztu.lingubot.cn/third-party-api";

if (!username || !password || password === "your-password") {
  console.error("请配置 .env：CLOUD_USERNAME、CLOUD_PASSWORD、CLOUD_TPAPI_ID");
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

const response = await fetch(`${tpapiBaseUrl}/tpapi/device/get_device_detail_list`, {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${login.accessToken}`,
  },
  body: JSON.stringify({ deviceIdList: deviceIds }),
  signal: AbortSignal.timeout(10000),
});

const body = (await response.json()) as {
  code: number;
  data?: Array<{ id: string; online?: boolean; details?: Record<string, unknown> }>;
  msg: string;
};

console.log(
  JSON.stringify(
    {
      httpStatus: response.status,
      code: body.code,
      msg: body.msg,
      devices: body.data?.map((d) => ({
        id: d.id,
        online: d.online,
        details: d.details,
      })),
    },
    null,
    2,
  ),
);
