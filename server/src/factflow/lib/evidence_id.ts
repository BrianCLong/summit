import crypto from "node:crypto";

export function evidenceIdFromBytes(bytes: Buffer): string {
  const h = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  return `EVD_${h}`;
}

export function generateEvidenceId(content: string): string {
    return evidenceIdFromBytes(Buffer.from(content));
}
