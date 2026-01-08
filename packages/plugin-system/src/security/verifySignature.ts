import type { PluginManifest } from "../types/plugin.js";

export type SignatureVerificationStatus = "verified" | "unverified" | "invalid";

export interface SignatureVerificationInput {
  manifest: PluginManifest;
  signature?: string;
  publicKey?: string;
  algorithm?: string;
}

export interface SignatureVerificationResult {
  status: SignatureVerificationStatus;
  reason?: string;
}

export function verifySignature(
  _input: SignatureVerificationInput
): Promise<SignatureVerificationResult> {
  return Promise.resolve({
    status: "unverified",
    reason: "Signature verification not implemented",
  });
}
