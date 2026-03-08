"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNlQuerySandboxResponse = buildNlQuerySandboxResponse;
const node_crypto_1 = require("node:crypto");
const cypherEstimator_js_1 = require("./cypherEstimator.js");
const nlToCypher_js_1 = require("./nlToCypher.js");
const sandbox_js_1 = require("./sandbox.js");
const DEFAULT_POLICY = {
    authorityId: 'nl-query-sandbox',
    purpose: 'exploration',
};
const DEFAULT_MAX_DEPTH = 3;
function buildNlQuerySandboxResponse(input) {
    if (!input.prompt?.trim()) {
        throw new Error('Prompt must be provided');
    }
    if (!input.caseScope?.caseId) {
        throw new Error('Case scope with caseId is required');
    }
    const requestId = input.requestId ?? (0, node_crypto_1.randomUUID)();
    const policy = input.policy ?? DEFAULT_POLICY;
    const nlResult = (0, nlToCypher_js_1.nlToCypher)(input.prompt, { schema: input.schema });
    const analysis = (0, cypherEstimator_js_1.analyzeCypherPlan)(nlResult.cypher, {
        maxDepth: input.maxDepth ?? DEFAULT_MAX_DEPTH,
        approved: input.approvedExecution,
        costEstimate: nlResult.costEstimate,
        prompt: input.prompt,
    });
    const warnings = [...nlResult.warnings, ...analysis.warnings];
    const sandboxEnabled = input.sandboxMode !== false;
    const blockedByWrite = Boolean(analysis.estimate.containsWrite);
    const blockedByDepth = analysis.estimate.depth > (input.maxDepth ?? DEFAULT_MAX_DEPTH) &&
        !input.approvedExecution;
    let sandboxPreview;
    if (sandboxEnabled && !blockedByWrite) {
        try {
            sandboxPreview = (0, sandbox_js_1.sandboxExecute)({
                cypher: nlResult.cypher,
                tenantId: input.tenantId ?? 'sandbox-tenant',
                policy,
                approvedExecution: input.approvedExecution ?? false,
                featureFlags: input.featureFlags,
                traceId: input.traceId,
                requestId,
                userId: input.userId,
                environment: process.env.APP_ENV ?? 'sandbox',
            });
        }
        catch (error) {
            warnings.push(`Sandbox execution failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
    }
    else if (sandboxEnabled && blockedByWrite) {
        warnings.push('Sandbox execution skipped because write intent was detected.');
    }
    const allowExecute = Boolean(input.approvedExecution) && !blockedByWrite && !blockedByDepth;
    const decision = allowExecute ? 'approved' : 'sandbox-only';
    console.info(`[nl-query-sandbox] request=${requestId} decision=${decision} depth=${analysis.estimate.depth} rows=${analysis.estimate.rows}`);
    return {
        cypher: nlResult.cypher,
        params: { caseId: input.caseScope.caseId },
        estimate: {
            rows: analysis.estimate.rows,
            depth: analysis.estimate.depth,
            costScore: analysis.estimate.costScore,
            containsWrite: analysis.estimate.containsWrite,
        },
        warnings,
        allowExecute,
        requestId,
        sandboxPreview,
    };
}
