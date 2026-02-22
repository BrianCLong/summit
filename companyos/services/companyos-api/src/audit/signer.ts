import crypto from "crypto";
import { AuditEvent } from "./types";

const SIGNING_ALGORITHM = "sha256";
export function getSigningKey(): string {
  const key = process.env.AUDIT_SIGNING_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUDIT_SIGNING_KEY must be set in production");
    }
    return "dev-secret-do-not-use-in-prod";
  }
  return key;
}

export function calculateSignature(event: Omit<AuditEvent, "signature">): string {
  const hmac = crypto.createHmac(SIGNING_ALGORITHM, getSigningKey());
  const data = JSON.stringify(event, Object.keys(event).sort());
  hmac.update(data);
  return hmac.digest("hex");
}

export function signEvent(event: AuditEvent): AuditEvent {
  const { signature, ...rest } = event;
  const newSignature = calculateSignature(rest);
  return { ...rest, signature: newSignature };
}

export function verifyEvent(event: AuditEvent): boolean {
  if (!event.signature) return false;
  const { signature, ...rest } = event;
  const expectedSignature = calculateSignature(rest);
  return signature === expectedSignature;
}
