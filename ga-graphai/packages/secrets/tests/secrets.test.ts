import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  AwsKmsEnvelopeProvider,
  ZeroTrustSecretsManager,
  VaultJwtSecretsProvider,
  buildEnvelopeCiphertext,
  computeRotationStatus,
} from "../src/index.js";
import type { SecretRef } from "../src/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ZeroTrustSecretsManager", () => {
  it("resolves secrets through the Vault JWT adapter", async () => {
    const calls: string[] = [];
    const provider = new VaultJwtSecretsProvider({
      baseUrl: "https://vault.example",
      role: "graphai",
      jwt: "jwt-token",
      httpClient: async (url, init) => {
        calls.push(url);
        if (url.includes("/auth/jwt/login")) {
          return {
            status: 200,
            json: async () => ({
              auth: { client_token: "vault-token", lease_duration: 60 },
            }),
          };
        }
        return {
          status: 200,
          json: async () => ({
            data: {
              data: { password: "s3cr3t" },
              metadata: { version: 2 },
            },
          }),
        };
      },
    });

    const manager = new ZeroTrustSecretsManager([provider]);
    const secret = await manager.resolve({ vault: "vault://kv/db", key: "password" });

    expect(secret.value).toBe("s3cr3t");
    expect(secret.version).toBe("2");
    expect(calls.some((call) => call.includes("/auth/jwt/login"))).toBe(true);
  });

  it("rotates an AWS KMS envelope secret and updates rotation metadata", async () => {
    const dataKey = randomBytes(32);
    const ciphertext = buildEnvelopeCiphertext(
      Buffer.from("encrypted-key"),
      dataKey,
      "very-secret"
    );

    const kmsProvider = new AwsKmsEnvelopeProvider({
      decrypt: async () => ({ Plaintext: dataKey }),
      generateDataKey: async () => ({
        CiphertextBlob: Buffer.from("new-key"),
        Plaintext: randomBytes(32),
      }),
    });

    const manager = new ZeroTrustSecretsManager([kmsProvider]);
    const ref: SecretRef = {
      provider: "kms",
      key: "db/password",
      keyId: "alias/db",
      ciphertext,
      rotation: {
        intervalDays: 30,
        lastRotated: new Date(Date.now() - 45 * DAY_MS).toISOString(),
      },
    };

    const rotated = await manager.rotate(ref);

    expect(rotated.value).toBe("very-secret");
    expect(rotated.updatedRef?.ciphertext).not.toBe(ciphertext);
    expect(rotated.rotation?.needsRotation).toBe(false);
    expect(rotated.updatedRef?.rotation?.lastRotated).toBeDefined();
  });
});

describe("computeRotationStatus", () => {
  it("marks secrets without policy as needing rotation", () => {
    const status = computeRotationStatus(undefined);
    expect(status.needsRotation).toBe(true);
    expect(status.reason).toBe("rotation policy missing");
  });

  it("detects overdue rotation based on interval", () => {
    const now = new Date();
    const status = computeRotationStatus(
      {
        intervalDays: 15,
        lastRotated: new Date(now.getTime() - 20 * DAY_MS).toISOString(),
      },
      now
    );
    expect(status.needsRotation).toBe(true);
  });
});
