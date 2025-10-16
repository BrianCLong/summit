import { trace, Span } from '@opentelemetry/api';
import { Counter } from 'prom-client';

const tracer = trace.getTracer('redaction', '24.2.0');

// Metrics
const redactionApplied = new Counter({
  name: 'redaction_applied_total',
  help: 'Total field redactions applied',
  labelNames: ['tenant_id', 'field', 'rule'],
});

type RedactionRule = 'pii' | 'financial' | 'sensitive' | 'k_anon';

interface RedactionPolicy {
  rules: RedactionRule[];
  kAnonThreshold?: number;
  allowedFields?: string[];
  redactionMask?: string;
}

interface FieldMetadata {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  sensitive?: boolean;
  pii?: boolean;
  financial?: boolean;
}

const FIELD_METADATA: Record<string, FieldMetadata> = {
  // Sensitive fields that may need redaction
  email: { type: 'string', pii: true },
  phone: { type: 'string', pii: true },
  ssn: { type: 'string', pii: true },
  creditCard: { type: 'string', financial: true },
  bankAccount: { type: 'string', financial: true },
  ip: { type: 'string', sensitive: true },
  location: { type: 'object', sensitive: true },
  userId: { type: 'string', sensitive: true },
  sessionId: { type: 'string', sensitive: true },

  // Standard fields that are usually safe
  id: { type: 'string' },
  type: { type: 'string' },
  value: { type: 'number' },
  timestamp: { type: 'string' },
  source: { type: 'string' },
  weight: { type: 'number' },
  score: { type: 'number' },
  status: { type: 'string' },
  tenantId: { type: 'string' },
};

export class RedactionService {
  private readonly defaultMask = '[REDACTED]';

  async redactObject(
    obj: any,
    policy: RedactionPolicy,
    tenantId: string,
    context?: Record<string, any>,
  ): Promise<any> {
    return tracer.startActiveSpan(
      'redaction.redact_object',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          rules: policy.rules.join(','),
          has_k_anon: !!policy.kAnonThreshold,
        });

        try {
          const redacted = await this.processObject(
            obj,
            policy,
            tenantId,
            context,
          );
          return redacted;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async processObject(
    obj: any,
    policy: RedactionPolicy,
    tenantId: string,
    context?: Record<string, any>,
  ): Promise<any> {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item) => this.processObject(item, policy, tenantId, context)),
      );
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    const result: any = {};

    for (const [field, value] of Object.entries(obj)) {
      const shouldRedact = this.shouldRedactField(field, policy);

      if (shouldRedact) {
        const redactionRule = this.getApplicableRule(field, policy);
        result[field] = this.applyRedaction(
          field,
          value,
          redactionRule,
          policy,
        );

        redactionApplied.inc({
          tenant_id: tenantId,
          field,
          rule: redactionRule,
        });
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[field] = await this.processObject(
          value,
          policy,
          tenantId,
          context,
        );
      } else {
        result[field] = value;
      }
    }

    // Apply k-anonymity if required
    if (policy.kAnonThreshold && policy.kAnonThreshold > 0) {
      return this.applyKAnonymity(result, policy.kAnonThreshold, tenantId);
    }

    return result;
  }

  private shouldRedactField(field: string, policy: RedactionPolicy): boolean {
    // If allowedFields is specified, only allow those fields
    if (policy.allowedFields && policy.allowedFields.length > 0) {
      return !policy.allowedFields.includes(field);
    }

    const metadata = FIELD_METADATA[field];
    if (!metadata) {
      return false; // Unknown fields are not redacted by default
    }

    // Check if any policy rule applies to this field
    return policy.rules.some((rule) => {
      switch (rule) {
        case 'pii':
          return metadata.pii === true;
        case 'financial':
          return metadata.financial === true;
        case 'sensitive':
          return metadata.sensitive === true;
        default:
          return false;
      }
    });
  }

  private getApplicableRule(field: string, policy: RedactionPolicy): string {
    const metadata = FIELD_METADATA[field];
    if (!metadata) return 'unknown';

    for (const rule of policy.rules) {
      switch (rule) {
        case 'pii':
          if (metadata.pii) return 'pii';
          break;
        case 'financial':
          if (metadata.financial) return 'financial';
          break;
        case 'sensitive':
          if (metadata.sensitive) return 'sensitive';
          break;
      }
    }

    return 'default';
  }

  private applyRedaction(
    field: string,
    value: any,
    rule: string,
    policy: RedactionPolicy,
  ): any {
    const mask = policy.redactionMask || this.defaultMask;

    // Special handling based on field type
    const metadata = FIELD_METADATA[field];
    if (metadata) {
      switch (metadata.type) {
        case 'string':
          return this.redactString(value, rule, mask);
        case 'number':
          return this.redactNumber(value, rule);
        case 'object':
          return mask;
        case 'array':
          return [];
        default:
          return mask;
      }
    }

    return mask;
  }

  private redactString(value: string, rule: string, mask: string): string {
    if (typeof value !== 'string') return mask;

    switch (rule) {
      case 'pii':
        // Partial redaction for PII (show first/last chars)
        if (value.length <= 4) return mask;
        return value.charAt(0) + mask + value.charAt(value.length - 1);

      case 'financial':
        // Show only last 4 digits for financial data
        if (value.length <= 4) return mask;
        return mask + value.slice(-4);

      case 'sensitive':
        // Full redaction for sensitive data
        return mask;

      default:
        return mask;
    }
  }

  private redactNumber(value: number, rule: string): any {
    switch (rule) {
      case 'financial':
        return 0; // Zero out financial numbers
      case 'sensitive':
        return -1; // Sentinel value for sensitive numbers
      default:
        return Math.round(value); // Round to remove precision
    }
  }

  private applyKAnonymity(obj: any, threshold: number, tenantId: string): any {
    // Simplified k-anonymity - in practice would need more sophisticated grouping
    if (!obj.id && !obj.userId) {
      return obj; // Can't apply k-anonymity without identifier
    }

    // Mock implementation - would need actual dataset analysis
    const kAnonFields = ['location', 'age', 'category'];
    const result = { ...obj };

    kAnonFields.forEach((field) => {
      if (result[field]) {
        // Generalize the field to maintain k-anonymity
        result[field] = this.generalizeField(result[field], threshold);
        redactionApplied.inc({
          tenant_id: tenantId,
          field,
          rule: 'k_anon',
        });
      }
    });

    return result;
  }

  private generalizeField(value: any, threshold: number): any {
    if (typeof value === 'number') {
      // Round to nearest 10/100 based on threshold
      const factor = threshold >= 10 ? 100 : 10;
      return Math.round(value / factor) * factor;
    }

    if (typeof value === 'string') {
      // Generalize strings (e.g., specific location to region)
      return value.split(' ')[0] + ' [REGION]';
    }

    return value;
  }

  async redactGraphQLResponse(
    response: any,
    policy: RedactionPolicy,
    tenantId: string,
  ): Promise<any> {
    if (!response || !response.data) {
      return response;
    }

    return {
      ...response,
      data: await this.redactObject(response.data, policy, tenantId),
    };
  }

  createRedactionPolicy(
    rules: RedactionRule[],
    options?: {
      kAnonThreshold?: number;
      allowedFields?: string[];
      redactionMask?: string;
    },
  ): RedactionPolicy {
    return {
      rules,
      kAnonThreshold: options?.kAnonThreshold,
      allowedFields: options?.allowedFields,
      redactionMask: options?.redactionMask,
    };
  }

  getRedactionStats(): Record<string, any> {
    return {
      supportedRules: ['pii', 'financial', 'sensitive', 'k_anon'],
      defaultMask: this.defaultMask,
      fieldsWithMetadata: Object.keys(FIELD_METADATA).length,
      timestamp: new Date().toISOString(),
    };
  }
}

export const redactionService = new RedactionService();
