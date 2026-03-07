/**
 * Redaction utility for UniReason framework.
 * Implements a deny-by-default policy for sensitive fields.
 */

export const SENSITIVE_FIELDS = ["instruction", "output", "rationale", "context"];

/**
 * Redacts sensitive fields from an object.
 * Replaces values of fields in SENSITIVE_FIELDS with "[REDACTED]".
 */
export function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const redactedObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      redactedObj[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      redactedObj[key] = redact(value);
    } else {
      redactedObj[key] = value;
    }
  }
  return redactedObj;
}

/**
 * Checks if a string contains a canary secret.
 */
export function containsCanary(text: string, canary: string): boolean {
  return text.includes(canary);
}
