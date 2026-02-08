/**
 * Curated Injection Pattern Library
 *
 * Known prompt injection, jailbreak, and data poisoning patterns
 * sourced from public research (OWASP LLM Top 10, JailbreakBench, PromptInject).
 *
 * Each pattern has:
 * - regex: Detection pattern
 * - weight: Confidence weight [0, 1] for match
 * - category: Attack classification
 *
 * Update frequency: Reviewed quarterly from red team exercises and public datasets.
 *
 * @module conductor/validation/injection-patterns
 */

export interface InjectionPattern {
  regex: RegExp;
  weight: number;
  category: 'instruction_override' | 'role_hijack' | 'data_exfil' | 'encoding_bypass' | 'jailbreak' | 'context_manipulation';
  description: string;
}

/**
 * Curated set of known prompt injection patterns.
 * Patterns are ordered by specificity (most specific first).
 */
export const INJECTION_PATTERNS: InjectionPattern[] = [
  // --- Instruction Override ---
  {
    regex: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/i,
    weight: 0.95,
    category: 'instruction_override',
    description: 'Direct instruction override attempt',
  },
  {
    regex: /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context)/i,
    weight: 0.95,
    category: 'instruction_override',
    description: 'Disregard previous instructions',
  },
  {
    regex: /forget\s+(everything|all|what)\s+(you\s+)?(were|have\s+been)\s+(told|instructed|given)/i,
    weight: 0.90,
    category: 'instruction_override',
    description: 'Memory wipe instruction',
  },
  {
    regex: /override\s+(your|the|all)\s+(system\s+)?(instructions?|prompt|rules?|guidelines?|restrictions?)/i,
    weight: 0.90,
    category: 'instruction_override',
    description: 'Explicit override directive',
  },
  {
    regex: /new\s+(system\s+)?(instructions?|prompt|directive):\s*/i,
    weight: 0.85,
    category: 'instruction_override',
    description: 'New system instruction injection',
  },
  {
    regex: /\[SYSTEM\]|\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>system/i,
    weight: 0.90,
    category: 'instruction_override',
    description: 'System prompt delimiter injection',
  },

  // --- Role Hijack ---
  {
    regex: /you\s+are\s+now\s+(a|an|the|my)\s+/i,
    weight: 0.80,
    category: 'role_hijack',
    description: 'Role reassignment attempt',
  },
  {
    regex: /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the|my)\s+(different|new|unrestricted)/i,
    weight: 0.85,
    category: 'role_hijack',
    description: 'Act-as persona override',
  },
  {
    regex: /pretend\s+(you\s+are|to\s+be)\s+(a|an)\s+/i,
    weight: 0.75,
    category: 'role_hijack',
    description: 'Persona pretend injection',
  },
  {
    regex: /entering?\s+(DAN|developer|sudo|admin|god|root)\s+mode/i,
    weight: 0.95,
    category: 'role_hijack',
    description: 'DAN/privilege escalation mode',
  },
  {
    regex: /do\s+anything\s+now|DAN\s+mode|jailbreak\s+mode/i,
    weight: 0.95,
    category: 'jailbreak',
    description: 'Known jailbreak persona (DAN)',
  },

  // --- Data Exfiltration ---
  {
    regex: /reveal\s+(your|the|all)\s+(system\s+)?(prompt|instructions?|rules?|configuration|secrets?|api\s*keys?)/i,
    weight: 0.85,
    category: 'data_exfil',
    description: 'System prompt exfiltration',
  },
  {
    regex: /show\s+me\s+(your|the)\s+(hidden|system|original|full)\s+(prompt|instructions?|context)/i,
    weight: 0.85,
    category: 'data_exfil',
    description: 'Hidden prompt reveal attempt',
  },
  {
    regex: /what\s+(are|were)\s+your\s+(original|system|initial|hidden)\s+(instructions?|prompt|rules?)/i,
    weight: 0.80,
    category: 'data_exfil',
    description: 'Original instruction extraction',
  },
  {
    regex: /output\s+(all|every|the\s+entire)\s+(customer|user|private|internal)\s+data/i,
    weight: 0.90,
    category: 'data_exfil',
    description: 'Bulk data exfiltration',
  },

  // --- Encoding Bypass ---
  {
    regex: /base64[:\s]|atob\s*\(|btoa\s*\(|decode\s+this\s+base64/i,
    weight: 0.70,
    category: 'encoding_bypass',
    description: 'Base64 encoding bypass attempt',
  },
  {
    regex: /translate\s+(from|this)\s+(hex|rot13|binary|morse|pig\s*latin)/i,
    weight: 0.70,
    category: 'encoding_bypass',
    description: 'Encoding/cipher bypass attempt',
  },
  {
    regex: /[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/,
    weight: 0.60,
    category: 'encoding_bypass',
    description: 'Zero-width/invisible unicode characters',
  },
  {
    regex: /[\u0370-\u03ff\u0400-\u04ff].*(?:ignore|forget|override|reveal)/i,
    weight: 0.65,
    category: 'encoding_bypass',
    description: 'Mixed script obfuscation with instruction keywords',
  },

  // --- Context Manipulation ---
  {
    regex: /the\s+following\s+is\s+(a\s+)?trusted\s+(source|input|context|data)/i,
    weight: 0.75,
    category: 'context_manipulation',
    description: 'False trust assertion',
  },
  {
    regex: /this\s+(is|was)\s+(authorized|approved|verified)\s+by\s+(admin|security|management)/i,
    weight: 0.80,
    category: 'context_manipulation',
    description: 'False authorization claim',
  },
  {
    regex: /\bsudo\b|\bas\s+root\b|admin\s*access|privilege\s*escalat/i,
    weight: 0.75,
    category: 'context_manipulation',
    description: 'Privilege escalation terminology',
  },

  // --- Jailbreak Techniques ---
  {
    regex: /hypothetical(ly)?\s+(scenario|situation|case)\s+where\s+(you|there\s+are)\s+no\s+(rules?|restrictions?|limits?)/i,
    weight: 0.80,
    category: 'jailbreak',
    description: 'Hypothetical unrestricted scenario',
  },
  {
    regex: /for\s+(educational|research|academic|testing)\s+purposes?\s+only/i,
    weight: 0.50,
    category: 'jailbreak',
    description: 'Educational pretext (low confidence - may be legitimate)',
  },
  {
    regex: /without\s+any\s+(ethical|moral|safety)\s+(considerations?|restrictions?|guidelines?|filters?)/i,
    weight: 0.85,
    category: 'jailbreak',
    description: 'Safety bypass request',
  },
];

/**
 * Domain vocabulary for semantic drift detection.
 * Maps domain names to characteristic terms (TF-IDF inspired).
 */
export const DOMAIN_VOCABULARIES: Record<string, string[]> = {
  financial_analysis: [
    'revenue', 'profit', 'loss', 'market', 'stock', 'bond', 'portfolio',
    'asset', 'liability', 'equity', 'dividend', 'valuation', 'earnings',
    'fiscal', 'budget', 'forecast', 'risk', 'return', 'capital', 'investment',
    'compliance', 'audit', 'balance', 'cash', 'flow', 'margin', 'ratio',
  ],
  healthcare: [
    'patient', 'diagnosis', 'treatment', 'medication', 'symptom', 'clinical',
    'hospital', 'physician', 'nurse', 'medical', 'disease', 'therapy',
    'prescription', 'dosage', 'procedure', 'prognosis', 'pathology',
    'laboratory', 'imaging', 'vital', 'chronic', 'acute', 'referral',
  ],
  customer_support: [
    'ticket', 'issue', 'resolution', 'customer', 'support', 'help',
    'account', 'billing', 'refund', 'complaint', 'service', 'response',
    'escalation', 'sla', 'satisfaction', 'inquiry', 'request', 'feedback',
  ],
  intelligence: [
    'entity', 'relationship', 'threat', 'indicator', 'actor', 'campaign',
    'attribution', 'confidence', 'source', 'report', 'assessment', 'target',
    'operation', 'infrastructure', 'malware', 'vulnerability', 'exploit',
    'reconnaissance', 'collection', 'analysis', 'dissemination', 'ttps',
  ],
  legal: [
    'contract', 'clause', 'liability', 'compliance', 'regulation', 'statute',
    'jurisdiction', 'precedent', 'plaintiff', 'defendant', 'court', 'ruling',
    'arbitration', 'tort', 'damages', 'indemnity', 'warranty', 'disclosure',
  ],
  general: [
    'information', 'data', 'system', 'process', 'result', 'analysis',
    'report', 'summary', 'detail', 'overview', 'context', 'content',
  ],
};
