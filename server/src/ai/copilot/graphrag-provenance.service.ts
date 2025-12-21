/**
 * GraphRAG Provenance Service
 *
 * Enhanced retrieval-augmented generation that:
 * - Integrates with the Prov-Ledger service for evidence/claim citations
 * - Returns answers with full provenance chains
 * - Links citations to graph entities and evidence records
 * - Ensures every answer includes proper attributions
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import { z } from 'zod';
import type { Driver, Session } from 'neo4j-driver';

import {
  type GraphRAGRequest,
  type CopilotAnswer,
  type Citation,
  type Provenance,
  type WhyPath,
  type RedactionStatus,
  type GuardrailCheck,
  GraphRAGRequestSchema,
  CitationSchema,
  SourceTypeSchema,
} from './types.js';

const logger = pino({ name: 'graphrag-provenance' });

// Configuration
const PROV_LEDGER_URL =
  process.env.PROV_LEDGER_URL || 'http://localhost:4010';
const MIN_CITATION_CONFIDENCE = parseFloat(
  process.env.COPILOT_MIN_CITATION_CONFIDENCE || '0.5',
);
const MAX_CITATIONS_PER_ANSWER = parseInt(
  process.env.COPILOT_MAX_CITATIONS || '20',
  10,
);

/**
 * Entity from the knowledge graph
 */
interface GraphEntity {
  id: string;
  type: string;
  label: string;
  description?: string;
  properties: Record<string, any>;
  confidence: number;
  investigationId: string;
  policyLabels?: string[];
}

/**
 * Relationship from the knowledge graph
 */
interface GraphRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  label?: string;
  properties: Record<string, any>;
  confidence: number;
}

/**
 * Evidence record from prov-ledger
 */
interface Evidence {
  id: string;
  sourceRef: string;
  checksum: string;
  contentType?: string;
  policyLabels: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Claim record from prov-ledger
 */
interface Claim {
  id: string;
  content: Record<string, any>;
  hash: string;
  sourceRef?: string;
  policyLabels: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Subgraph context with provenance
 */
interface SubgraphContext {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  evidence: Evidence[];
  claims: Claim[];
  subgraphHash: string;
}

/**
 * LLM service interface
 */
interface LLMService {
  complete(params: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'json';
  }): Promise<string>;
}

/**
 * GraphRAG Provenance Service
 */
export class GraphRAGProvenanceService {
  private readonly neo4jDriver: Driver;
  private readonly llmService: LLMService;
  private readonly provLedgerUrl: string;

  constructor(
    neo4jDriver: Driver,
    llmService: LLMService,
    provLedgerUrl?: string,
  ) {
    this.neo4jDriver = neo4jDriver;
    this.llmService = llmService;
    this.provLedgerUrl = provLedgerUrl || PROV_LEDGER_URL;
  }

  /**
   * Answer a question with full provenance citations
   */
  async answer(request: GraphRAGRequest): Promise<CopilotAnswer> {
    const validated = GraphRAGRequestSchema.parse(request);
    const answerId = randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        answerId,
        investigationId: validated.investigationId,
        questionLength: validated.question.length,
      },
      'Processing GraphRAG request with provenance',
    );

    try {
      // Step 1: Retrieve subgraph context
      const context = await this.retrieveContext(validated);

      // Step 2: Fetch linked evidence and claims
      if (validated.includeEvidence) {
        context.evidence = await this.fetchEvidence(
          validated.investigationId,
          context.entities.map((e) => e.id),
        );
      }

      if (validated.includeClaims) {
        context.claims = await this.fetchClaims(
          validated.investigationId,
          context.entities.map((e) => e.id),
        );
      }

      // Step 3: Generate answer with citations
      const llmResponse = await this.generateAnswer(
        validated.question,
        context,
        validated,
      );

      // Step 4: Build citations from the response and context
      const citations = this.buildCitations(
        llmResponse.citedEntityIds,
        llmResponse.citedEvidenceIds,
        llmResponse.citedClaimIds,
        context,
      );

      // Step 5: Build provenance chain
      const provenance = this.buildProvenance(
        llmResponse.citedEntityIds,
        llmResponse.citedRelationshipIds,
        llmResponse.citedEvidenceIds,
        llmResponse.citedClaimIds,
        llmResponse.confidence,
      );

      // Step 6: Build why paths
      const whyPaths = this.buildWhyPaths(
        llmResponse.reasoningPaths,
        context,
      );

      // Step 7: Determine redaction status
      const redaction = this.getRedactionStatus(context, citations);

      // Step 8: Run guardrail checks
      const guardrails = this.runGuardrailChecks(
        llmResponse.answer,
        citations,
        provenance,
      );

      const executionTime = Date.now() - startTime;

      const answer: CopilotAnswer = {
        answerId,
        answer: llmResponse.answer,
        confidence: llmResponse.confidence,
        citations,
        provenance,
        whyPaths,
        redaction,
        guardrails,
        generatedAt: new Date().toISOString(),
        investigationId: validated.investigationId,
        originalQuery: validated.question,
        warnings: this.generateWarnings(
          citations,
          provenance,
          redaction,
          executionTime,
        ),
      };

      logger.info(
        {
          answerId,
          executionTimeMs: executionTime,
          citationCount: citations.length,
          confidence: llmResponse.confidence,
          guardrailsPassed: guardrails.passed,
        },
        'GraphRAG answer generated',
      );

      return answer;
    } catch (error) {
      logger.error(
        {
          answerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'GraphRAG answer generation failed',
      );
      throw error;
    }
  }

  /**
   * Retrieve subgraph context from Neo4j
   */
  private async retrieveContext(
    request: GraphRAGRequest,
  ): Promise<SubgraphContext> {
    const session = this.neo4jDriver.session({
      defaultAccessMode: 'READ',
    });

    try {
      const { investigationId, focusEntityIds = [], maxHops = 2 } = request;

      let cypher: string;
      let params: Record<string, any>;

      if (focusEntityIds.length > 0) {
        // Focused retrieval
        cypher = `
          MATCH (anchor:Entity)
          WHERE anchor.id IN $focusIds
            AND anchor.investigationId = $investigationId
          CALL apoc.path.subgraphAll(anchor, {
            maxLevel: $maxHops,
            relationshipFilter: null,
            labelFilter: 'Entity'
          }) YIELD nodes, relationships
          WITH collect(DISTINCT nodes) as nodeArrays,
               collect(DISTINCT relationships) as relArrays
          UNWIND apoc.coll.flatten(nodeArrays) as node
          UNWIND apoc.coll.flatten(relArrays) as rel
          WITH collect(DISTINCT node) as allNodes,
               collect(DISTINCT rel) as allRels
          RETURN allNodes as nodes, allRels as relationships
        `;
        params = { focusIds: focusEntityIds, investigationId, maxHops };
      } else {
        // General retrieval - get top entities by confidence
        cypher = `
          MATCH (e:Entity {investigationId: $investigationId})
          WITH e ORDER BY e.confidence DESC, e.createdAt DESC LIMIT 20
          OPTIONAL MATCH path = (e)-[r*..${maxHops}]-(connected:Entity)
          WHERE connected.investigationId = $investigationId
          WITH collect(DISTINCT e) + collect(DISTINCT connected) as nodes,
               [p IN collect(path) | relationships(p)] as relArrays
          UNWIND apoc.coll.flatten(relArrays) as rel
          WITH nodes, collect(DISTINCT rel) as relationships
          RETURN nodes, relationships
        `;
        params = { investigationId, maxHops };
      }

      const result = await session.run(cypher, params);

      const entities: GraphEntity[] = [];
      const relationships: GraphRelationship[] = [];

      if (result.records.length > 0) {
        const record = result.records[0];
        const nodes = record.get('nodes') || [];
        const rels = record.get('relationships') || [];

        for (const node of nodes) {
          if (node && node.properties) {
            entities.push({
              id: node.properties.id,
              type: node.properties.type || node.labels?.[0] || 'Entity',
              label: node.properties.label || node.properties.name || node.properties.id,
              description: node.properties.description,
              properties: { ...node.properties },
              confidence: node.properties.confidence || 1.0,
              investigationId: node.properties.investigationId,
              policyLabels: node.properties.policyLabels,
            });
          }
        }

        for (const rel of rels) {
          if (rel && rel.properties) {
            relationships.push({
              id: rel.properties.id || `rel_${rel.identity}`,
              type: rel.type,
              sourceId: rel.properties.sourceId || rel.start?.toString(),
              targetId: rel.properties.targetId || rel.end?.toString(),
              label: rel.properties.label,
              properties: { ...rel.properties },
              confidence: rel.properties.confidence || 1.0,
            });
          }
        }
      }

      // Compute subgraph hash
      const subgraphHash = this.hashSubgraph(entities, relationships);

      return {
        entities,
        relationships,
        evidence: [],
        claims: [],
        subgraphHash,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Fetch evidence from prov-ledger
   */
  private async fetchEvidence(
    investigationId: string,
    entityIds: string[],
  ): Promise<Evidence[]> {
    try {
      // Note: In production, this would query the prov-ledger service
      // For now, we'll query linked evidence from the graph
      const session = this.neo4jDriver.session({
        defaultAccessMode: 'READ',
      });

      try {
        const result = await session.run(
          `
          MATCH (e:Entity)-[:HAS_EVIDENCE]->(ev:Evidence)
          WHERE e.id IN $entityIds
            AND e.investigationId = $investigationId
          RETURN ev
          LIMIT 50
          `,
          { entityIds, investigationId },
        );

        return result.records.map((record) => {
          const ev = record.get('ev');
          return {
            id: ev.properties.id,
            sourceRef: ev.properties.sourceRef,
            checksum: ev.properties.checksum,
            contentType: ev.properties.contentType,
            policyLabels: ev.properties.policyLabels || [],
            metadata: ev.properties.metadata,
            created_at: ev.properties.created_at,
          };
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to fetch evidence',
      );
      return [];
    }
  }

  /**
   * Fetch claims from prov-ledger
   */
  private async fetchClaims(
    investigationId: string,
    entityIds: string[],
  ): Promise<Claim[]> {
    try {
      // Note: In production, this would query the prov-ledger service
      const session = this.neo4jDriver.session({
        defaultAccessMode: 'READ',
      });

      try {
        const result = await session.run(
          `
          MATCH (e:Entity)-[:SUPPORTS]->(c:Claim)
          WHERE e.id IN $entityIds
            AND e.investigationId = $investigationId
          RETURN c
          LIMIT 50
          `,
          { entityIds, investigationId },
        );

        return result.records.map((record) => {
          const c = record.get('c');
          return {
            id: c.properties.id,
            content: c.properties.content,
            hash: c.properties.hash,
            sourceRef: c.properties.sourceRef,
            policyLabels: c.properties.policyLabels || [],
            metadata: c.properties.metadata,
            created_at: c.properties.created_at,
          };
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to fetch claims',
      );
      return [];
    }
  }

  /**
   * Generate answer using LLM
   */
  private async generateAnswer(
    question: string,
    context: SubgraphContext,
    request: GraphRAGRequest,
  ): Promise<{
    answer: string;
    confidence: number;
    citedEntityIds: string[];
    citedRelationshipIds: string[];
    citedEvidenceIds: string[];
    citedClaimIds: string[];
    reasoningPaths: Array<{
      from: string;
      to: string;
      relationshipId: string;
      explanation: string;
    }>;
  }> {
    const prompt = this.buildPrompt(question, context);

    const rawResponse = await this.llmService.complete({
      prompt,
      maxTokens: request.maxTokens || 1000,
      temperature: request.temperature || 0,
      responseFormat: 'json',
    });

    try {
      const parsed = JSON.parse(rawResponse);

      // Validate cited IDs exist in context
      const validEntityIds = new Set(context.entities.map((e) => e.id));
      const validRelIds = new Set(context.relationships.map((r) => r.id));
      const validEvidenceIds = new Set(context.evidence.map((e) => e.id));
      const validClaimIds = new Set(context.claims.map((c) => c.id));

      const citedEntityIds = (parsed.cited_entities || []).filter(
        (id: string) => validEntityIds.has(id),
      );
      const citedRelationshipIds = (parsed.cited_relationships || []).filter(
        (id: string) => validRelIds.has(id),
      );
      const citedEvidenceIds = (parsed.cited_evidence || []).filter(
        (id: string) => validEvidenceIds.has(id),
      );
      const citedClaimIds = (parsed.cited_claims || []).filter(
        (id: string) => validClaimIds.has(id),
      );

      // Validate reasoning paths
      const reasoningPaths = (parsed.reasoning_paths || [])
        .filter(
          (path: any) =>
            validEntityIds.has(path.from) &&
            validEntityIds.has(path.to) &&
            validRelIds.has(path.relationship_id),
        )
        .map((path: any) => ({
          from: path.from,
          to: path.to,
          relationshipId: path.relationship_id,
          explanation: path.explanation || '',
        }));

      return {
        answer: parsed.answer || 'Unable to generate answer.',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
        citedEntityIds,
        citedRelationshipIds,
        citedEvidenceIds,
        citedClaimIds,
        reasoningPaths,
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to parse LLM response',
      );

      // Return minimal response
      return {
        answer:
          'I was unable to generate a complete answer based on the available context.',
        confidence: 0,
        citedEntityIds: [],
        citedRelationshipIds: [],
        citedEvidenceIds: [],
        citedClaimIds: [],
        reasoningPaths: [],
      };
    }
  }

  /**
   * Build the LLM prompt with context
   */
  private buildPrompt(question: string, context: SubgraphContext): string {
    // Build entity context
    const entityContext = context.entities
      .slice(0, 50)
      .map(
        (e) =>
          `Entity [${e.id}]: ${e.label} (${e.type})${e.description ? ` - ${e.description}` : ''}`,
      )
      .join('\n');

    // Build relationship context
    const relationshipContext = context.relationships
      .slice(0, 50)
      .map((r) => `Relationship [${r.id}]: ${r.sourceId} --[${r.type}]--> ${r.targetId}`)
      .join('\n');

    // Build evidence context
    const evidenceContext =
      context.evidence.length > 0
        ? context.evidence
            .slice(0, 20)
            .map((e) => `Evidence [${e.id}]: ${e.sourceRef} (${e.contentType || 'unknown'})`)
            .join('\n')
        : 'No direct evidence available.';

    // Build claims context
    const claimsContext =
      context.claims.length > 0
        ? context.claims
            .slice(0, 20)
            .map((c) => `Claim [${c.id}]: ${JSON.stringify(c.content).substring(0, 200)}`)
            .join('\n')
        : 'No claims available.';

    return `You are an intelligence analyst with access to a knowledge graph.
Answer the user's question based ONLY on the provided context.
You MUST cite specific entity IDs, relationship IDs, evidence IDs, and claim IDs that support your answer.

CONTEXT ENTITIES:
${entityContext}

CONTEXT RELATIONSHIPS:
${relationshipContext}

EVIDENCE:
${evidenceContext}

CLAIMS:
${claimsContext}

USER QUESTION: ${question}

RESPONSE REQUIREMENTS:
- Respond with valid JSON
- Include ALL entity/relationship/evidence/claim IDs that support your answer
- Provide reasoning paths showing how you derived connections
- Set confidence based on how well the context supports your answer
- If context is insufficient, say so clearly and set low confidence
- NEVER include information not found in the context

Response format (JSON):
{
  "answer": "Your comprehensive answer here",
  "confidence": 0.0-1.0,
  "cited_entities": ["entity_id_1", "entity_id_2"],
  "cited_relationships": ["rel_id_1"],
  "cited_evidence": ["evidence_id_1"],
  "cited_claims": ["claim_id_1"],
  "reasoning_paths": [
    {
      "from": "entity_id_1",
      "to": "entity_id_2",
      "relationship_id": "rel_id_1",
      "explanation": "Why this connection supports the answer"
    }
  ]
}

Respond with JSON only:`;
  }

  /**
   * Build citations from cited IDs
   */
  private buildCitations(
    entityIds: string[],
    evidenceIds: string[],
    claimIds: string[],
    context: SubgraphContext,
  ): Citation[] {
    const citations: Citation[] = [];
    let citationIndex = 1;

    // Add entity citations
    for (const entityId of entityIds) {
      const entity = context.entities.find((e) => e.id === entityId);
      if (entity && citations.length < MAX_CITATIONS_PER_ANSWER) {
        citations.push({
          id: `[${citationIndex++}]`,
          sourceType: 'graph_entity',
          sourceId: entity.id,
          label: entity.label,
          excerpt: entity.description,
          confidence: entity.confidence,
          policyLabels: entity.policyLabels,
          wasRedacted: false,
        });
      }
    }

    // Add evidence citations
    for (const evidenceId of evidenceIds) {
      const evidence = context.evidence.find((e) => e.id === evidenceId);
      if (evidence && citations.length < MAX_CITATIONS_PER_ANSWER) {
        citations.push({
          id: `[${citationIndex++}]`,
          sourceType: 'evidence',
          sourceId: evidence.id,
          label: evidence.sourceRef,
          excerpt: evidence.metadata?.excerpt,
          confidence: 1.0, // Evidence is factual
          link: `/evidence/${evidence.id}`,
          policyLabels: evidence.policyLabels,
          wasRedacted: false,
        });
      }
    }

    // Add claim citations
    for (const claimId of claimIds) {
      const claim = context.claims.find((c) => c.id === claimId);
      if (claim && citations.length < MAX_CITATIONS_PER_ANSWER) {
        const claimContent =
          typeof claim.content === 'string'
            ? claim.content
            : JSON.stringify(claim.content).substring(0, 200);

        citations.push({
          id: `[${citationIndex++}]`,
          sourceType: 'claim',
          sourceId: claim.id,
          label: `Claim: ${claimContent.substring(0, 50)}...`,
          excerpt: claimContent,
          confidence: 0.9, // Claims have high but not absolute confidence
          link: `/claims/${claim.id}`,
          policyLabels: claim.policyLabels,
          wasRedacted: false,
        });
      }
    }

    return citations;
  }

  /**
   * Build provenance chain
   */
  private buildProvenance(
    entityIds: string[],
    relationshipIds: string[],
    evidenceIds: string[],
    claimIds: string[],
    confidence: number,
  ): Provenance {
    return {
      evidenceIds,
      claimIds,
      entityIds,
      relationshipIds,
      chainConfidence: confidence,
    };
  }

  /**
   * Build why paths from reasoning paths
   */
  private buildWhyPaths(
    reasoningPaths: Array<{
      from: string;
      to: string;
      relationshipId: string;
      explanation: string;
    }>,
    context: SubgraphContext,
  ): WhyPath[] {
    return reasoningPaths.map((path) => {
      const rel = context.relationships.find(
        (r) => r.id === path.relationshipId,
      );

      return {
        from: path.from,
        to: path.to,
        relationshipId: path.relationshipId,
        relationshipType: rel?.type || 'UNKNOWN',
        supportScore: rel?.confidence || 0.5,
        explanation: path.explanation,
      };
    });
  }

  /**
   * Get redaction status
   */
  private getRedactionStatus(
    context: SubgraphContext,
    citations: Citation[],
  ): RedactionStatus {
    // Check for redacted content
    const entitiesWithPolicyLabels = context.entities.filter(
      (e) => e.policyLabels && e.policyLabels.length > 0,
    );
    const evidenceWithPolicyLabels = context.evidence.filter(
      (e) => e.policyLabels && e.policyLabels.length > 0,
    );

    const redactedCitations = citations.filter((c) => c.wasRedacted);

    const wasRedacted = redactedCitations.length > 0;
    const uncertaintyAcknowledged =
      entitiesWithPolicyLabels.length > 0 ||
      evidenceWithPolicyLabels.length > 0;

    return {
      wasRedacted,
      redactedCount: redactedCitations.length,
      redactionTypes: wasRedacted ? ['policy_label_filter'] : [],
      uncertaintyAcknowledged,
    };
  }

  /**
   * Run guardrail checks
   */
  private runGuardrailChecks(
    answer: string,
    citations: Citation[],
    provenance: Provenance,
  ): GuardrailCheck {
    const checks: Array<{ name: string; passed: boolean; reason?: string }> = [];

    // Check 1: Answer must have citations
    const hasCitations = citations.length > 0;
    checks.push({
      name: 'has_citations',
      passed: hasCitations,
      reason: hasCitations ? undefined : 'No citations found for answer',
    });

    // Check 2: Provenance must include at least one entity
    const hasEntityProvenance = provenance.entityIds.length > 0;
    checks.push({
      name: 'has_entity_provenance',
      passed: hasEntityProvenance,
      reason: hasEntityProvenance ? undefined : 'No entity provenance',
    });

    // Check 3: Answer must not be empty
    const hasContent = answer.trim().length > 10;
    checks.push({
      name: 'has_content',
      passed: hasContent,
      reason: hasContent ? undefined : 'Answer is too short',
    });

    // Check 4: Confidence must be reasonable
    const hasReasonableConfidence = provenance.chainConfidence >= 0;
    checks.push({
      name: 'reasonable_confidence',
      passed: hasReasonableConfidence,
      reason: hasReasonableConfidence ? undefined : 'Invalid confidence value',
    });

    const passed = checks.every((c) => c.passed);
    const failedCheck = checks.find((c) => !c.passed);

    return {
      passed,
      checks,
      failureReason: passed ? undefined : failedCheck?.reason,
    };
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    citations: Citation[],
    provenance: Provenance,
    redaction: RedactionStatus,
    executionTimeMs: number,
  ): string[] {
    const warnings: string[] = [];

    if (citations.length === 0) {
      warnings.push(
        'This answer has no citations - consider it unverified.',
      );
    }

    if (provenance.chainConfidence < MIN_CITATION_CONFIDENCE) {
      warnings.push(
        `Low confidence answer (${(provenance.chainConfidence * 100).toFixed(0)}%)`,
      );
    }

    if (redaction.wasRedacted) {
      warnings.push(
        `Some content was redacted (${redaction.redactedCount} items) due to policy labels.`,
      );
    }

    if (redaction.uncertaintyAcknowledged) {
      warnings.push(
        'Some source data has policy restrictions that may limit completeness.',
      );
    }

    if (executionTimeMs > 5000) {
      warnings.push(
        `Slow response time (${(executionTimeMs / 1000).toFixed(1)}s) - consider refining your query.`,
      );
    }

    return warnings;
  }

  /**
   * Compute hash for subgraph
   */
  private hashSubgraph(
    entities: GraphEntity[],
    relationships: GraphRelationship[],
  ): string {
    const crypto = require('crypto');
    const content = JSON.stringify({
      entities: entities.map((e) => e.id).sort(),
      relationships: relationships.map((r) => r.id).sort(),
    });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    neo4j: boolean;
    provLedger: boolean;
  }> {
    let neo4jHealthy = false;
    let provLedgerHealthy = false;

    // Check Neo4j
    try {
      const session = this.neo4jDriver.session();
      await session.run('RETURN 1');
      await session.close();
      neo4jHealthy = true;
    } catch (error) {
      logger.error({ error }, 'Neo4j health check failed');
    }

    // Check prov-ledger
    try {
      const response = await fetch(`${this.provLedgerUrl}/health`);
      provLedgerHealthy = response.ok;
    } catch (error) {
      logger.warn({ error }, 'Prov-ledger health check failed');
    }

    return {
      healthy: neo4jHealthy,
      neo4j: neo4jHealthy,
      provLedger: provLedgerHealthy,
    };
  }
}

/**
 * Create a GraphRAG provenance service
 */
export function createGraphRAGProvenanceService(
  neo4jDriver: Driver,
  llmService: LLMService,
  provLedgerUrl?: string,
): GraphRAGProvenanceService {
  return new GraphRAGProvenanceService(neo4jDriver, llmService, provLedgerUrl);
}
