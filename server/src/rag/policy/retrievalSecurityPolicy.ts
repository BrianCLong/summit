export interface RetrievalPolicyInput {
  queryText: string;
  filters?: {
    allowlist?: string[];
  };
}

export interface RetrievalPolicyDecision {
  allowed: boolean;
  reasons: string[];
  sanitizedQuery: string;
  piiDetected: boolean;
  blockedTerms: string[];
}

const EXFILTRATION_PATTERNS = [
  /export all data/i,
  /dump (credentials|secrets|tokens)/i,
  /show me secrets/i,
  /bypass security/i,
  /admin password/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all|previous) instructions/i,
  /^\s*(system|developer|tool|assistant):/gim,
  /<\/?(system|tool|assistant)>/gi,
  /BEGIN (SYSTEM|INSTRUCTIONS)/gi,
];

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{16}\b/, // card
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\b[0-9a-f]{32}\b/i, // token hash-like
];

const sanitizeQuery = (input: string): string => {
  let output = input;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    output = output.replace(pattern, '');
  }
  return output.replace(/\s+/g, ' ').trim();
};

const detectPII = (input: string): boolean =>
  PII_PATTERNS.some((pattern) => pattern.test(input));

const detectExfiltration = (input: string): string[] => {
  return EXFILTRATION_PATTERNS.filter((pattern) => pattern.test(input)).map(
    (pattern) => pattern.source,
  );
};

export const evaluateRetrievalPolicy = (
  input: RetrievalPolicyInput,
): RetrievalPolicyDecision => {
  const reasons: string[] = [];

  if (!input.filters?.allowlist || input.filters.allowlist.length === 0) {
    reasons.push('ALLOWLIST_REQUIRED');
  }

  const blockedTerms = detectExfiltration(input.queryText);
  if (blockedTerms.length > 0) {
    reasons.push('EXFILTRATION_PATTERN');
  }

  const piiDetected = detectPII(input.queryText);
  if (piiDetected) {
    reasons.push('PII_DETECTED');
  }

  const sanitizedQuery = sanitizeQuery(input.queryText);

  return {
    allowed: reasons.length === 0,
    reasons,
    sanitizedQuery,
    piiDetected,
    blockedTerms,
  };
};

export const redactNeverLog = (input: string): string => {
  return input
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA****************')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****')
    .replace(/\b\d{16}\b/g, '****************');
};
