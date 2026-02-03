export enum RedactionClass {
  PII = "pii",           // Personally Identifiable Information
  PHI = "phi",           // Protected Health Information
  FINANCIAL = "financial", // Financial data
  INTERNAL = "internal",   // Internal company data
}

export interface DataClassification {
  id: string;
  classes: RedactionClass[];
}
