import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  EnvironmentSecretsProvider,
  ZeroTrustSecretsManager,
  buildKeyRing,
  signTokenWithKeyRing,
  verifyTokenWithKeyRing,
} from "../src/index.js";
import type { RotatingKeyDefinition } from "../src/keyring.js";

const NOW = new Date("2024-01-01T00:10:00Z");

describe("key ring rotation", () => {
  beforeEach(() => {
    process.env.KEY_ROTATION = "1";
    process.env.OLD_SIGNING_KEY = "old-secret";
    process.env.CURRENT_SIGNING_KEY = "current-secret";
  });

  afterEach(() => {
    delete process.env.KEY_ROTATION;
    delete process.env.OLD_SIGNING_KEY;
    delete process.env.CURRENT_SIGNING_KEY;
  });

  it("selects the newest key when rotation is enabled and preserves overlap", async () => {
    const manager = new ZeroTrustSecretsManager([new EnvironmentSecretsProvider()]);

    const definitions: RotatingKeyDefinition[] = [
      {
        kid: "old",
        secret: { env: "OLD_SIGNING_KEY", key: "signing-key" },
        notBefore: new Date(NOW.getTime() - 20 * 60 * 1000),
        expiresAt: new Date(NOW.getTime() + 15 * 60 * 1000),
      },
      {
        kid: "current",
        secret: { env: "CURRENT_SIGNING_KEY", key: "signing-key" },
        notBefore: new Date(NOW.getTime() - 30 * 1000),
      },
    ];

    const ring = await buildKeyRing(definitions, manager, {
      overlapSeconds: 300,
      now: NOW,
    });

    expect(ring.active.kid).toBe("current");

    const signed = signTokenWithKeyRing({ sub: "123", scope: ["read"] }, ring, { issuer: "test" });

    const verified = verifyTokenWithKeyRing(signed, ring, {
      issuer: "test",
      now: NOW,
    }) as jwt.JwtPayload;

    expect(verified.sub).toBe("123");
    expect(verified.scope).toEqual(["read"]);
    expect(verified.iss).toBe("test");

    const oldKey = ring.keys.find((key) => key.kid === "old")!;
    const legacyToken = jwt.sign({ sub: "123", iss: "test" }, oldKey.secret, {
      algorithm: oldKey.algorithm,
      keyid: oldKey.kid,
      expiresIn: "10m",
    });

    const overlapVerification = verifyTokenWithKeyRing(legacyToken, ring, {
      issuer: "test",
      now: new Date(NOW.getTime() + 2 * 60 * 1000),
    }) as jwt.JwtPayload;

    expect(overlapVerification.sub).toBe("123");

    expect(() =>
      verifyTokenWithKeyRing(legacyToken, ring, {
        issuer: "test",
        now: new Date(NOW.getTime() + 10 * 60 * 1000),
      })
    ).toThrow(/overlap/i);
  });
});
