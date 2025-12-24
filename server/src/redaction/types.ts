
export interface RedactionRule {
  id: string;
  description: string;
  type: 'regex' | 'pii_category';
  pattern?: RegExp;
  category?: 'EMAIL' | 'PHONE' | 'SSN' | 'CREDIT_CARD';
  replacement: string;
}

export interface RedactionMapEntry {
  start: number;
  end: number;
  originalText: string;
  ruleId: string;
  justification: string;
}

export interface RedactionResult {
  redactedText: string;
  map: RedactionMapEntry[];
}
