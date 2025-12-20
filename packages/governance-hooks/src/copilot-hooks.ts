/**
 * Copilot Governance Hooks
 *
 * Governance controls for AI Copilot operations.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CopilotRequest {
  /** Query text */
  query: string;
  /** Investigation context */
  investigationId?: string;
  /** User making the request */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Conversation history */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Model preferences */
  model?: string;
  /** Temperature */
  temperature?: number;
}

export interface CopilotResponse {
  /** Generated answer */
  answer: string;
  /** Citations */
  citations: Array<{
    entityId: string;
    entityType: string;
    relevance: number;
  }>;
  /** Confidence score */
  confidence: number;
  /** Model used */
  model: string;
  /** Token usage */
  tokens: {
    input: number;
    output: number;
    total: number;
  };
}

export interface CopilotHook {
  /** Called before processing query */
  beforeQuery?: (request: CopilotRequest) => Promise<CopilotRequest | null>;
  /** Called after generating response */
  afterResponse?: (request: CopilotRequest, response: CopilotResponse) => Promise<CopilotResponse>;
  /** Called on error */
  onError?: (request: CopilotRequest, error: Error) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Query Validation Hook
// -----------------------------------------------------------------------------

export interface QueryValidationConfig {
  /** Blocked keywords */
  blockedKeywords: string[];
  /** Blocked patterns */
  blockedPatterns: RegExp[];
  /** Maximum query length */
  maxQueryLength: number;
  /** Require investigation context */
  requireInvestigation: boolean;
}

export function createQueryValidationHook(config: QueryValidationConfig): CopilotHook {
  return {
    async beforeQuery(request: CopilotRequest) {
      // Check query length
      if (request.query.length > config.maxQueryLength) {
        throw new CopilotPolicyError(`Query exceeds maximum length of ${config.maxQueryLength} characters`);
      }

      // Check for blocked keywords
      const lowerQuery = request.query.toLowerCase();
      for (const keyword of config.blockedKeywords) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          throw new CopilotPolicyError(`Query contains blocked keyword: ${keyword}`);
        }
      }

      // Check for blocked patterns
      for (const pattern of config.blockedPatterns) {
        if (pattern.test(request.query)) {
          throw new CopilotPolicyError('Query matches blocked pattern');
        }
      }

      // Check investigation requirement
      if (config.requireInvestigation && !request.investigationId) {
        throw new CopilotPolicyError('Investigation context is required for copilot queries');
      }

      return request;
    },
  };
}

export const DEFAULT_BLOCKED_KEYWORDS = [
  'delete all',
  'drop table',
  'truncate',
  'rm -rf',
  'format c:',
  'sudo',
  'password',
  'credential',
];

export const DEFAULT_BLOCKED_PATTERNS = [
  /\bdelete\s+from\b/i,
  /\bdrop\s+(table|database)\b/i,
  /\btruncate\s+table\b/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
];

// -----------------------------------------------------------------------------
// PII Scrubbing Hook
// -----------------------------------------------------------------------------

export interface PIIScrubbingConfig {
  /** PII patterns to detect */
  patterns: Array<{
    name: string;
    regex: RegExp;
    replacement: string;
  }>;
  /** Log PII detection */
  logDetection: boolean;
}

export function createPIIScrubbingHook(config: PIIScrubbingConfig): CopilotHook {
  return {
    async beforeQuery(request: CopilotRequest) {
      let scrubbedQuery = request.query;
      const detected: string[] = [];

      for (const pattern of config.patterns) {
        if (pattern.regex.test(scrubbedQuery)) {
          detected.push(pattern.name);
          scrubbedQuery = scrubbedQuery.replace(pattern.regex, pattern.replacement);
        }
      }

      if (detected.length > 0 && config.logDetection) {
        console.warn(`[CopilotPII] Detected PII in query: ${detected.join(', ')}`);
      }

      return {
        ...request,
        query: scrubbedQuery,
      };
    },

    async afterResponse(request: CopilotRequest, response: CopilotResponse) {
      let scrubbedAnswer = response.answer;

      for (const pattern of config.patterns) {
        scrubbedAnswer = scrubbedAnswer.replace(pattern.regex, pattern.replacement);
      }

      return {
        ...response,
        answer: scrubbedAnswer,
      };
    },
  };
}

export const DEFAULT_PII_SCRUBBING_PATTERNS: PIIScrubbingConfig['patterns'] = [
  { name: 'SSN', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN]' },
  { name: 'Credit Card', regex: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD]' },
  { name: 'Phone', regex: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, replacement: '[PHONE]' },
];

// -----------------------------------------------------------------------------
// Cost Control Hook
// -----------------------------------------------------------------------------

export interface CostControlConfig {
  /** Maximum tokens per request */
  maxTokensPerRequest: number;
  /** Maximum tokens per hour per user */
  maxTokensPerUserPerHour: number;
  /** Maximum tokens per hour per tenant */
  maxTokensPerTenantPerHour: number;
  /** Cost tracking callback */
  trackCost: (userId: string, tenantId: string, tokens: number, cost: number) => Promise<void>;
  /** Get current usage */
  getCurrentUsage: (userId: string, tenantId: string) => Promise<{ userTokens: number; tenantTokens: number }>;
}

export function createCostControlHook(config: CostControlConfig): CopilotHook {
  return {
    async beforeQuery(request: CopilotRequest) {
      const usage = await config.getCurrentUsage(request.userId, request.tenantId);

      if (usage.userTokens >= config.maxTokensPerUserPerHour) {
        throw new CopilotPolicyError('User token limit exceeded for this hour');
      }

      if (usage.tenantTokens >= config.maxTokensPerTenantPerHour) {
        throw new CopilotPolicyError('Tenant token limit exceeded for this hour');
      }

      return request;
    },

    async afterResponse(request: CopilotRequest, response: CopilotResponse) {
      // Check if response exceeded token limit
      if (response.tokens.total > config.maxTokensPerRequest) {
        console.warn(`[CopilotCost] Response exceeded token limit: ${response.tokens.total} > ${config.maxTokensPerRequest}`);
      }

      // Estimate cost (rough estimate based on common pricing)
      const cost = estimateCost(response.model, response.tokens.input, response.tokens.output);

      // Track usage
      await config.trackCost(request.userId, request.tenantId, response.tokens.total, cost);

      return response;
    },
  };
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    default: { input: 0.001, output: 0.002 },
  };

  const rate = rates[model] || rates.default;
  return (inputTokens * rate.input + outputTokens * rate.output) / 1000;
}

// -----------------------------------------------------------------------------
// Citation Enforcement Hook
// -----------------------------------------------------------------------------

export interface CitationEnforcementConfig {
  /** Minimum citations required */
  minCitations: number;
  /** Minimum confidence for citations */
  minCitationConfidence: number;
  /** Reject responses without citations */
  rejectWithoutCitations: boolean;
}

export function createCitationEnforcementHook(config: CitationEnforcementConfig): CopilotHook {
  return {
    async afterResponse(request: CopilotRequest, response: CopilotResponse) {
      const validCitations = response.citations.filter(
        (c) => c.relevance >= config.minCitationConfidence
      );

      if (validCitations.length < config.minCitations) {
        if (config.rejectWithoutCitations) {
          throw new CopilotPolicyError(
            `Response has insufficient citations: ${validCitations.length} < ${config.minCitations}`
          );
        }

        // Add warning to response
        return {
          ...response,
          answer: `[Warning: This response has limited supporting evidence]\n\n${response.answer}`,
        };
      }

      return response;
    },
  };
}

// -----------------------------------------------------------------------------
// Provenance Hook
// -----------------------------------------------------------------------------

export interface CopilotProvenanceRecorder {
  record(event: CopilotProvenanceEvent): Promise<string>;
}

export interface CopilotProvenanceEvent {
  type: 'query' | 'response' | 'citation';
  userId: string;
  tenantId: string;
  investigationId?: string;
  query: string;
  model: string;
  tokens: { input: number; output: number };
  citations: string[];
  confidence: number;
  timestamp: Date;
}

export function createCopilotProvenanceHook(recorder: CopilotProvenanceRecorder): CopilotHook {
  return {
    async afterResponse(request: CopilotRequest, response: CopilotResponse) {
      await recorder.record({
        type: 'response',
        userId: request.userId,
        tenantId: request.tenantId,
        investigationId: request.investigationId,
        query: request.query.substring(0, 500), // Truncate for storage
        model: response.model,
        tokens: { input: response.tokens.input, output: response.tokens.output },
        citations: response.citations.map((c) => c.entityId),
        confidence: response.confidence,
        timestamp: new Date(),
      });

      return response;
    },
  };
}

// -----------------------------------------------------------------------------
// Composite Hook
// -----------------------------------------------------------------------------

export function composeCopilotHooks(...hooks: CopilotHook[]): CopilotHook {
  return {
    async beforeQuery(request: CopilotRequest) {
      let current: CopilotRequest | null = request;

      for (const hook of hooks) {
        if (hook.beforeQuery && current) {
          current = await hook.beforeQuery(current);
        }
      }

      return current;
    },

    async afterResponse(request: CopilotRequest, response: CopilotResponse) {
      let current = response;

      for (const hook of hooks) {
        if (hook.afterResponse) {
          current = await hook.afterResponse(request, current);
        }
      }

      return current;
    },

    async onError(request: CopilotRequest, error: Error) {
      for (const hook of hooks) {
        if (hook.onError) {
          await hook.onError(request, error);
        }
      }
    },
  };
}

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

export class CopilotPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CopilotPolicyError';
  }
}
