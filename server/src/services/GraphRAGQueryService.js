"use strict";
// @ts-nocheck
/**
 * GraphRAGQueryService - Orchestrates the complete GraphRAG query flow with preview
 *
 * Features:
 * - Natural language query → preview → execute workflow
 * - Integration with existing GraphRAGService for RAG retrieval
 * - Citation resolution and inline references
 * - Glass-box run capture for full observability
 * - Query editing and re-execution support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphRAGQueryService = void 0;
const logger_js_1 = require("../utils/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const emitter_js_1 = require("../metering/emitter.js");
const registry_js_1 = require("../prompts/registry.js");
const tracing_js_1 = require("../observability/tracing.js");
const uuid_1 = require("uuid");
class GraphRAGQueryService {
    graphRAGService;
    queryPreviewService;
    glassBoxService;
    pool;
    neo4jDriver;
    constructor(graphRAGService, queryPreviewService, glassBoxService, pool, neo4jDriver) {
        this.graphRAGService = graphRAGService;
        this.queryPreviewService = queryPreviewService;
        this.glassBoxService = glassBoxService;
        this.pool = pool;
        this.neo4jDriver = neo4jDriver;
    }
    /**
     * Main query method - handles the full flow from NL query to answer with citations
     */
    async query(request) {
        return tracing_js_1.tracer.trace("graphrag.query", async (span) => {
            span.setAttribute("graphrag.investigation_id", request.investigationId);
            span.setAttribute("graphrag.tenant_id", request.tenantId);
            span.setAttribute("graphrag.question_length", request.question.length);
            const startTime = Date.now();
            metrics_js_1.metrics.featureUsageTotal.inc({
                tenant_id: request.tenantId,
                feature_name: "graphrag_query",
            });
            logger_js_1.logger.info({
                investigationId: request.investigationId,
                question: request.question,
                generatePreview: request.generateQueryPreview,
                autoExecute: request.autoExecute,
            }, "Starting GraphRAG query");
            // Load the system prompt contract to link it in audit metadata
            let systemPromptId = "core.jules-copilot@v4";
            let systemPromptOwner = "jules";
            try {
                const promptConfig = registry_js_1.promptRegistry.getPrompt(systemPromptId);
                if (promptConfig) {
                    systemPromptOwner = promptConfig.meta.owner;
                }
            }
            catch (e) {
                logger_js_1.logger.warn({ error: e }, "Failed to load system prompt config for audit metadata");
            }
            // Create glass-box run for observability
            const run = await this.glassBoxService.createRun({
                investigationId: request.investigationId,
                tenantId: request.tenantId,
                userId: request.userId,
                type: "graphrag_query",
                prompt: request.question,
                parameters: {
                    focusEntityIds: request.focusEntityIds,
                    maxHops: request.maxHops,
                    generatePreview: request.generateQueryPreview,
                    autoExecute: request.autoExecute,
                    systemPromptId,
                    systemPromptOwner,
                },
            });
            try {
                await this.glassBoxService.updateStatus(run.id, "running");
                let preview;
                // Step 1: Generate query preview if requested
                if (request.generateQueryPreview) {
                    const previewStepId = await this.captureStep(run.id, "Generate query preview from natural language");
                    preview = await this.queryPreviewService.createPreview({
                        investigationId: request.investigationId,
                        tenantId: request.tenantId,
                        userId: request.userId,
                        naturalLanguageQuery: request.question,
                        language: "cypher",
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
                        await this.glassBoxService.updateStatus(run.id, "completed", {
                            previewGenerated: true,
                            requiresExplicitExecution: true,
                        });
                        return {
                            answer: "",
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
                        };
                    }
                    // Check if we can execute
                    if (!preview.canExecute) {
                        throw new Error(`Query cannot be executed: ${preview.validationErrors.join(", ")}`);
                    }
                    if (preview.requiresApproval) {
                        logger_js_1.logger.warn({
                            previewId: preview.id,
                            costLevel: preview.costEstimate.level,
                            riskLevel: preview.riskAssessment.level,
                        }, "Query requires approval but auto-execute is true");
                    }
                }
                // Step 2: Execute GraphRAG query
                const ragStepId = await this.captureStep(run.id, "Execute GraphRAG retrieval and generation");
                const ragRequest = {
                    investigationId: request.investigationId,
                    tenantId: request.tenantId,
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
                // Step 3: Enrich citations with entity details
                const enrichStepId = await this.captureStep(run.id, "Enrich citations with entity details");
                const enrichedCitations = await this.enrichCitations(ragResponse.citations.entityIds, request.investigationId, request.tenantId);
                await this.glassBoxService.completeStep(run.id, enrichStepId, {
                    enrichedCount: enrichedCitations.length,
                });
                // Enforce Prompt Contract: Block publication if claims lack provenance (missing citations)
                if (enrichedCitations.length === 0 && ragResponse.answer.length > 50) {
                    const errorMsg = "Publication blocked: Answer generated but lacks required citations.";
                    logger_js_1.logger.warn({ runId: run.id }, errorMsg);
                    // We log it as a failed step or warning, but per strict prompt contract, we should probably fail or redact.
                    // For MVP-4 GA, we'll mark the run as having a policy violation but return what we have with a warning,
                    // OR strictly fail. The prompt says "block publication if any claim lacks provenance".
                    // Let's implement a strict block for high-stakes compliance.
                    throw new Error(errorMsg);
                }
                // Step 4: Get subgraph size for metadata
                const subgraphSize = await this.getSubgraphSize(request.investigationId, request.focusEntityIds);
                const executionTimeMs = Date.now() - startTime;
                const response = {
                    answer: ragResponse.answer,
                    confidence: ragResponse.confidence,
                    citations: enrichedCitations,
                    why_paths: ragResponse.why_paths,
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
                };
                await this.glassBoxService.updateStatus(run.id, "completed", response);
                metrics_js_1.metrics.graphragQueryTotal.inc({
                    status: "success",
                    hasPreview: preview ? "true" : "false",
                    redactionEnabled: "false",
                    provenanceEnabled: "false",
                });
                metrics_js_1.metrics.graphragQueryDurationMs.observe({ hasPreview: preview ? "true" : "false" }, executionTimeMs);
                logger_js_1.logger.info({
                    runId: run.id,
                    investigationId: request.investigationId,
                    confidence: ragResponse.confidence,
                    citationCount: enrichedCitations.length,
                    executionTimeMs,
                    hasPreview: !!preview,
                }, "Completed GraphRAG query");
                try {
                    await emitter_js_1.meteringEmitter.emitQueryCredits({
                        tenantId: request.tenantId,
                        credits: 1,
                        source: "graphrag-query-service",
                        correlationId: run.id,
                        idempotencyKey: run.id,
                        metadata: {
                            investigationId: request.investigationId,
                            autoExecute: request.autoExecute ?? true,
                        },
                    });
                }
                catch (meterError) {
                    logger_js_1.logger.warn({ meterError, runId: run.id }, "Failed to emit query metering event");
                }
                return response;
            }
            catch (error) {
                await this.glassBoxService.updateStatus(run.id, "failed", undefined, String(error));
                metrics_js_1.metrics.graphragQueryTotal.inc({
                    status: "failed",
                    hasPreview: "false",
                    redactionEnabled: "false",
                    provenanceEnabled: "false",
                });
                logger_js_1.logger.error({
                    error,
                    runId: run.id,
                    request,
                }, "Failed to execute GraphRAG query");
                throw error;
            }
        });
    }
    /**
     * Execute a previously created preview
     */
    async executePreview(request) {
        const startTime = Date.now();
        const preview = await this.queryPreviewService.getPreview(request.previewId);
        if (!preview) {
            throw new Error(`Preview ${request.previewId} not found`);
        }
        logger_js_1.logger.info({
            previewId: request.previewId,
            investigationId: preview.investigationId,
            useEditedQuery: request.useEditedQuery,
            dryRun: request.dryRun,
        }, "Executing preview");
        // Execute the preview (this creates its own glass-box run internally)
        const execResult = await this.queryPreviewService.executePreview({
            previewId: request.previewId,
            userId: request.userId,
            useEditedQuery: request.useEditedQuery,
            dryRun: request.dryRun,
            maxRows: request.maxRows,
            timeout: request.timeout,
            cursor: request.cursor,
            batchSize: request.batchSize,
            stream: request.stream,
        });
        // If dry run, return empty response
        if (request.dryRun) {
            return {
                answer: "Dry run - query validated but not executed",
                confidence: 0,
                citations: [],
                runId: execResult.runId,
                executionTimeMs: execResult.executionTimeMs,
            };
        }
        // Now execute GraphRAG with the original question
        const ragRequest = {
            investigationId: preview.investigationId,
            tenantId: preview.tenantId,
            question: preview.naturalLanguageQuery,
            focusEntityIds: preview.parameters.focusEntityIds,
            maxHops: preview.parameters.maxHops,
        };
        const ragResponse = await this.graphRAGService.answer(ragRequest);
        // Enrich citations
        const enrichedCitations = await this.enrichCitations(ragResponse.citations.entityIds, preview.investigationId, preview.tenantId);
        const response = {
            answer: ragResponse.answer,
            confidence: ragResponse.confidence,
            citations: enrichedCitations,
            why_paths: ragResponse.why_paths,
            preview: {
                id: preview.id,
                generatedQuery: request.useEditedQuery && preview.editedQuery
                    ? preview.editedQuery
                    : preview.generatedQuery,
                queryExplanation: preview.queryExplanation,
                costLevel: preview.costEstimate.level,
                riskLevel: preview.riskAssessment.level,
                canExecute: preview.canExecute,
                requiresApproval: preview.requiresApproval,
            },
            runId: execResult.runId,
            rows: execResult.results,
            partialResults: execResult.partialResults,
            rowCount: execResult.rowCount,
            nextCursor: execResult.nextCursor,
            hasMore: execResult.hasMore,
            streamingChannel: execResult.streamingChannel,
            streamedBatches: execResult.streamedBatches,
            executionTimeMs: Date.now() - startTime,
        };
        logger_js_1.logger.info({
            previewId: request.previewId,
            runId: execResult.runId,
            citationCount: enrichedCitations.length,
            executionTimeMs: response.executionTimeMs,
        }, "Executed preview successfully");
        return response;
    }
    /**
     * Get a run by ID with full details
     */
    async getRun(runId) {
        return this.glassBoxService.getRun(runId);
    }
    /**
     * Replay a run with optional modifications
     */
    async replayRun(runId, userId, options) {
        const originalRun = await this.glassBoxService.getRun(runId);
        if (!originalRun) {
            throw new Error(`Run ${runId} not found`);
        }
        logger_js_1.logger.info({
            originalRunId: runId,
            userId,
            hasModifications: !!(options?.modifiedQuestion || options?.modifiedParameters),
        }, "Replaying run");
        // Create replay run
        const replayRun = await this.glassBoxService.replayRun(runId, userId, {
            modifiedPrompt: options?.modifiedQuestion,
            modifiedParameters: options?.modifiedParameters,
            skipCache: options?.skipCache,
        });
        // Execute with replay parameters
        const request = {
            investigationId: originalRun.investigationId,
            tenantId: originalRun.tenantId,
            userId,
            question: options?.modifiedQuestion || originalRun.prompt,
            focusEntityIds: options?.modifiedParameters?.focusEntityIds ||
                originalRun.parameters.focusEntityIds,
            maxHops: options?.modifiedParameters?.maxHops ||
                originalRun.parameters.maxHops,
            generateQueryPreview: originalRun.parameters.generatePreview,
            autoExecute: true,
        };
        return this.query(request);
    }
    /**
     * List runs for an investigation
     */
    async listRuns(investigationId, options) {
        return this.glassBoxService.listRuns(investigationId, {
            type: "graphrag_query",
            ...options,
        });
    }
    /**
     * Get replay history for a run
     */
    async getReplayHistory(runId) {
        return this.glassBoxService.getReplayHistory(runId);
    }
    /**
     * Enrich citations with entity details
     */
    async enrichCitations(entityIds, investigationId, tenantId) {
        if (entityIds.length === 0) {
            return [];
        }
        // Ensure we enforce tenant isolation if tenantId is provided
        const tenantFilter = tenantId ? "AND e.tenant_id = $3" : "";
        const query = `
      SELECT
        e.id,
        e.kind,
        e.labels,
        e.props->>'name' as name,
        e.props->>'description' as description,
        e.props->>'url' as source_url,
        e.props->>'confidence' as confidence
      FROM entities e
      WHERE e.id = ANY($1)
      AND e.props->>'investigationId' = $2
      ${tenantFilter}
      ORDER BY array_position($1, e.id)
    `;
        try {
            const params = [entityIds, investigationId];
            if (tenantId)
                params.push(tenantId);
            const result = await this.pool.query(query, params);
            return result.rows.map((row) => ({
                entityId: row.id,
                entityKind: row.kind,
                entityLabels: row.labels || [],
                entityName: row.name || row.id,
                snippetText: row.description ? this.truncateText(row.description, 200) : undefined,
                confidence: row.confidence ? parseFloat(row.confidence) : undefined,
                sourceUrl: row.source_url,
            }));
        }
        catch (error) {
            logger_js_1.logger.error({
                error,
                entityIds,
                investigationId,
            }, "Failed to enrich citations");
            // Return basic citations on error
            return entityIds.map((id) => ({
                entityId: id,
            }));
        }
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
                    nodeCount: result.records[0].get("nodeCount").toNumber(),
                    edgeCount: result.records[0].get("edgeCount").toNumber(),
                };
            }
            return undefined;
        }
        catch (error) {
            logger_js_1.logger.error({
                error,
                investigationId,
            }, "Failed to get subgraph size");
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
            type: "tool_call",
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
        return text.substring(0, maxLength - 3) + "...";
    }
}
exports.GraphRAGQueryService = GraphRAGQueryService;
