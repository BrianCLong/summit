"use strict";
/**
 * Evidence-First GraphRAG Service
 *
 * Main service that orchestrates the GraphRAG pipeline:
 * 1. Retrieve graph context for case
 * 2. Filter evidence by policy
 * 3. Generate answer with LLM (citations enforced)
 * 4. Validate citations exist in context
 * 5. Log audit record
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceFirstGraphRagService = void 0;
exports.createGraphRagService = createGraphRagService;
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const types_js_1 = require("./types.js");
const retrieval_js_1 = require("./retrieval.js");
const policy_guard_js_1 = require("./policy-guard.js");
const audit_log_js_1 = require("./audit-log.js");
// Default retrieval parameters
const DEFAULT_RETRIEVAL_PARAMS = {
    maxNodes: 50,
    maxDepth: 3,
    maxEvidenceSnippets: 20,
};
// Fallback messages
const FALLBACK_NO_EVIDENCE = 'No evidence is available for you to view in this case based on your current permissions.';
const FALLBACK_CITATION_FAILURE = 'Unable to generate a citation-backed answer from the provided evidence. The system refused to answer without verifiable citations.';
const FALLBACK_NO_CASE_ACCESS = 'You do not have access to this case.';
class EvidenceFirstGraphRagService {
    caseGraphRepo;
    evidenceRepo;
    policyEngine;
    llmAdapter;
    auditLog;
    retrievalParams;
    cypherGenerator;
    constructor(deps) {
        this.caseGraphRepo = deps.caseGraphRepo;
        this.evidenceRepo = deps.evidenceRepo;
        this.policyEngine = deps.policyEngine;
        this.llmAdapter = deps.llmAdapter;
        this.auditLog = deps.auditLog;
        this.retrievalParams = {
            ...DEFAULT_RETRIEVAL_PARAMS,
            ...deps.retrievalParams,
        };
        this.cypherGenerator = deps.cypherGenerator;
    }
    async answer(req, user) {
        const requestId = crypto_1.default.randomUUID();
        const timestamp = new Date().toISOString();
        logger_js_1.default.info({
            message: 'GraphRAG request started',
            requestId,
            caseId: req.caseId,
            userId: req.userId,
            questionLength: req.question.length,
        });
        try {
            // 1. Check case access
            if (!(0, policy_guard_js_1.canAccessCase)(user, req.caseId)) {
                throw new types_js_1.PolicyViolationError(FALLBACK_NO_CASE_ACCESS, {
                    caseId: req.caseId,
                    userId: user.userId,
                });
            }
            // 2. Retrieve graph context (Cypher-First or Blast Radius)
            let retrievalResult;
            let cypherUsed = false;
            // Attempt Cypher-First Retrieval if generator is available
            if (this.cypherGenerator) {
                try {
                    // Simplified Schema Context for now (in production this comes from SchemaService)
                    const schema = {
                        nodeTypes: ['Person', 'Organization', 'Location', 'Event', 'Vehicle'],
                        edgeTypes: ['KNOWS', 'LOCATED_AT', 'PARTICIPATED_IN', 'OWNED_BY'],
                        schemaSummary: 'Intelligence graph with Persons, Organizations, and Events.'
                    };
                    const generated = await this.cypherGenerator.generate(req.question, schema);
                    if (generated) {
                        logger_js_1.default.info({
                            message: 'Cypher-First Retrieval Strategy Selected',
                            mode: generated.mode,
                            confidence: generated.confidence,
                            requestId
                        });
                        const { nodes, edges } = await this.caseGraphRepo.getSubgraphByCypher(req.caseId, generated.cypher, generated.params);
                        if (nodes.length > 0) {
                            // Parallel: Get evidence snippets standard way (hybrid approach)
                            const evidenceSnippets = await this.evidenceRepo.searchEvidenceSnippets({
                                caseId: req.caseId,
                                query: req.question,
                                maxSnippets: this.retrievalParams.maxEvidenceSnippets,
                            });
                            retrievalResult = {
                                context: { nodes, edges, evidenceSnippets }
                            };
                            cypherUsed = true;
                        }
                    }
                }
                catch (cypherError) {
                    logger_js_1.default.warn({
                        message: 'Cypher-First Retrieval Failed - Fallback to Standard',
                        error: cypherError instanceof Error ? cypherError.message : String(cypherError),
                        requestId
                    });
                }
            }
            // Fallback to standard retrieval if Cypher failed or returned no results
            if (!retrievalResult) {
                retrievalResult = await (0, retrieval_js_1.retrieveGraphContext)(req, this.retrievalParams, this.caseGraphRepo, this.evidenceRepo);
            }
            // 3. Apply policy filtering to evidence
            const { filteredContext, policyDecisions } = (0, policy_guard_js_1.applyPolicyToContext)(retrievalResult.context, user, this.policyEngine);
            // 4. Check if any evidence is available after filtering
            if (filteredContext.evidenceSnippets.length === 0) {
                const answer = this.buildNoEvidenceAnswer(policyDecisions);
                const response = this.buildResponse(requestId, timestamp, answer, filteredContext);
                // Log audit record
                await this.logAuditRecord(req, user, response, policyDecisions);
                return response;
            }
            // 5. Build LLM context payload
            const llmContext = (0, retrieval_js_1.buildLlmContextPayload)(req, {
                context: filteredContext,
            });
            // 6. Generate answer with LLM
            const llmAnswer = await this.llmAdapter.generateAnswer({
                context: llmContext,
            });
            // 7. Validate and enforce citations
            const validatedAnswer = this.validateAndEnforceCitations(llmAnswer, filteredContext.evidenceSnippets);
            const response = this.buildResponse(requestId, timestamp, validatedAnswer, filteredContext);
            // 8. Log audit record
            await this.logAuditRecord(req, user, response, policyDecisions);
            logger_js_1.default.info({
                message: 'GraphRAG request completed',
                requestId,
                caseId: req.caseId,
                citationCount: validatedAnswer.citations.length,
                unknownCount: validatedAnswer.unknowns.length,
                hasAnswer: validatedAnswer.answerText.length > 0,
            });
            return response;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'GraphRAG request failed',
                requestId,
                caseId: req.caseId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Return safe error response
            const errorAnswer = {
                answerText: error instanceof types_js_1.PolicyViolationError
                    ? error.message
                    : 'An error occurred while processing your request. Please try again.',
                citations: [],
                unknowns: ['System error prevented answer generation.'],
                usedContextSummary: {
                    numNodes: 0,
                    numEdges: 0,
                    numEvidenceSnippets: 0,
                },
            };
            return {
                answer: errorAnswer,
                rawContext: { nodes: [], edges: [], evidenceSnippets: [] },
                requestId,
                timestamp,
            };
        }
    }
    /**
     * Build answer when no evidence is available
     */
    buildNoEvidenceAnswer(policyDecisions) {
        const unknowns = [];
        if (policyDecisions.filteredEvidenceCount > 0) {
            unknowns.push(`${policyDecisions.filteredEvidenceCount} evidence item(s) were not visible due to policy restrictions.`);
        }
        else {
            unknowns.push('No evidence was found for this query in the case.');
        }
        return {
            answerText: FALLBACK_NO_EVIDENCE,
            citations: [],
            unknowns,
            usedContextSummary: {
                numNodes: 0,
                numEdges: 0,
                numEvidenceSnippets: 0,
            },
        };
    }
    /**
     * Validate citations and enforce citation requirements
     */
    validateAndEnforceCitations(llmAnswer, evidenceSnippets) {
        const validEvidenceIds = new Set(evidenceSnippets.map((e) => e.evidenceId));
        const validClaimIds = new Set(evidenceSnippets
            .filter((e) => e.claimId)
            .map((e) => e.claimId));
        // Filter to only valid citations
        const validCitations = llmAnswer.citations.filter((citation) => {
            const evidenceValid = validEvidenceIds.has(citation.evidenceId);
            const claimValid = !citation.claimId || validClaimIds.has(citation.claimId);
            return evidenceValid && claimValid;
        });
        // Check if answer has substantive content but no valid citations
        const hasSubstantiveContent = llmAnswer.answerText.length > 50 &&
            !llmAnswer.answerText.includes(FALLBACK_NO_EVIDENCE) &&
            !llmAnswer.answerText.includes(FALLBACK_CITATION_FAILURE);
        if (hasSubstantiveContent && validCitations.length === 0) {
            // Enforce citation requirement - reject answer
            logger_js_1.default.warn({
                message: 'Answer rejected due to missing citations',
                originalCitations: llmAnswer.citations.length,
                answerLength: llmAnswer.answerText.length,
            });
            return {
                answerText: FALLBACK_CITATION_FAILURE,
                citations: [],
                unknowns: [
                    'The system could not provide citations for the generated answer.',
                    ...llmAnswer.unknowns,
                ],
                usedContextSummary: {
                    numNodes: 0,
                    numEdges: 0,
                    numEvidenceSnippets: evidenceSnippets.length,
                },
            };
        }
        return {
            answerText: llmAnswer.answerText,
            citations: validCitations,
            unknowns: llmAnswer.unknowns,
            usedContextSummary: {
                numNodes: 0, // Filled in by buildResponse
                numEdges: 0,
                numEvidenceSnippets: evidenceSnippets.length,
            },
        };
    }
    /**
     * Build final response
     */
    buildResponse(requestId, timestamp, answer, context) {
        return {
            answer: {
                ...answer,
                usedContextSummary: (0, retrieval_js_1.getContextSummary)(context),
            },
            rawContext: context,
            requestId,
            timestamp,
        };
    }
    /**
     * Log audit record
     */
    async logAuditRecord(req, user, response, policyDecisions) {
        try {
            const record = (0, audit_log_js_1.createAuditRecord)({
                userId: user.userId,
                caseId: req.caseId,
                question: req.question,
                contextSummary: response.answer.usedContextSummary,
                answerSummary: {
                    hasAnswer: response.answer.answerText.length > 0,
                    numCitations: response.answer.citations.length,
                    numUnknowns: response.answer.unknowns.length,
                },
                policyDecisions,
            });
            await this.auditLog.append(record);
        }
        catch (error) {
            // Don't fail the request if audit logging fails
            logger_js_1.default.error({
                message: 'Failed to log audit record',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
exports.EvidenceFirstGraphRagService = EvidenceFirstGraphRagService;
/**
 * Factory function to create configured GraphRAG service
 */
function createGraphRagService(deps) {
    return new EvidenceFirstGraphRagService(deps);
}
