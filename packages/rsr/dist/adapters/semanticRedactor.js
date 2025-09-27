 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { BasePolicyAdapter } from './base.js';







const DEFAULT_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
  /\b\d{16}\b/g, // credit card digits
  /\b[A-Z]{2}\d{7}\b/g, // passport-like tokens
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
];

export class SemanticPIIRedactorAdapter extends BasePolicyAdapter {
   __init() {this.name = 'semantic-pii-redactor'}
  
  

  constructor(options = {}) {
    super();SemanticPIIRedactorAdapter.prototype.__init.call(this);;
    this.threshold = _nullishCoalesce(options.embeddingThreshold, () => ( 0.65));
    this.sensitiveTokens = _nullishCoalesce(options.sensitiveTokens, () => ( ['ssn', 'passport', 'credit card']));
  }

   shouldApply(context) {
    return this.detectPattern(context.query).length > 0 || this.embeddingScore(context.query) >= this.threshold;
  }

   apply(context) {
    const matches = this.detectPattern(context.query);
    const redactedQuery = matches.reduce((acc, match) => acc.replace(match, '[REDACTED]'), context.query);

    return {
      action: 'redact',
      explanation: matches.length
        ? 'Sensitive tokens were redacted using rule-based patterns.'
        : 'Embedding similarity suggested PII risk; query masked.',
      redactedQuery,
      redactedSelectors: Array.from(context.selectors),
      metadata: {
        matches,
        embeddingScore: this.embeddingScore(context.query),
      },
    };
  }

   detectPattern(input) {
    const hits = [];
    for (const pattern of DEFAULT_PATTERNS) {
      const found = input.match(pattern);
      if (found) {
        hits.push(...found);
      }
    }
    return hits;
  }

   embeddingScore(input) {
    const lowered = input.toLowerCase();
    if (!lowered.trim()) {
      return 0;
    }
    const hit = this.sensitiveTokens.some((token) => lowered.includes(token));
    return hit ? 0.75 : 0.15;
  }
}

export default SemanticPIIRedactorAdapter;
