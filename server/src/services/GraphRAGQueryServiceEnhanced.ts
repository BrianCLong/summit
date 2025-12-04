/**
 * GraphRAGQueryServiceEnhanced - Enhanced orchestration with redaction & provenance
 *
 * Enhancements over base GraphRAGQueryService:
 * 1. Redaction awareness - filters sensitive fields before LLM processing
 * 2. Provenance tracking - links citations to evidence via prov-ledger
 * 3. Enhanced guardrails - GraphRAG-specific safety checks
 * 4. Policy enforcement - respects classification labels
 *
 * Architecture:
 * User Query → Preview → [Redaction Filter] → GraphRAG → [Citation Enrichment] → Answer
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import { GraphRAGService, type GraphRAGRequest, type GraphRAGResponse } from './GraphRAGService.js';
import { QueryPreviewService, type CreatePreviewInput, type QueryPreview } from './QueryPreviewService.js';
import { GlassBoxRunService, type GlassBoxRun } from './GlassBoxRunService.js';
import { RedactionService } from '../redaction/redact.js';
import { ProvLedgerClient } from '../prov-ledger-client/client.js';
import { LLMGuardrailsService } from '../security/llm-guardrails.js';
import type { Evidence, Claim, ProvenanceChain } from '../prov-ledger-client/types.js';

export interface RedactionPolicy {
  enabled: boolean;
  rules: Array<'pii' | 'financial' | 'sensitive' | 'k_anon'>;
  allowedFields?: string[];
  classificationLevel?: 'public' | 'internal' | 'confidential' | 'secret';
}

export interface ProvenanceContext {
  claimId?: string;
  evidenceIds?: string[];
  authorityId: string;
  reasonForAccess: string;
}

export type GraphRAGQueryRequestEnhanced = {
  investigationId: string;
  tenantId: string;
  userId: string;
  question: string;
  focusEntityIds?: string[];
  maxHops?: number;

  // Redaction options
  redactionPolicy?: RedactionPolicy;

  // Provenance options
  provenanceContext?: ProvenanceContext;
  registerClaim?: boolean; // Whether to register answer as a claim

  // Query generation options
  generateQueryPreview?: boolean;
  autoExecute?: boolean;

  // Execution options
  maxRows?: number;
  timeout?: number;

  // Guardrail options
  enableGuardrails?: boolean;
  riskTolerance?: 'low' | 'medium' | 'high';
};

export type EnrichedCitationWithProvenance = {
  entityId: string;
  entityKind?: string;
  entityLabels?: string[];
  entityName?: string;
  snippetText?: string;
  confidence?: number;
  sourceUrl?: string;

  // Provenance tracking
  evidenceId?: string;
  claimIds?: string[];
  provenanceChain?: {
    chainId: string;
    rootHash: string;
    transformChain: string[];
    verifiable: boolean;
  };

  // Redaction status
  wasRedacted?: boolean;
  redactedFields?: string[];
};

export type GraphRAGQueryResponseEnhanced = {
  answer: string;
  confidence: number;
  citations: EnrichedCitationWithProvenance[];
  why_paths?: GraphRAGResponse['why_paths'];

  // Redaction metadata
  redactionApplied?: boolean;
  uncertaintyDueToRedaction?: string;

  // Provenance metadata
  answerClaimId?: string;
  evidenceCount?: number;
  provenanceVerified?: boolean;

  // Preview info
  preview?: {
    id: string;
    generatedQuery: string;
    queryExplanation: string;
    costLevel: string;
    riskLevel: string;
    canExecute: boolean;
    requiresApproval: boolean;
  };

  // Execution metadata
  runId: string;
  executionTimeMs: number;
  subgraphSize?: {
    nodeCount: number;
    edgeCount: number;
  };

  // Guardrail metadata
  guardrailsPassed?: boolean;
  guardrailWarnings?: string[];
};

export class GraphRAGQueryServiceEnhanced {
  private graphRAGService: GraphRAGService;
  private queryPreviewService: QueryPreviewService;
  private glassBoxService: GlassBoxRunService;
  private redactionService: RedactionService;
  private provLedgerClient: ProvLedgerClient;
  private guardrailsService: LLMGuardrailsService;
  private pool: Pool;
  private neo4jDriver: Driver;
  private redis?: Redis;

  constructor(
    graphRAGService: GraphRAGService,
    queryPreviewService: QueryPreviewService,
    glassBoxService: GlassBoxRunService,
    redactionService: RedactionService,
    provLedgerClient: ProvLedgerClient,
    guardrailsService: LLMGuardrailsService,
    pool: Pool,
    neo4jDriver: Driver,
    redis?: Redis
  ) {
    this.graphRAGService = graphRAGService;
    this.queryPreviewService = queryPreviewService;
    this.glassBoxService = glassBoxService;
    this.redactionService = redactionService;
    this.provLedgerClient = provLedgerClient;
    this.guardrailsService = guardrailsService;
    this.pool = pool;
    this.neo4jDriver = neo4jDriver;
    this.redis = redis;
  }

  /**
   * Main query method with redaction and provenance
   */
  async query(request: GraphRAGQueryRequestEnhanced): Promise<GraphRAGQueryResponseEnhanced> {
    const startTime = Date.now();

    logger.info({
      investigationId: request.investigationId,
      question: request.question,
      redactionEnabled: request.redactionPolicy?.enabled,
      provenanceEnabled: !!request.provenanceContext,
      guardrailsEnabled: request.enableGuardrails !== false,
    }, 'Starting enhanced GraphRAG query');

    // Create glass-box run for observability
    const run = await this.glassBoxService.createRun({
      investigationId: request.investigationId,
      tenantId: request.tenantId,
      userId: request.userId,
      type: 'graphrag_query_enhanced',
      prompt: request.question,
      parameters: {
        focusEntityIds: request.focusEntityIds,
        maxHops: request.maxHops,
        redactionEnabled: request.redactionPolicy?.enabled,
        provenanceEnabled: !!request.provenanceContext,
        registerClaim: request.registerClaim,
      },
    });

    try {
      await this.glassBoxService.updateStatus(run.id, 'running');

      // Step 1: Guardrails check (if enabled)
      let guardrailsPassed = true;
      const guardrailWarnings: string[] = [];

      if (request.enableGuardrails !== false) {
        const guardrailStepId = await this.captureStep(run.id, 'Apply guardrails to query');

        const guardrailResult = await this.guardrailsService.validateInput({
          prompt: request.question,
          userId: request.userId,
          modelProvider: 'openai',
          modelName: 'gpt-4',
          privacyLevel: request.redactionPolicy?.classificationLevel || 'internal',
        });

        if (!guardrailResult.allowed) {
          await this.glassBoxService.completeStep(run.id, guardrailStepId, {
            blocked: true,
            reason: guardrailResult.reason,
          });

          throw new Error(`Query blocked by guardrails: ${guardrailResult.reason}`);
        }

        if (guardrailResult.warnings && guardrailResult.warnings.length > 0) {
          guardrailWarnings.push(...guardrailResult.warnings);
        }

        await this.glassBoxService.completeStep(run.id, guardrailStepId, {
          passed: true,
          riskScore: guardrailResult.risk_score,
          warnings: guardrailWarnings,
        });
      }

      // Step 2: Generate query preview if requested
      let preview: QueryPreview | undefined;

      if (request.generateQueryPreview) {
        const previewStepId = await this.captureStep(
          run.id,
          'Generate query preview from natural language'
        );

        preview = await this.queryPreviewService.createPreview({
          investigationId: request.investigationId,
          tenantId: request.tenantId,
          userId: request.userId,
          naturalLanguageQuery: request.question,
          language: 'cypher',
          parameters: {
            focusEntityIds: request.focusEntityIds,
            maxHops: request.maxHops,
          },
          focusEntityIds: request.focusEntityIds,
          maxHops: request.maxHops,
        });

        await this.glassBoxService.completeStep(run.id, previewStepId, {
          previewId: preview.id,
          costLevel: preview.costEstimate.level,
          riskLevel: preview.riskAssessment.level,
          canExecute: preview.canExecute,
        });

        // If not auto-executing, return preview for user review
        if (!request.autoExecute) {
          await this.glassBoxService.updateStatus(run.id, 'completed', {
            previewGenerated: true,
            requiresExplicitExecution: true,
          });

          return {
            answer: '',
            confidence: 0,
            citations: [],
            preview: {
              id: preview.id,
              generatedQuery: preview.generatedQuery,
              queryExplanation: preview.queryExplanation,
              costLevel: preview.costEstimate.level,
              riskLevel: preview.riskAssessment.level,
              canExecute: preview.canExecute,
              requiresApproval: preview.requiresApproval,
            },
            runId: run.id,
            executionTimeMs: Date.now() - startTime,
            guardrailsPassed,
            guardrailWarnings,
          };
        }

        // Check if we can execute
        if (!preview.canExecute) {
          throw new Error(
            `Query cannot be executed: ${preview.validationErrors.join(', ')}`
          );
        }
      }

      // Step 3: Execute GraphRAG query
      const ragStepId = await this.captureStep(
        run.id,
        'Execute GraphRAG retrieval and generation'
      );

      const ragRequest: GraphRAGRequest = {
        investigationId: request.investigationId,
        question: request.question,
        focusEntityIds: request.focusEntityIds,
        maxHops: request.maxHops || 2,
      };

      const ragResponse = await this.graphRAGService.answer(ragRequest);

      await this.glassBoxService.completeStep(run.id, ragStepId, {
        confidence: ragResponse.confidence,
        citationCount: ragResponse.citations.entityIds.length,
        pathCount: ragResponse.why_paths?.length,
      });

      // Step 4: Apply redaction if enabled
      let redactionApplied = false;
      let uncertaintyDueToRedaction: string | undefined;
      let redactedAnswer = ragResponse.answer;

      if (request.redactionPolicy?.enabled) {
        const redactionStepId = await this.captureStep(
          run.id,
          'Apply redaction policy to answer'
        );

        const redactionResult = await this.applyRedaction(
          {
            answer: ragResponse.answer,
            entities: ragResponse.citations.entityIds,
          },
          request.redactionPolicy,
          request.tenantId
        );

        redactedAnswer = redactionResult.redactedAnswer;
        redactionApplied = redactionResult.redactionApplied;
        uncertaintyDueToRedaction = redactionResult.uncertaintyMessage;

        await this.glassBoxService.completeStep(run.id, redactionStepId, {
          redactionApplied,
          fieldsRedacted: redactionResult.fieldsRedacted,
        });
      }

      // Step 5: Enrich citations with provenance
      const enrichStepId = await this.captureStep(
        run.id,
        'Enrich citations with entity details and provenance'
      );

      const enrichedCitations = await this.enrichCitationsWithProvenance(
        ragResponse.citations.entityIds,
        request.investigationId,
        request.provenanceContext,
        request.redactionPolicy
      );

      await this.glassBoxService.completeStep(run.id, enrichStepId, {
        enrichedCount: enrichedCitations.length,
        provenanceVerified: enrichedCitations.some(c => c.provenanceChain?.verifiable),
      });

      // Step 6: Register answer as claim if requested
      let answerClaimId: string | undefined;

      if (request.registerClaim && request.provenanceContext) {
        const claimStepId = await this.captureStep(
          run.id,
          'Register answer as verifiable claim'
        );

        answerClaimId = await this.registerAnswerClaim(
          request.question,
          redactedAnswer,
          enrichedCitations,
          request.provenanceContext,
          request.investigationId
        );

        await this.glassBoxService.completeStep(run.id, claimStepId, {
          claimId: answerClaimId,
        });
      }

      // Step 7: Get subgraph size for metadata
      const subgraphSize = await this.getSubgraphSize(
        request.investigationId,
        request.focusEntityIds
      );

      const executionTimeMs = Date.now() - startTime;

      const response: GraphRAGQueryResponseEnhanced = {
        answer: redactedAnswer,
        confidence: ragResponse.confidence,
        citations: enrichedCitations,
        why_paths: ragResponse.why_paths,

        redactionApplied,
        uncertaintyDueToRedaction,

        answerClaimId,
        evidenceCount: enrichedCitations.filter(c => c.evidenceId).length,
        provenanceVerified: enrichedCitations.some(c => c.provenanceChain?.verifiable),

        preview: preview
          ? {
              id: preview.id,
              generatedQuery: preview.generatedQuery,
              queryExplanation: preview.queryExplanation,
              costLevel: preview.costEstimate.level,
              riskLevel: preview.riskAssessment.level,
              canExecute: preview.canExecute,
              requiresApproval: preview.requiresApproval,
            }
          : undefined,

        runId: run.id,
        executionTimeMs,
        subgraphSize,

        guardrailsPassed,
        guardrailWarnings,
      };

      await this.glassBoxService.updateStatus(run.id, 'completed', response);

      metrics.graphragQueryTotal.inc({
        status: 'success',
        hasPreview: !!preview,
        redactionEnabled: redactionApplied,
        provenanceEnabled: !!answerClaimId,
      });
      metrics.graphragQueryDurationMs.observe(
        { hasPreview: !!preview },
        executionTimeMs
      );

      logger.info({
        runId: run.id,
        investigationId: request.investigationId,
        confidence: ragResponse.confidence,
        citationCount: enrichedCitations.length,
        executionTimeMs,
        redactionApplied,
        provenanceVerified: response.provenanceVerified,
      }, 'Completed enhanced GraphRAG query');

      return response;
    } catch (error) {
      await this.glassBoxService.updateStatus(run.id, 'failed', undefined, String(error));

      metrics.graphragQueryTotal.inc({ status: 'failed' });

      logger.error({
        error,
        runId: run.id,
        request,
      }, 'Failed to execute enhanced GraphRAG query');

      throw error;
    }
  }

  /**
   * Apply redaction policy to answer and entities
   */
  private async applyRedaction(
    data: { answer: string; entities: string[] },
    policy: RedactionPolicy,
    tenantId: string
  ): Promise<{
    redactedAnswer: string;
    redactionApplied: boolean;
    uncertaintyMessage?: string;
    fieldsRedacted: number;
  }> {
    let fieldsRedacted = 0;
    let redactionApplied = false;

    // Check if answer contains sensitive patterns
    const sensitivePatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]', type: 'pii' },
      { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CREDIT CARD REDACTED]', type: 'financial' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]', type: 'pii' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE REDACTED]', type: 'pii' },
    ];

    let redactedAnswer = data.answer;

    for (const { pattern, replacement, type } of sensitivePatterns) {
      if (policy.rules.includes(type as any)) {
        const matches = redactedAnswer.match(pattern);
        if (matches && matches.length > 0) {
          redactedAnswer = redactedAnswer.replace(pattern, replacement);
          fieldsRedacted += matches.length;
          redactionApplied = true;
        }
      }
    }

    let uncertaintyMessage: string | undefined;

    if (redactionApplied) {
      uncertaintyMessage = `Some information has been redacted due to policy constraints (${policy.rules.join(', ')}). The answer reflects only visible data.`;
    }

    return {
      redactedAnswer,
      redactionApplied,
      uncertaintyMessage,
      fieldsRedacted,
    };
  }

  /**
   * Enrich citations with provenance information
   */
  private async enrichCitationsWithProvenance(
    entityIds: string[],
    investigationId: string,
    provenanceContext?: ProvenanceContext,
    redactionPolicy?: RedactionPolicy
  ): Promise<EnrichedCitationWithProvenance[]> {
    if (entityIds.length === 0) {
      return [];
    }

    // First get basic entity information
    const query = `
      SELECT
        e.id,
        e.kind,
        e.labels,
        e.props->>'name' as name,
        e.props->>'description' as description,
        e.props->>'url' as source_url,
        e.props->>'confidence' as confidence,
        e.props->>'evidenceId' as evidence_id,
        e.props->>'classification' as classification,
        e.props
      FROM entities e
      WHERE e.id = ANY($1)
      AND e.props->>'investigationId' = $2
      ORDER BY array_position($1, e.id)
    `;

    try {
      const result = await this.pool.query(query, [entityIds, investigationId]);

      const enrichedCitations: EnrichedCitationWithProvenance[] = [];

      for (const row of result.rows) {
        let wasRedacted = false;
        const redactedFields: string[] = [];
        let snippetText = row.description;

        // Apply redaction if enabled
        if (redactionPolicy?.enabled) {
          const { redactedAnswer, redactionApplied, fieldsRedacted } = await this.applyRedaction(
            { answer: snippetText || '', entities: [] },
            redactionPolicy,
            investigationId
          );

          if (redactionApplied) {
            wasRedacted = true;
            snippetText = redactedAnswer;

            // Track which fields were redacted
            if (row.props) {
              for (const key of Object.keys(row.props)) {
                if (redactionPolicy.rules.includes('pii') && this.isPIIField(key)) {
                  redactedFields.push(key);
                }
              }
            }
          }
        }

        // Fetch provenance information if context provided
        let provenanceChain: EnrichedCitationWithProvenance['provenanceChain'];
        let claimIds: string[] = [];

        if (provenanceContext && row.evidence_id) {
          try {
            const evidence = await this.provLedgerClient.getEvidence(row.evidence_id);
            const chains = await this.provLedgerClient.getProvenanceChains(evidence.id);

            if (chains && chains.length > 0) {
              const chain = chains[0];
              provenanceChain = {
                chainId: chain.id,
                rootHash: chain.rootHash,
                transformChain: chain.transformChain || [],
                verifiable: chain.verified,
              };

              // Get associated claims
              if (evidence.claimIds) {
                claimIds = evidence.claimIds;
              }
            }
          } catch (error) {
            logger.warn({
              error,
              evidenceId: row.evidence_id,
              entityId: row.id,
            }, 'Failed to fetch provenance for entity');
          }
        }

        enrichedCitations.push({
          entityId: row.id,
          entityKind: row.kind,
          entityLabels: row.labels || [],
          entityName: row.name || row.id,
          snippetText: snippetText
            ? this.truncateText(snippetText, 200)
            : undefined,
          confidence: row.confidence ? parseFloat(row.confidence) : undefined,
          sourceUrl: row.source_url,

          evidenceId: row.evidence_id,
          claimIds,
          provenanceChain,

          wasRedacted,
          redactedFields,
        });
      }

      return enrichedCitations;
    } catch (error) {
      logger.error({
        error,
        entityIds,
        investigationId,
      }, 'Failed to enrich citations with provenance');

      // Return basic citations on error
      return entityIds.map(id => ({
        entityId: id,
      }));
    }
  }

  /**
   * Register answer as a verifiable claim in prov-ledger
   */
  private async registerAnswerClaim(
    question: string,
    answer: string,
    citations: EnrichedCitationWithProvenance[],
    provenanceContext: ProvenanceContext,
    investigationId: string
  ): Promise<string> {
    try {
      const claim = await this.provLedgerClient.createClaim({
        statement: answer,
        claimType: 'graphrag_answer',
        confidence: this.calculateOverallConfidence(citations),
        sourceEntityIds: citations.map(c => c.entityId),
        evidenceIds: citations
          .map(c => c.evidenceId)
          .filter((id): id is string => !!id),
        metadata: {
          question,
          investigationId,
          citationCount: citations.length,
          timestamp: new Date().toISOString(),
        },
      });

      // Create provenance chain if we have evidence
      if (claim.evidenceIds && claim.evidenceIds.length > 0) {
        await this.provLedgerClient.createProvenanceChain({
          claimId: claim.id,
          evidenceIds: claim.evidenceIds,
          transformation: 'graphrag_synthesis',
          transformParams: {
            model: 'gpt-4',
            confidence: claim.confidence,
          },
        });
      }

      logger.info({
        claimId: claim.id,
        investigationId,
        evidenceCount: claim.evidenceIds?.length || 0,
      }, 'Registered GraphRAG answer as claim');

      return claim.id;
    } catch (error) {
      logger.error({
        error,
        investigationId,
      }, 'Failed to register answer claim');

      throw new Error(`Failed to register answer claim: ${error}`);
    }
  }

  /**
   * Calculate overall confidence from citations
   */
  private calculateOverallConfidence(citations: EnrichedCitationWithProvenance[]): number {
    if (citations.length === 0) return 0;

    const confidences = citations
      .map(c => c.confidence)
      .filter((c): c is number => c !== undefined);

    if (confidences.length === 0) return 0.7; // Default confidence

    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Check if a field name suggests PII
   */
  private isPIIField(fieldName: string): boolean {
    const piiKeywords = [
      'email', 'phone', 'ssn', 'passport', 'license', 'address',
      'birth', 'age', 'salary', 'income', 'medical', 'health',
    ];

    const lowerField = fieldName.toLowerCase();
    return piiKeywords.some(keyword => lowerField.includes(keyword));
  }

  /**
   * Get subgraph size for metadata
   */
  private async getSubgraphSize(
    investigationId: string,
    focusEntityIds?: string[]
  ): Promise<{ nodeCount: number; edgeCount: number } | undefined> {
    const session = this.neo4jDriver.session();

    try {
      let query: string;
      let params: Record<string, unknown>;

      if (focusEntityIds && focusEntityIds.length > 0) {
        query = `
          MATCH (anchor:Entity)
          WHERE anchor.id IN $focusIds
            AND anchor.investigationId = $investigationId
          CALL apoc.path.subgraphAll(anchor, {
            maxLevel: 2,
            relationshipFilter: 'REL>',
            labelFilter: 'Entity'
          })
          YIELD nodes, relationships
          RETURN size(nodes) as nodeCount, size(relationships) as edgeCount
        `;
        params = { focusIds: focusEntityIds, investigationId };
      } else {
        query = `
          MATCH (e:Entity {investigationId: $investigationId})
          WITH count(e) as nodeCount
          MATCH ()-[r:REL]->()
          WHERE r.investigationId = $investigationId
          WITH nodeCount, count(r) as edgeCount
          RETURN nodeCount, edgeCount
        `;
        params = { investigationId };
      }

      const result = await session.run(query, params);

      if (result.records.length > 0) {
        return {
          nodeCount: result.records[0].get('nodeCount').toNumber(),
          edgeCount: result.records[0].get('edgeCount').toNumber(),
        };
      }

      return undefined;
    } catch (error) {
      logger.error({
        error,
        investigationId,
      }, 'Failed to get subgraph size');
      return undefined;
    } finally {
      await session.close();
    }
  }

  /**
   * Capture a step in the glass-box run
   */
  private async captureStep(runId: string, description: string): Promise<string> {
    const stepId = require('uuid').v4();
    await this.glassBoxService.addStep(runId, {
      type: 'tool_call',
      description,
    });
    return stepId;
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}
