import crypto from "node:crypto";
import type { Manifest, ManifestSignature, ManifestSignatureFile } from "./types.js";

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalizeManifest(manifest: Manifest): string {
  const { signature: _signature, ...rest } = manifest;
  const sorted = sortObject(rest) as Manifest;
  return JSON.stringify(sorted);
}

export function hashManifest(manifest: Manifest): string {
  return crypto.createHash("sha256").update(canonicalizeManifest(manifest)).digest("hex");
}

export function signManifest(
  manifest: Manifest,
  options: { privateKeyPem: string; publicKeyPem?: string; keyId: string; signedAt?: string }
): ManifestSignatureFile {
  const payload = Buffer.from(canonicalizeManifest(manifest));
  const signatureBuffer = crypto.sign(null, payload, options.privateKeyPem);
  const publicKey = options.publicKeyPem
    ? crypto
        .createPublicKey(options.publicKeyPem)
        .export({ type: "spki", format: "pem" })
        .toString()
    : crypto
        .createPublicKey(options.privateKeyPem)
        .export({ type: "spki", format: "pem" })
        .toString();
  const signature: ManifestSignature = {
    algorithm: "ed25519",
    keyId: options.keyId,
    publicKey,
    signature: signatureBuffer.toString("base64"),
    signedAt: options.signedAt ?? new Date().toISOString(),
  };
  return {
    manifestHash: hashManifest(manifest),
    signature,
  };
}

export function verifyManifestSignature(
  manifest: Manifest,
  signatureFile: ManifestSignatureFile,
  publicKeyOverride?: string
): { valid: boolean; reason?: string } {
  const payload = Buffer.from(canonicalizeManifest(manifest));
  const expectedHash = hashManifest(manifest);
  if (signatureFile.manifestHash !== expectedHash) {
    return { valid: false, reason: "Manifest hash mismatch" };
  }
  const publicKey = publicKeyOverride ?? signatureFile.signature.publicKey;
  if (!publicKey) {
    return { valid: false, reason: "Public key missing" };
  }
  const signature = Buffer.from(signatureFile.signature.signature, "base64");
  const ok = crypto.verify(null, payload, publicKey, signature);
  return ok ? { valid: true } : { valid: false, reason: "Signature invalid" };
}
