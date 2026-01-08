// packages/extension-sdk/src/manifest.ts
import { verify } from "node:crypto";

export type PluginManifest = {
  id: string;
  version: string;
  kind: "panel" | "analytics";
  permissions: string[];
  entry: string;
  signature: string;
};

export function verifyManifest(m: PluginManifest, pubKey: string): boolean {
  // Construct payload same as signing (excluding signature)
  const payload = JSON.stringify({ ...m, signature: undefined });
  const signature = Buffer.from(m.signature, "base64");

  // Verify using Ed25519
  // Assuming pubKey is a PEM encoded public key string
  return verify(null, Buffer.from(payload), pubKey, signature);
}
