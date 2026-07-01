/**
 * 冒烟：tpapi 公钥 + RSA 登录（需 .env 中 CLOUD_USERNAME / CLOUD_PASSWORD / CLOUD_TPAPI_ID）
 * 用法：npm run build && node dist/scripts/test-tpapi-login.js
 */
import { loadEnvFile } from "../config/loadEnv.js";
import { loginTpapi } from "../clients/tpapiAuth.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFile(root);

const username = process.env.CLOUD_USERNAME;
const password = process.env.CLOUD_PASSWORD;
const publicKeyId = process.env.CLOUD_TPAPI_ID ?? username;

if (!username || !password || password === "your-password") {
  console.error("请配置 .env：CLOUD_USERNAME、CLOUD_PASSWORD（tpapi 明文密码）");
  process.exit(1);
}

const result = await loginTpapi({
  tpapiBaseUrl: "https://sztu.lingubot.cn/third-party-api",
  publicKeyPath: "/tpapi/auth/public_key",
  publicKeyId: publicKeyId!,
  loginPath: "/tpapi/auth/login",
  username,
  password,
  timeoutMs: 10000,
});

console.log(
  JSON.stringify(
    {
      ok: true,
      accessTokenPrefix: result.accessToken.slice(0, 8) + "...",
      expiresTime: result.expiresTime,
      expiresAt: new Date(result.expiresTime).toISOString(),
    },
    null,
    2,
  ),
);
