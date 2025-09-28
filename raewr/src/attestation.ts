import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { promises as fs } from "node:fs";
import type { AttestationPayload, ResidencyAttestation } from "./types.js";
import { canonicalize } from "./policy.js";

export interface KeyMaterial {
  type: "ed25519";
  privateKey: string;
  publicKey: string;
}

export async function loadKeyMaterial(path: string): Promise<KeyMaterial> {
  const raw = await fs.readFile(path, "utf8");
  const parsed = JSON.parse(raw) as KeyMaterial;
  if (parsed.type !== "ed25519") {
    throw new Error(`Unsupported key type ${parsed.type}. Expected ed25519.`);
  }

  return parsed;
}

export function buildInvocationId(moduleHash: string, exportName: string, inputHash: string): string {
  return createHash("sha256").update(`${moduleHash}:${exportName}:${inputHash}`).digest("hex");
}

export async function signAttestation(payload: AttestationPayload, key: KeyMaterial): Promise<ResidencyAttestation> {
  const privateKey = createPrivateKey({ key: Buffer.from(key.privateKey, "base64"), format: "der", type: "pkcs8" });
  const canonical = canonicalize({ ...payload, publicKey: key.publicKey });
  const signature = sign(null, Buffer.from(canonical), privateKey).toString("base64");
  return { ...payload, signature, publicKey: key.publicKey };
}

export function verifyAttestation(attestation: ResidencyAttestation): boolean {
  const publicKey = createPublicKey({ key: Buffer.from(attestation.publicKey, "base64"), format: "der", type: "spki" });
  const canonical = canonicalize({
    runtimeVersion: attestation.runtimeVersion,
    region: attestation.region,
    nodeId: attestation.nodeId,
    policyId: attestation.policyId,
    policyHash: attestation.policyHash,
    invocationId: attestation.invocationId,
    wasmModuleHash: attestation.wasmModuleHash,
    exportName: attestation.exportName,
    inputHash: attestation.inputHash,
    chainDigest: attestation.chainDigest,
    previousDigest: attestation.previousDigest,
    timestampLogical: attestation.timestampLogical,
    publicKey: attestation.publicKey
  });

  return verify(null, Buffer.from(canonical), publicKey, Buffer.from(attestation.signature, "base64"));
}

export function hashInputs(args: number[] | undefined): string {
  if (!args || args.length === 0) {
    return createHash("sha256").update("void").digest("hex");
  }

  return createHash("sha256").update(JSON.stringify(args)).digest("hex");
}

export function hashModule(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
