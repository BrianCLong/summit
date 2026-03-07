import vault from "node-vault";
import { securityLogger } from "../observability/securityLogger.js";

const vaultAddr = process.env.VAULT_ADDR;
const vaultToken = process.env.VAULT_TOKEN;
const vaultSecretPath = process.env.VAULT_SECRET_PATH || "secret/data/drop-gateway";

const client =
  vaultAddr && vaultToken
    ? vault({ endpoint: vaultAddr, token: vaultToken, requestOptions: { json: true } })
    : undefined;

const cache: Record<string, string> = {};

export const fetchSecret = async (key: string, fallback?: string): Promise<string | undefined> => {
  if (cache[key]) return cache[key];
  if (!client) return fallback;

  try {
    const result = await client.read(vaultSecretPath);
    const secretValue: string | undefined = result?.data?.data?.[key];
    if (secretValue) {
      cache[key] = secretValue;
      return secretValue;
    }
    return fallback;
  } catch (error: any) {
    securityLogger.logEvent("vault_error", {
      level: "warn",
      message: error?.message || "Unknown Vault error",
    });
    return fallback;
  }
};
