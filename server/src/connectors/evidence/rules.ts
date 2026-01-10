
export interface EvidenceRule {
  id: string;
  description: string;
  weight: number; // 0 to 1
  evaluate: (data: any) => boolean;
}

export const REQUIRED_FIELDS_RULE: EvidenceRule = {
  id: 'required-fields',
  description: 'Checks for presence of essential fields (id, timestamp, content)',
  weight: 0.5,
  evaluate: (data: any) => {
    return !!(data && data.id && data.timestamp && data.content);
  }
};

export const REDACTION_MARKER_PRESENCE_RULE: EvidenceRule = {
  id: 'redaction-marker-presence',
  description: 'Checks if content contains explicit redaction markers',
  weight: 0.3,
  evaluate: (data: any) => {
    // Check content for [REDACTED] or similar patterns
    const content = JSON.stringify(data);
    return /\[REDACTED\]|\[PROTECTED\]|\*{3,}/.test(content);
  }
};

export const SOURCE_REFERENCE_RULE: EvidenceRule = {
  id: 'source-reference',
  description: 'Checks for source attribution',
  weight: 0.2,
  evaluate: (data: any) => {
      // Check for url or provenance
      return !!(data && (data.url || (data.metadata && data.metadata.source) || data.provenance));
  }
};

export const ALL_RULES = [REQUIRED_FIELDS_RULE, REDACTION_MARKER_PRESENCE_RULE, SOURCE_REFERENCE_RULE];
