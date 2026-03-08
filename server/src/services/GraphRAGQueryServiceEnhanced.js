"use strict";
/**
 * GraphRAGQueryServiceEnhanced - Enhanced orchestration with redaction & provenance
 *
 * Enhancements over base GraphRAGQueryService:
 * 1. Redaction awareness - filters sensitive fields before LLM processing
 * 2. Provenance tracking - links citations to evidence via prov-ledger
 * 3. Enhanced guardrails - GraphRAG-specific safety checks
 * 4. Policy enforcement - respects classification labels
 * 5. Hallucination Mitigation (CoVe)
 *
 * Architecture:
 * User Query → Preview → [Redaction Filter] → GraphRAG → [Citation Enrichment] → Answer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAGQueryServiceEnhanced = void 0;
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
class GraphRAGQueryServiceEnhanced {
    graphRAGService;
    queryPreviewService;
    glassBoxService;
    redactionService;
    provLedgerClient;
    guardrailsService;
    pool;
    neo4jDriver;
    redis;
    hallucinationMitigationService;
    constructor(graphRAGService, queryPreviewService, glassBoxService, redactionService, provLedgerClient, guardrailsService, pool, neo4jDriver, redis, hallucinationMitigationService) {
        this.graphRAGService = graphRAGService;
        this.queryPreviewService = queryPreviewService;
        this.glassBoxService = glassBoxService;
        this.redactionService = redactionService;
        this.provLedgerClient = provLedgerClient;
        this.guardrailsService = guardrailsService;
        this.pool = pool;
        this.neo4jDriver = neo4jDriver;
        this.redis = redis;
        this.hallucinationMitigationService = hallucinationMitigationService;
    }
    /**
     * Main query method with redaction and provenance
     */
    async query(request) {
        const startTime = Date.now();
        logger_js_1.logger.info({
            investigationId: request.investigationId,
            question: request.question,
            redactionEnabled: request.redactionPolicy?.enabled,
            provenanceEnabled: !!request.provenanceContext,
            guardrailsEnabled: request.enableGuardrails !== false,
            enableCoVe: request.enableCoVe
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
                enableCoVe: request.enableCoVe,
            },
        });
        try {
            await this.glassBoxService.updateStatus(run.id, 'running');
            // Step 1: Guardrails check (if enabled)
            let guardrailsPassed = true;
            const guardrailWarnings = [];
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
            let preview;
            if (request.generateQueryPreview) {
                const previewStepId = await this.captureStep(run.id, 'Generate query preview from natural language');
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
                    throw new Error(`Query cannot be executed: ${preview.validationErrors.join(', ')}`);
                }
            }
            // Step 3: Execute GraphRAG query
            const ragStepId = await this.captureStep(run.id, request.enableCoVe
                ? 'Execute Chain-of-Verification (CoVe) pipeline'
                : 'Execute GraphRAG retrieval and generation');
            const ragRequest = {
                investigationId: request.investigationId,
                question: request.question,
                focusEntityIds: request.focusEntityIds,
                maxHops: request.maxHops || 2,
            };
            let ragResponse;
            if (request.enableCoVe && this.hallucinationMitigationService) {
                ragResponse = await this.hallucinationMitigationService.query({
                    ...ragRequest,
                    enableCoVe: true
                });
            }
            else {
                ragResponse = await this.graphRAGService.answer(ragRequest);
            }
            await this.glassBoxService.completeStep(run.id, ragStepId, {
                confidence: ragResponse.confidence,
                citationCount: ragResponse.citations.entityIds.length,
                pathCount: ragResponse.why_paths?.length,
                verificationStatus: ragResponse.verificationStatus,
            });
            // Step 4: Apply redaction if enabled
            let redactionApplied = false;
            let uncertaintyDueToRedaction;
            let redactedAnswer = ragResponse.answer;
            if (request.redactionPolicy?.enabled) {
                const redactionStepId = await this.captureStep(run.id, 'Apply redaction policy to answer');
                const redactionResult = await this.applyRedaction({
                    answer: ragResponse.answer,
                    entities: ragResponse.citations.entityIds,
                }, request.redactionPolicy, request.tenantId);
                redactedAnswer = redactionResult.redactedAnswer;
                redactionApplied = redactionResult.redactionApplied;
                uncertaintyDueToRedaction = redactionResult.uncertaintyMessage;
                await this.glassBoxService.completeStep(run.id, redactionStepId, {
                    redactionApplied,
                    fieldsRedacted: redactionResult.fieldsRedacted,
                });
            }
            // Step 5: Enrich citations with provenance
            const enrichStepId = await this.captureStep(run.id, 'Enrich citations with entity details and provenance');
            const enrichedCitations = await this.enrichCitationsWithProvenance(ragResponse.citations.entityIds, request.investigationId, request.provenanceContext, request.redactionPolicy);
            await this.glassBoxService.completeStep(run.id, enrichStepId, {
                enrichedCount: enrichedCitations.length,
                provenanceVerified: enrichedCitations.some(c => c.provenanceChain?.verifiable),
            });
            // Step 6: Register answer as claim if requested
            let answerClaimId;
            if (request.registerClaim && request.provenanceContext) {
                const claimStepId = await this.captureStep(run.id, 'Register answer as verifiable claim');
                answerClaimId = await this.registerAnswerClaim(request.question, redactedAnswer, enrichedCitations, request.provenanceContext, request.investigationId);
                await this.glassBoxService.completeStep(run.id, claimStepId, {
                    claimId: answerClaimId,
                });
            }
            // Step 7: Get subgraph size for metadata
            const subgraphSize = await this.getSubgraphSize(request.investigationId, request.focusEntityIds);
            const executionTimeMs = Date.now() - startTime;
            const verificationProps = request.enableCoVe ? {
                verificationStatus: ragResponse.verificationStatus,
                inconsistencies: ragResponse.inconsistencies,
                corrections: ragResponse.corrections,
                reasoningTrace: ragResponse.reasoningTrace,
                conflictDetails: ragResponse.conflictDetails,
                evidenceMetrics: ragResponse.evidenceMetrics
            } : {};
            const response = {
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
                ...verificationProps
            };
            await this.glassBoxService.updateStatus(run.id, 'completed', response);
            metrics_js_1.metrics.graphragQueryTotal.inc({
                status: 'success',
                hasPreview: preview ? 'true' : 'false',
                redactionEnabled: redactionApplied ? 'true' : 'false',
                provenanceEnabled: answerClaimId ? 'true' : 'false',
            });
            metrics_js_1.metrics.graphragQueryDurationMs.observe({ hasPreview: preview ? 'true' : 'false' }, executionTimeMs);
            logger_js_1.logger.info({
                runId: run.id,
                investigationId: request.investigationId,
                confidence: ragResponse.confidence,
                citationCount: enrichedCitations.length,
                executionTimeMs,
                redactionApplied,
                provenanceVerified: response.provenanceVerified,
                verificationStatus: response.verificationStatus
            }, 'Completed enhanced GraphRAG query');
            return response;
        }
        catch (error) {
            await this.glassBoxService.updateStatus(run.id, 'failed', undefined, String(error));
            metrics_js_1.metrics.graphragQueryTotal.inc({
                status: 'failed',
                hasPreview: 'false',
                redactionEnabled: 'false',
                provenanceEnabled: 'false',
            });
            logger_js_1.logger.error({
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
    async applyRedaction(data, policy, tenantId) {
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
            if (policy.rules.includes(type)) {
                const matches = redactedAnswer.match(pattern);
                if (matches && matches.length > 0) {
                    redactedAnswer = redactedAnswer.replace(pattern, replacement);
                    fieldsRedacted += matches.length;
                    redactionApplied = true;
                }
            }
        }
        let uncertaintyMessage;
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
    async enrichCitationsWithProvenance(entityIds, investigationId, provenanceContext, redactionPolicy) {
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
            const enrichedCitations = [];
            for (const row of result.rows) {
                let wasRedacted = false;
                const redactedFields = [];
                let snippetText = row.description;
                // Apply redaction if enabled
                if (redactionPolicy?.enabled) {
                    const { redactedAnswer, redactionApplied, fieldsRedacted } = await this.applyRedaction({ answer: snippetText || '', entities: [] }, redactionPolicy, investigationId);
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
                let provenanceChain;
                let claimIds = [];
                if (provenanceContext && row.evidence_id) {
                    try {
                        const evidence = await this.provLedgerClient.getEvidence(row.evidence_id);
                        const chains = await this.provLedgerClient.getProvenanceChains(evidence.id);
                        if (chains && chains.length > 0) {
                            const chain = chains[0];
                            provenanceChain = {
                                chainId: chain.id,
                                rootHash: chain.lineage.rootHash || '', // Cast to any as type def is incomplete
                                transformChain: chain.transforms,
                                verifiable: !!chain.lineage.verified, // Cast to any
                            };
                            // Get associated claims
                            if (evidence.metadata?.claimIds) {
                                claimIds = evidence.metadata.claimIds;
                            }
                        }
                    }
                    catch (error) {
                        logger_js_1.logger.warn({
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
                    // claimIds not on Evidence type in clients, assume in metadata if present
                    claimIds: row.props?.claimIds || [],
                    provenanceChain,
                    wasRedacted,
                    redactedFields,
                });
            }
            return enrichedCitations;
        }
        catch (error) {
            logger_js_1.logger.error({
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
    async registerAnswerClaim(question, answer, citations, provenanceContext, investigationId) {
        try {
            const claim = await this.provLedgerClient.createClaim({
                content: {
                    statement: answer,
                    type: 'graphrag_answer',
                    confidence: this.calculateOverallConfidence(citations),
                },
                metadata: {
                    question,
                    investigationId,
                    citationCount: citations.length,
                    timestamp: new Date().toISOString(),
                    evidenceIds: citations
                        .map(c => c.evidenceId)
                        .filter((id) => !!id),
                    sourceEntityIds: citations.map(c => c.entityId),
                },
            });
            // Create provenance chain if we have evidence
            // Note: evidenceIds are stored in metadata, so we access them there
            const evidenceIds = claim.metadata?.evidenceIds;
            if (evidenceIds && evidenceIds.length > 0) {
                await this.provLedgerClient.createProvenanceChain({
                    claimId: claim.id,
                    sources: evidenceIds, // Mapping evidenceIds to sources as ProvChain expects sources
                    transforms: ['graphrag_synthesis'],
                    lineage: {
                        transformParams: {
                            model: 'gpt-4',
                            confidence: claim.content.confidence,
                        },
                    },
                });
            }
            logger_js_1.logger.info({
                claimId: claim.id,
                investigationId,
                evidenceCount: claim.metadata?.evidenceIds?.length || 0,
            }, 'Registered GraphRAG answer as claim');
            return claim.id;
        }
        catch (error) {
            logger_js_1.logger.error({
                error,
                investigationId,
            }, 'Failed to register answer claim');
            throw new Error(`Failed to register answer claim: ${error}`);
        }
    }
    /**
     * Calculate overall confidence from citations
     */
    calculateOverallConfidence(citations) {
        if (citations.length === 0)
            return 0;
        const confidences = citations
            .map(c => c.confidence)
            .filter((c) => c !== undefined);
        if (confidences.length === 0)
            return 0.7; // Default confidence
        const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
        return Math.round(avg * 100) / 100;
    }
    /**
     * Check if a field name suggests PII
     */
    isPIIField(fieldName) {
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
    async getSubgraphSize(investigationId, focusEntityIds) {
        const session = this.neo4jDriver.session();
        try {
            let query;
            let params;
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
            }
            else {
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
        }
        catch (error) {
            logger_js_1.logger.error({
                error,
                investigationId,
            }, 'Failed to get subgraph size');
            return undefined;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Capture a step in the glass-box run
     */
    async captureStep(runId, description) {
        const stepId = (0, uuid_1.v4)();
        await this.glassBoxService.addStep(runId, {
            type: 'tool_call',
            description,
        });
        return stepId;
    }
    /**
     * Truncate text to max length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + '...';
    }
}
exports.GraphRAGQueryServiceEnhanced = GraphRAGQueryServiceEnhanced;
