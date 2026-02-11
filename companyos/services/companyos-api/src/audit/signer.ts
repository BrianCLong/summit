import crypto from "crypto";
import { AuditEvent } from "./types";

const SIGNING_ALGORITHM = "sha256";
const DEFAULT_KEY = "dev-secret-do-not-use-in-prod";

export function getSigningKey(): string {
  return process.env.AUDIT_SIGNING_KEY || DEFAULT_KEY;
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
