import fs from "fs";
import path from "path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { Receipt } from "../src/index.js";

const receiptSchema = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../../prov-ledger/schema/receipt.v0.1.json"),
    "utf-8"
  )
);
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile<Receipt>(receiptSchema);

const REQUIRED_FIELDS = receiptSchema.required ?? [];
const RUNS = 50;

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(gen: () => number, min: number, max: number): number {
  return Math.floor(gen() * (max - min + 1)) + min;
}

function randomString(gen: () => number, length: number, charset: string): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    const idx = randomInt(gen, 0, charset.length - 1);
    result += charset[idx];
  }
  return result;
}

function randomHex(gen: () => number, length: number): string {
  return randomString(gen, length, "0123456789abcdef");
}

function randomBase64(gen: () => number, length: number): string {
  const bytes = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = randomInt(gen, 0, 255);
  }
  return bytes.toString("base64");
}

function maybe<T>(gen: () => number, value: () => T): T | undefined {
  return gen() > 0.6 ? value() : undefined;
}

function buildReceipt(seed: number): Receipt {
  const gen = mulberry32(seed);
  const claims = Array.from(
    { length: randomInt(gen, 1, 8) },
    (_, i) => `claim-${i}-${randomString(gen, 4, "abcdef0123456789")}`
  );

  const receipt: Receipt = {
    id: `rcpt-${randomString(gen, 8, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._:-")}`,
    version: "0.1.0",
    caseId: `case-${randomString(gen, 6, "abcdef0123456789")}`,
    claimIds: claims,
    createdAt: new Date(Date.UTC(2024, randomInt(gen, 0, 11), randomInt(gen, 1, 28))).toISOString(),
    actor: {
      id: `actor-${randomString(gen, 5, "abcdef0123456789")}`,
      role: randomString(gen, 6, "abcdefghijklmnopqrstuvwxyz"),
      tenantId: maybe(gen, () => `tenant-${randomString(gen, 4, "abcdef0123456789")}`),
      displayName: maybe(gen, () => `Agent ${randomString(gen, 4, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")}`),
    },
    pipeline: maybe(gen, () => ({
      stage: maybe(gen, () => `stage-${randomString(gen, 3, "abc")}`),
      runId: maybe(gen, () => `run-${randomString(gen, 4, "0123456789")}`),
      taskId: maybe(gen, () => `task-${randomString(gen, 4, "abcdef")}`),
      step: maybe(gen, () => `step-${randomString(gen, 4, "ghij")}`),
    })),
    payloadHash: randomHex(gen, 64),
    signature: {
      algorithm: "ed25519",
      keyId: `key-${randomString(gen, 6, "abcdef0123456789")}`,
      publicKey: randomBase64(gen, 48),
      value: randomBase64(gen, 48),
      signedAt: new Date(
        Date.UTC(2024, randomInt(gen, 0, 11), randomInt(gen, 1, 28))
      ).toISOString(),
    },
    proofs: {
      receiptHash: randomHex(gen, 64),
      manifestMerkleRoot: maybe(gen, () => randomHex(gen, 64)),
      claimHashes: maybe(gen, () =>
        Array.from({ length: randomInt(gen, 1, 6) }, () => randomHex(gen, 64))
      ),
    },
    metadata: maybe(gen, () => ({
      job: randomString(gen, 6, "abcdef"),
      attempt: randomInt(gen, 1, 3),
    })),
    redactions: maybe(gen, () =>
      Array.from({ length: randomInt(gen, 0, 3) }, () => ({
        path: `payload.${randomString(gen, 4, "abcd")}`,
        reason: `reason-${randomString(gen, 4, "wxyz")}`,
        appliedAt: maybe(gen, () =>
          new Date(Date.UTC(2024, 0, randomInt(gen, 1, 15))).toISOString()
        ),
        appliedBy: maybe(gen, () => `user-${randomString(gen, 4, "mnop")}`),
      }))
    ),
  };

  return receipt;
}

describe("receipt schema fuzzing (deterministic)", () => {
  it("accepts a range of generated receipts", () => {
    for (let i = 0; i < RUNS; i += 1) {
      const receipt = buildReceipt(424242 + i);
      const result = validate(receipt);
      if (!result) {
        // eslint-disable-next-line no-console
        console.error(validate.errors);
      }
      expect(result).toBe(true);
    }
  });

  it("rejects receipts with unknown top-level fields", () => {
    const allowed = new Set(Object.keys(receiptSchema.properties ?? {}));
    for (let i = 0; i < RUNS; i += 1) {
      const receipt = { ...buildReceipt(525200 + i) } as Record<string, unknown>;
      const unknownKey = `extra_${i}`;
      expect(allowed.has(unknownKey)).toBe(false);
      receipt[unknownKey] = "unexpected";
      expect(validate(receipt)).toBe(false);
    }
  });

  it("enforces required fields even when inputs are sparse", () => {
    for (let i = 0; i < RUNS; i += 1) {
      const receipt = { ...buildReceipt(626260 + i) } as Record<string, unknown>;
      const missing = REQUIRED_FIELDS[i % REQUIRED_FIELDS.length]!;
      delete receipt[missing];
      expect(validate(receipt)).toBe(false);
    }
  });

  it("rejects malformed hashes and timestamps throughout the payload", () => {
    for (let i = 0; i < RUNS; i += 1) {
      const receipt = buildReceipt(727278 + i);
      const badHash = `zz${i}`;
      const badTimestamp = "not-a-timestamp";
      const mutated: Receipt = {
        ...receipt,
        payloadHash: badHash,
        proofs: { ...receipt.proofs, receiptHash: badHash },
        signature: { ...receipt.signature, signedAt: badTimestamp },
      };
      expect(validate(mutated)).toBe(false);
    }
  });

  it("covers tricky ingestion corpus cases", () => {
    const base = buildReceipt(888888);
    const trickyCorpus: Array<{ payload: Partial<Receipt>; valid: boolean }> = [
      {
        valid: false,
        payload: { createdAt: "2025-01-01 00:00:00" },
      },
      {
        valid: true,
        payload: { metadata: { amount: "19.999", currency: "USD" } },
      },
      {
        valid: true,
        payload: { claimIds: Array.from({ length: 25 }, (_, idx) => `claim-${idx}`) },
      },
    ];

    trickyCorpus.forEach(({ payload, valid }) => {
      const receipt = { ...base, ...payload } as Receipt;
      const result = validate(receipt);
      expect(result).toBe(valid);
    });
  });
});
