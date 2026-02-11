/**
 * Redaction classes for memory privacy.
 * Used to classify sensitive data facets and content within memory records.
 */
export enum RedactionClass {
  PII = "pii",               // Names, emails, phones
  PHI = "phi",               // Medical records, health data
  FINANCIAL = "financial",   // Credit cards, bank accounts, budgets
  ACCESSIBILITY = "accessibility", // Disability info, accommodations
}

export interface RedactionRule {
  class: RedactionClass;
  pattern: RegExp;
  replacement: string;
}

export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    class: RedactionClass.PII,
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL_REDACTED]",
  },
  {
    class: RedactionClass.FINANCIAL,
    pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    replacement: "[CARD_REDACTED]",
  },
];
