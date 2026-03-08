"use strict";
/**
 * AI Copilot Orchestrator
 *
 * Unified orchestration layer for all AI Copilot capabilities:
 * 1. Natural Language → Graph Query (NL2Cypher)
 * 2. GraphRAG - Retrieval Augmented Generation over graphs
 * 3. Query Preview & Sandbox Execution
 * 4. Citation & Provenance Tracking
 * 5. Redaction & Policy Enforcement
 * 6. Guardrails & Safety
 *
 * This service provides a single API for all AI-powered analyst workflows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICopilotOrchestrator = void 0;
const logger_js_1 = require("../utils/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
class AICopilotOrchestrator {
    graphRAGService;
    nl2CypherService;
    queryPreviewService;
    glassBoxService;
    pool;
    neo4jDriver;
    redis;
    constructor(graphRAGService, nl2CypherService, queryPreviewService, glassBoxService, pool, neo4jDriver, redis) {
        this.graphRAGService = graphRAGService;
        this.nl2CypherService = nl2CypherService;
        this.queryPreviewService = queryPreviewService;
        this.glassBoxService = glassBoxService;
        this.pool = pool;
        this.neo4jDriver = neo4jDriver;
        this.redis = redis;
    }
    /**
     * Main query method - intelligently routes to appropriate service
     */
    async query(request) {
        const startTime = Date.now();
        logger_js_1.logger.info({
            investigationId: request.investigationId,
            question: request.question,
            mode: request.mode || 'auto',
            dryRun: request.dryRun,
        }, 'AI Copilot query initiated');
        // Determine mode if auto
        const mode = request.mode === 'auto' || !request.mode
            ? await this.determineMode(request)
            : request.mode;
        let result;
        let runId;
        let modeSelectionReasoning;
        if (mode === 'graphrag') {
            // Use GraphRAG for natural language questions requiring contextual answers
            logger_js_1.logger.info({ mode: 'graphrag' }, 'Routing to GraphRAG service');
            const graphRAGRequest = {
                investigationId: request.investigationId,
                tenantId: request.tenantId,
                userId: request.userId,
                question: request.question,
                focusEntityIds: request.focusEntityIds,
                maxHops: request.maxHops,
                redactionPolicy: request.redactionPolicy,
                provenanceContext: request.provenanceContext,
                registerClaim: request.registerClaim,
                generateQueryPreview: request.generateQueryPreview,
                autoExecute: request.autoExecute !== false, // Default true for graphrag
                enableGuardrails: request.enableGuardrails,
                riskTolerance: request.riskTolerance,
            };
            const graphRAGResponse = await this.graphRAGService.query(graphRAGRequest);
            result = graphRAGResponse;
            runId = graphRAGResponse.runId;
            modeSelectionReasoning = request.mode === 'auto'
                ? 'Question appears to require contextual understanding and natural language response'
                : undefined;
        }
        else if (mode === 'nl2cypher') {
            // Use NL2Cypher for structured queries and data retrieval
            logger_js_1.logger.info({ mode: 'nl2cypher' }, 'Routing to NL2Cypher service');
            const nl2cypherRequest = {
                query: request.question,
                investigationId: request.investigationId,
                userId: request.userId,
                dryRun: request.dryRun || !request.autoExecute,
            };
            const cypherResult = await this.nl2CypherService.translateQuery(nl2cypherRequest);
            result = cypherResult;
            runId = cypherResult.auditId || 'nl2cypher-' + Date.now();
            modeSelectionReasoning = request.mode === 'auto'
                ? 'Question appears to be a structured query requesting specific data'
                : undefined;
        }
        else {
            throw new Error(`Unsupported mode: ${mode}`);
        }
        const executionTimeMs = Date.now() - startTime;
        metrics_js_1.metrics.copilotApiRequestTotal.inc({
            mode,
            status: 'success',
            autoMode: request.mode === 'auto' || !request.mode,
        });
        metrics_js_1.metrics.copilotApiRequestDurationMs.observe({ mode }, executionTimeMs);
        logger_js_1.logger.info({
            investigationId: request.investigationId,
            mode,
            executionTimeMs,
            runId,
        }, 'AI Copilot query completed');
        return {
            mode,
            result,
            executionTimeMs,
            runId,
            modeSelectionReasoning,
        };
    }
    /**
     * Intelligent mode selection based on query characteristics
     */
    async determineMode(request) {
        const question = request.question.toLowerCase().trim();
        // Patterns that indicate NL2Cypher mode (structured queries)
        const structuredQueryPatterns = [
            /^(show|list|find|get|count|display)\s+/,
            /^how many\s+/,
            /\b(all|every)\s+(entities|relationships|nodes|edges)/,
            /\bwhere\s+.+\s*(equals?|is|are|contains?)\b/,
            /^(what|which)\s+(entities|relationships|nodes)\s+/,
            /\b(shortest|longest)\s+path\s+/,
            /\bconnected to\b/,
            /\brelated to\b/,
            /\bproperties of\b/,
        ];
        // Patterns that indicate GraphRAG mode (contextual questions)
        const contextualQueryPatterns = [
            /^(why|how|when|explain|describe|summarize|tell me about)\s+/,
            /\bwhat does .+ mean\b/,
            /\bwhat is the (significance|importance|relevance|context)\b/,
            /\bwhat are the (implications|consequences|effects)\b/,
            /\bcan you (explain|describe|summarize)\b/,
            /\bprovide (context|background|details|insights?)\b/,
            /\b(analyze|assess|evaluate)\b/,
            /\b(relationship|connection) between\b/,
        ];
        // Check for structured query patterns
        const isStructured = structuredQueryPatterns.some(pattern => pattern.test(question));
        // Check for contextual query patterns
        const isContextual = contextualQueryPatterns.some(pattern => pattern.test(question));
        // If clearly structured, use NL2Cypher
        if (isStructured && !isContextual) {
            logger_js_1.logger.debug({
                question: request.question,
                selectedMode: 'nl2cypher',
                reason: 'Structured query pattern detected',
            }, 'Auto-selected mode');
            return 'nl2cypher';
        }
        // If clearly contextual, use GraphRAG
        if (isContextual && !isStructured) {
            logger_js_1.logger.debug({
                question: request.question,
                selectedMode: 'graphrag',
                reason: 'Contextual query pattern detected',
            }, 'Auto-selected mode');
            return 'graphrag';
        }
        // Additional heuristics:
        // 1. Question length - longer questions tend to need contextual answers
        if (question.split(' ').length > 15) {
            logger_js_1.logger.debug({
                question: request.question,
                selectedMode: 'graphrag',
                reason: 'Long question suggesting need for contextual answer',
            }, 'Auto-selected mode');
            return 'graphrag';
        }
        // 2. Question ends with "?" and has explanation keywords
        if (question.endsWith('?') && (question.includes('why') ||
            question.includes('how') ||
            question.includes('what does') ||
            question.includes('explain'))) {
            logger_js_1.logger.debug({
                question: request.question,
                selectedMode: 'graphrag',
                reason: 'Explanatory question detected',
            }, 'Auto-selected mode');
            return 'graphrag';
        }
        // 3. Default to GraphRAG for ambiguous cases (safer for user experience)
        logger_js_1.logger.debug({
            question: request.question,
            selectedMode: 'graphrag',
            reason: 'Ambiguous query - defaulting to GraphRAG for better UX',
        }, 'Auto-selected mode');
        return 'graphrag';
    }
    /**
     * Get query history for an investigation
     */
    async getQueryHistory(investigationId, options) {
        // Fetch from glass-box runs
        const runs = await this.glassBoxService.listRuns(investigationId, {
            type: options?.mode ? `${options.mode}_query` : undefined,
            limit: options?.limit,
            offset: options?.offset,
        });
        return {
            queries: runs.runs.map(run => ({
                runId: run.id,
                mode: this.inferModeFromRunType(run.type),
                question: run.prompt,
                timestamp: run.createdAt,
                executionTimeMs: run.completedAt
                    ? new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()
                    : 0,
                status: run.status,
            })),
            total: runs.total,
        };
    }
    /**
     * Get detailed information about a specific run
     */
    async getRun(runId) {
        return this.glassBoxService.getRun(runId);
    }
    /**
     * Replay a previous query with optional modifications
     */
    async replayQuery(runId, userId, options) {
        const originalRun = await this.glassBoxService.getRun(runId);
        if (!originalRun) {
            throw new Error(`Run ${runId} not found`);
        }
        logger_js_1.logger.info({
            originalRunId: runId,
            userId,
            hasModifications: !!(options?.modifiedQuestion || options?.modifiedParameters),
        }, 'Replaying copilot query');
        // Extract original request parameters
        const mode = this.inferModeFromRunType(originalRun.type);
        const request = {
            investigationId: originalRun.investigationId,
            tenantId: originalRun.tenantId,
            userId,
            question: options?.modifiedQuestion || originalRun.prompt,
            mode,
            focusEntityIds: options?.modifiedParameters?.focusEntityIds
                || originalRun.parameters.focusEntityIds,
            maxHops: options?.modifiedParameters?.maxHops
                || originalRun.parameters.maxHops,
            autoExecute: true,
        };
        return this.query(request);
    }
    /**
     * Infer copilot mode from run type
     */
    inferModeFromRunType(runType) {
        if (runType.includes('graphrag'))
            return 'graphrag';
        if (runType.includes('nl2cypher') || runType.includes('nl_to_cypher'))
            return 'nl2cypher';
        return 'auto';
    }
    /**
     * Health check for AI Copilot services
     */
    async healthCheck() {
        const checks = {
            graphrag: false,
            nl2cypher: false,
            queryPreview: false,
            provenance: false,
            redaction: false,
        };
        // Check each service (simplified - in production would do actual health checks)
        try {
            checks.graphrag = !!this.graphRAGService;
            checks.nl2cypher = !!this.nl2CypherService;
            checks.queryPreview = !!this.queryPreviewService;
            checks.provenance = true; // ProvLedgerClient availability
            checks.redaction = true; // RedactionService availability
        }
        catch (error) {
            logger_js_1.logger.error({ error }, 'Health check failed');
        }
        const healthyCount = Object.values(checks).filter(v => v).length;
        const totalCount = Object.keys(checks).length;
        let status;
        if (healthyCount === totalCount) {
            status = 'healthy';
        }
        else if (healthyCount >= totalCount / 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            services: checks,
            timestamp: new Date(),
        };
    }
}
exports.AICopilotOrchestrator = AICopilotOrchestrator;
