/**
 * Policy-Aware Retriever
 * ABAC-enforced retrieval with redaction support
 */

import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  RetrievalQuery,
  EvidenceChunk,
  PolicyDecision,
} from '../types/index.js';

const tracer = trace.getTracer('graphrag-policy-retriever');

export interface PolicyContext {
  userId: string;
  tenantId: string;
  roles: string[];
  clearanceLevel?: string;
  jurisdiction?: string;
  purpose?: string;
  accessGroups?: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions: Record<string, any>;
  priority: number;
}

export interface RedactionRule {
  pattern: RegExp | string;
  replacement: string;
  reason: string;
  appliesTo: string[];
}

export class PolicyRetriever {
  private redactionRules: RedactionRule[] = [];
  private opaEndpoint?: string;

  constructor(
    private driver: Driver,
    opaEndpoint?: string,
  ) {
    this.opaEndpoint = opaEndpoint;
    this.initializeDefaultRedactionRules();
  }

  /**
   * Retrieve with policy enforcement
   */
  async retrieveWithPolicy(
    evidenceChunks: EvidenceChunk[],
    context: PolicyContext,
  ): Promise<{
    allowed: EvidenceChunk[];
    denied: Array<{ chunkId: string; reason: string }>;
    redacted: EvidenceChunk[];
  }> {
    return tracer.startActiveSpan('policy_retrieval', async (span) => {
      try {
        span.setAttribute('context.userId', context.userId);
        span.setAttribute('context.tenantId', context.tenantId);
        span.setAttribute('chunks.count', evidenceChunks.length);

        const allowed: EvidenceChunk[] = [];
        const denied: Array<{ chunkId: string; reason: string }> = [];
        const redacted: EvidenceChunk[] = [];

        for (const chunk of evidenceChunks) {
          // Check access policy
          const decision = await this.evaluatePolicy(chunk, context);

          if (!decision.allowed) {
            denied.push({
              chunkId: chunk.id,
              reason: decision.reason || 'Access denied by policy',
            });
            continue;
          }

          // Apply redactions if needed
          if (decision.redactions && decision.redactions.length > 0) {
            const redactedChunk = this.applyRedactions(chunk, decision.redactions);
            redacted.push(redactedChunk);
          } else {
            allowed.push(chunk);
          }
        }

        span.setAttribute('results.allowed', allowed.length);
        span.setAttribute('results.denied', denied.length);
        span.setAttribute('results.redacted', redacted.length);
        span.setStatus({ code: SpanStatusCode.OK });

        return { allowed, denied, redacted };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Evaluate policy for a chunk
   */
  async evaluatePolicy(
    chunk: EvidenceChunk,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    // Check OPA if configured
    if (this.opaEndpoint) {
      return this.evaluateWithOPA(chunk, context);
    }

    // Fall back to local policy evaluation
    return this.evaluateLocalPolicy(chunk, context);
  }

  /**
   * Evaluate policy using OPA
   */
  private async evaluateWithOPA(
    chunk: EvidenceChunk,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    try {
      const input = {
        subject: {
          userId: context.userId,
          roles: context.roles,
          clearanceLevel: context.clearanceLevel,
          jurisdiction: context.jurisdiction,
        },
        resource: {
          type: 'evidence_chunk',
          id: chunk.id,
          tenantId: chunk.tenantId,
          policyLabels: chunk.policyLabels,
          citations: chunk.citations.map((c) => ({
            sourceType: c.sourceType,
            documentId: c.documentId,
          })),
        },
        action: 'read',
        context: {
          purpose: context.purpose,
          timestamp: new Date().toISOString(),
        },
      };

      const response = await fetch(`${this.opaEndpoint}/v1/data/graphrag/allow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const result = await response.json();

      return {
        allowed: result.result?.allow ?? false,
        reason: result.result?.reason,
        redactions: result.result?.redactions,
        auditLog: {
          policyId: 'opa-graphrag',
          evaluatedAt: new Date().toISOString(),
          userId: context.userId,
          tenantId: context.tenantId,
          action: 'read',
          resource: `evidence:${chunk.id}`,
        },
      };
    } catch (error) {
      console.error('OPA evaluation failed:', error);
      // Fail closed - deny access on error
      return {
        allowed: false,
        reason: 'Policy evaluation failed',
        auditLog: {
          policyId: 'opa-error',
          evaluatedAt: new Date().toISOString(),
          userId: context.userId,
          tenantId: context.tenantId,
          action: 'read',
          resource: `evidence:${chunk.id}`,
        },
      };
    }
  }

  /**
   * Evaluate local policy rules
   */
  private async evaluateLocalPolicy(
    chunk: EvidenceChunk,
    context: PolicyContext,
  ): Promise<PolicyDecision> {
    const redactions: Array<{ field: string; reason: string }> = [];

    // Tenant isolation
    if (chunk.tenantId !== context.tenantId) {
      return {
        allowed: false,
        reason: 'Cross-tenant access denied',
        auditLog: {
          policyId: 'tenant-isolation',
          evaluatedAt: new Date().toISOString(),
          userId: context.userId,
          tenantId: context.tenantId,
          action: 'read',
          resource: `evidence:${chunk.id}`,
        },
      };
    }

    // Check policy labels
    if (chunk.policyLabels) {
      for (const label of chunk.policyLabels) {
        const labelCheck = this.checkPolicyLabel(label, context);
        if (!labelCheck.allowed) {
          return {
            allowed: false,
            reason: labelCheck.reason,
            auditLog: {
              policyId: `label-${label}`,
              evaluatedAt: new Date().toISOString(),
              userId: context.userId,
              tenantId: context.tenantId,
              action: 'read',
              resource: `evidence:${chunk.id}`,
            },
          };
        }
        if (labelCheck.redactions) {
          redactions.push(...labelCheck.redactions);
        }
      }
    }

    // Check for PII requiring redaction
    const piiRedactions = this.detectPII(chunk.content);
    if (piiRedactions.length > 0 && !context.roles.includes('pii-viewer')) {
      redactions.push(...piiRedactions);
    }

    return {
      allowed: true,
      redactions: redactions.length > 0 ? redactions : undefined,
      auditLog: {
        policyId: 'local-policy',
        evaluatedAt: new Date().toISOString(),
        userId: context.userId,
        tenantId: context.tenantId,
        action: 'read',
        resource: `evidence:${chunk.id}`,
      },
    };
  }

  /**
   * Check policy label access
   */
  private checkPolicyLabel(
    label: string,
    context: PolicyContext,
  ): { allowed: boolean; reason?: string; redactions?: Array<{ field: string; reason: string }> } {
    const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    const userClearanceIndex = clearanceLevels.indexOf(context.clearanceLevel || 'UNCLASSIFIED');
    const labelClearanceIndex = clearanceLevels.indexOf(label);

    if (labelClearanceIndex > userClearanceIndex && labelClearanceIndex !== -1) {
      return {
        allowed: false,
        reason: `Insufficient clearance for ${label} material`,
      };
    }

    // Jurisdiction checks
    if (label.startsWith('JURISDICTION:')) {
      const requiredJurisdiction = label.replace('JURISDICTION:', '');
      if (context.jurisdiction !== requiredJurisdiction) {
        return {
          allowed: false,
          reason: `Access restricted to ${requiredJurisdiction} jurisdiction`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Detect PII in content
   */
  private detectPII(content: string): Array<{ field: string; reason: string }> {
    const redactions: Array<{ field: string; reason: string }> = [];

    // SSN pattern
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
      redactions.push({ field: 'ssn', reason: 'Social Security Number detected' });
    }

    // Credit card pattern
    if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(content)) {
      redactions.push({ field: 'credit_card', reason: 'Credit card number detected' });
    }

    // Email pattern (for sensitive contexts)
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
      redactions.push({ field: 'email', reason: 'Email address detected' });
    }

    // Phone pattern
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) {
      redactions.push({ field: 'phone', reason: 'Phone number detected' });
    }

    return redactions;
  }

  /**
   * Apply redactions to a chunk
   */
  applyRedactions(
    chunk: EvidenceChunk,
    redactions: Array<{ field: string; reason: string }>,
  ): EvidenceChunk {
    let redactedContent = chunk.content;

    for (const rule of this.redactionRules) {
      const shouldApply = redactions.some((r) =>
        rule.appliesTo.includes(r.field),
      );

      if (shouldApply) {
        if (typeof rule.pattern === 'string') {
          redactedContent = redactedContent.replace(
            new RegExp(rule.pattern, 'g'),
            rule.replacement,
          );
        } else {
          redactedContent = redactedContent.replace(rule.pattern, rule.replacement);
        }
      }
    }

    return {
      ...chunk,
      id: uuidv4(), // New ID for redacted version
      content: redactedContent,
      citations: chunk.citations.map((c) => ({
        ...c,
        content: this.redactCitationContent(c.content, redactions),
      })),
    };
  }

  /**
   * Redact citation content
   */
  private redactCitationContent(
    content: string,
    redactions: Array<{ field: string; reason: string }>,
  ): string {
    let redacted = content;

    for (const rule of this.redactionRules) {
      const shouldApply = redactions.some((r) =>
        rule.appliesTo.includes(r.field),
      );

      if (shouldApply) {
        if (typeof rule.pattern === 'string') {
          redacted = redacted.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
        } else {
          redacted = redacted.replace(rule.pattern, rule.replacement);
        }
      }
    }

    return redacted;
  }

  /**
   * Initialize default redaction rules
   */
  private initializeDefaultRedactionRules(): void {
    this.redactionRules = [
      {
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN REDACTED]',
        reason: 'SSN protection',
        appliesTo: ['ssn'],
      },
      {
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        replacement: '[CARD REDACTED]',
        reason: 'Credit card protection',
        appliesTo: ['credit_card'],
      },
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL REDACTED]',
        reason: 'Email protection',
        appliesTo: ['email'],
      },
      {
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        replacement: '[PHONE REDACTED]',
        reason: 'Phone protection',
        appliesTo: ['phone'],
      },
    ];
  }

  /**
   * Add custom redaction rule
   */
  addRedactionRule(rule: RedactionRule): void {
    this.redactionRules.push(rule);
  }

  /**
   * Log policy decision for audit
   */
  async logPolicyDecision(decision: PolicyDecision): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        CREATE (a:AuditLog {
          id: $id,
          policyId: $policyId,
          evaluatedAt: datetime($evaluatedAt),
          userId: $userId,
          tenantId: $tenantId,
          action: $action,
          resource: $resource,
          allowed: $allowed,
          reason: $reason
        })
        `,
        {
          id: uuidv4(),
          policyId: decision.auditLog.policyId,
          evaluatedAt: decision.auditLog.evaluatedAt,
          userId: decision.auditLog.userId,
          tenantId: decision.auditLog.tenantId,
          action: decision.auditLog.action,
          resource: decision.auditLog.resource,
          allowed: decision.allowed,
          reason: decision.reason || null,
        },
      );
    } finally {
      await session.close();
    }
  }
}
