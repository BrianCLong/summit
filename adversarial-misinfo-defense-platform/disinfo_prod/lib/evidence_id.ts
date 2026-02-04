import crypto from "node:crypto";

export function evidenceId(bytes: Buffer) {
  const h = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  return `EVD_${h}`;
}
