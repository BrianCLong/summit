import type { SecretRef, VaultSecretRef } from "common-types";
import { rotationStatusForRef } from "../rotation.js";
import type {
  HttpClient,
  SecretResolution,
  SecretRotationResult,
  SecretsProvider,
} from "../types.js";

interface VaultJwtOptions {
  baseUrl: string;
  role: string;
  mount?: string;
  jwt: string | (() => Promise<string> | string);
  httpClient?: HttpClient;
}

interface VaultLoginResponse {
  auth?: {
    client_token?: string;
    lease_duration?: number;
  };
}

interface VaultSecretPayload {
  data?: {
    data?: Record<string, unknown>;
    metadata?: { version?: number };
  };
}

export class VaultJwtSecretsProvider implements SecretsProvider {
  readonly name = "vault-jwt";
  private readonly options: VaultJwtOptions;
  private readonly httpClient: HttpClient;
  private tokenCache?: { token: string; expiresAt: number };

  constructor(options: VaultJwtOptions) {
    this.options = options;
    this.httpClient =
      options.httpClient ??
      (async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
        const response = await fetch(url, {
          method: init?.body ? "POST" : "GET",
          headers: init?.headers,
          body: init?.body,
        });
        return {
          status: response.status,
          json: () => response.json(),
        };
      });
  }

  supports(ref: SecretRef): boolean {
    return (ref as VaultSecretRef).vault !== undefined;
  }

  private async getJwt(): Promise<string> {
    if (typeof this.options.jwt === "function") {
      const token = await this.options.jwt();
      if (!token) {
        throw new Error("JWT provider returned an empty token");
      }
      return token;
    }
    return this.options.jwt;
  }

  private async fetchToken(): Promise<string> {
    const jwt = await this.getJwt();
    const response = await this.httpClient(`${this.options.baseUrl}/v1/auth/jwt/login`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: this.options.role,
        jwt,
      }),
    });

    const payload = (await response.json()) as VaultLoginResponse;
    const token = payload.auth?.client_token;
    const leaseDuration = payload.auth?.lease_duration ?? 0;

    if (!token) {
      throw new Error("Vault JWT login did not return a client token");
    }

    const expiryMs = Date.now() + Math.max(leaseDuration - 5, 0) * 1000;
    this.tokenCache = { token, expiresAt: expiryMs };
    return token;
  }

  private async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }
    return this.fetchToken();
  }

  private assertVaultRef(ref: SecretRef): VaultSecretRef {
    if (!this.supports(ref)) {
      throw new Error("VaultJwtSecretsProvider only handles vault references");
    }
    return ref as VaultSecretRef;
  }

  private buildPath(ref: VaultSecretRef): string {
    const mount = this.options.mount ?? "secret";
    const cleanPath = ref.vault.replace(/^vault:\/\//, "");
    return `${this.options.baseUrl}/v1/${mount}/data/${cleanPath}`;
  }

  private async readSecret(ref: VaultSecretRef): Promise<SecretResolution> {
    const token = await this.getToken();
    const response = await this.httpClient(this.buildPath(ref), {
      headers: { "X-Vault-Token": token },
    });

    if (response.status >= 400) {
      throw new Error(`Vault returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as VaultSecretPayload;
    const value = payload.data?.data?.[ref.key];
    const version = payload.data?.metadata?.version?.toString();

    if (value === undefined) {
      throw new Error(`Vault secret key ${ref.key} not found at ${ref.vault}`);
    }

    return {
      provider: this.name,
      value: String(value),
      version,
      rotation: rotationStatusForRef(ref),
    };
  }

  async getSecret(ref: SecretRef): Promise<SecretResolution> {
    const vaultRef = this.assertVaultRef(ref);
    return this.readSecret(vaultRef);
  }

  async rotateSecret(ref: SecretRef): Promise<SecretRotationResult> {
    const vaultRef = this.assertVaultRef(ref);
    this.tokenCache = undefined;
    const secret = await this.readSecret(vaultRef);
    return { ...secret, rotation: rotationStatusForRef(vaultRef) };
  }

  describeRotation(ref: SecretRef) {
    return rotationStatusForRef(this.assertVaultRef(ref));
  }
}
