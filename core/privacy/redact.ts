import { RedactionClass } from './classification';

/**
 * Redacts content based on requested redaction classes.
 * Simple regex-based implementation for demonstration.
 */
export function redact(content: string, classes: RedactionClass[]): string {
  let redacted = content;

  if (classes.includes(RedactionClass.PII)) {
    // Redact emails
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
    // Redact phone numbers (simple)
    redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]");
  }

  if (classes.includes(RedactionClass.FINANCIAL)) {
    // Redact dollar amounts
    redacted = redacted.replace(/\$\d+(?:\.\d{2})?/g, "[AMOUNT_REDACTED]");
  }

  if (classes.includes(RedactionClass.PHI)) {
    // PHI redaction is complex; placeholder for specific terms
    const medicalTerms = ["lisinopril", "blood pressure", "diagnosis"];
    for (const term of medicalTerms) {
      const regex = new RegExp(term, "gi");
      redacted = redacted.replace(regex, "[HEALTH_INFO_REDACTED]");
    }
  }

  return redacted;
}
