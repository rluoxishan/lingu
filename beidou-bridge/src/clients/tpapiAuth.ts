import crypto from "node:crypto";

interface TpapiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

export interface TpapiLoginResult {
  accessToken: string;
  expiresTime: number;
}

export interface TpapiAuthConfig {
  tpapiBaseUrl: string;
  publicKeyPath: string;
  publicKeyId: string;
  loginPath: string;
  username: string;
  password: string;
  timeoutMs: number;
}

/** 云平台 tpapi 公钥 Base64 → PEM */
export function publicKeyBase64ToPem(base64: string): string {
  const body = base64.replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

/** RSA PKCS#1 v1.5 加密密码（与 Apifox 示例一致） */
export function encryptPasswordRsaPkcs1(password: string, publicKeyBase64: string): string {
  const pem = publicKeyBase64ToPem(publicKeyBase64);
  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(password, "utf8"),
  );
  return encrypted.toString("base64");
}

export async function fetchTpapiPublicKey(config: TpapiAuthConfig): Promise<string> {
  const url = `${config.tpapiBaseUrl}${config.publicKeyPath}?id=${encodeURIComponent(config.publicKeyId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`tpapi public_key HTTP ${response.status}`);
  }

  const body = (await response.json()) as TpapiResponse<string>;
  if (body.code !== 0 || !body.data) {
    throw new Error(body.msg || "tpapi public_key rejected");
  }

  return body.data;
}

export async function loginTpapi(config: TpapiAuthConfig): Promise<TpapiLoginResult> {
  const publicKey = await fetchTpapiPublicKey(config);
  const encryptedPassword = encryptPasswordRsaPkcs1(config.password, publicKey);

  const url = `${config.tpapiBaseUrl}${config.loginPath}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: config.username,
      password: encryptedPassword,
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`tpapi login HTTP ${response.status}`);
  }

  const body = (await response.json()) as TpapiResponse<TpapiLoginResult>;
  if (body.code !== 0 || !body.data?.accessToken) {
    throw new Error(body.msg || "tpapi login rejected");
  }

  return {
    accessToken: body.data.accessToken,
    expiresTime: body.data.expiresTime ?? Date.now() + 24 * 3600 * 1000,
  };
}
