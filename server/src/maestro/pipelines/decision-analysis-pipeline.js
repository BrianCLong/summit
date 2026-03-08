"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionAnalysisPipeline = void 0;
// server/src/maestro/pipelines/decision-analysis-pipeline.ts
const crypto_1 = require("crypto");
const IntelGraphService_js_1 = require("../../services/IntelGraphService.js");
const MaestroArtifactService_js_1 = require("../../services/MaestroArtifactService.js");
// Stub model service until proper implementation
const modelService = {
    async analyze(question, context) {
        return { recommendation: 'Pending analysis', rationale: 'Model service not configured' };
    }
};
/**
 * @class DecisionAnalysisPipeline
 * @description An orchestration pipeline that automates the process of making a decision
 * by fetching provenance data, consulting an AI model, and recording the final decision.
 */
class DecisionAnalysisPipeline {
    igService;
    artifactService;
    /**
     * @param {IntelGraphService} [igService=IntelGraphService.getInstance()] - An instance of the IntelGraphService.
     * @param {MaestroArtifactService} [artifactService=maestroArtifactService] - An instance of the MaestroArtifactService.
     */
    constructor(igService = IntelGraphService_js_1.IntelGraphService.getInstance(), artifactService = MaestroArtifactService_js_1.maestroArtifactService) {
        this.igService = igService;
        this.artifactService = artifactService;
    }
    /**
     * Executes the decision analysis workflow with status tracking and artifact persistence.
     * @param {DecisionAnalysisInput} input - The input parameters for the pipeline.
     * @returns {Promise<DecisionAnalysisResult>} The results and artifacts of the pipeline run.
     */
    async execute(input) {
        const startTime = Date.now();
        const runId = input.requestId ?? (0, crypto_1.randomUUID)();
        await this.artifactService.createRun(runId, 'DecisionAnalysisPipeline');
        try {
            // Step 1: Fetch relevant claims from IntelGraph, gracefully handling errors.
            const claimsPromises = input.intelGraphEntityIds.map(async (id) => {
                try {
                    return await this.igService.getEntityClaims(id, input.tenantId);
                }
                catch (error) {
                    console.warn(`Could not retrieve claims for entity ID ${id}: ${error.message}`);
                    return null;
                }
            });
            const entityClaimsResults = await Promise.all(claimsPromises);
            const allClaims = entityClaimsResults
                .filter(Boolean)
                .flatMap(ec => ec.claims.map((c) => c.claim).filter(Boolean));
            // Step 2: Call the model service to propose a recommendation and rationale.
            const modelContext = {
                claims: allClaims,
                constraints: input.constraints,
            };
            const { recommendation, rationale } = await modelService.analyze(input.question, modelContext);
            // Step 3: Write the final decision back to the IntelGraph.
            const decisionObject = {
                question: input.question,
                recommendation,
                rationale,
            };
            const createdDecision = await this.igService.createDecision(decisionObject, allClaims.map(c => c.id), input.ownerId, input.tenantId);
            const endTime = Date.now();
            const latencyMs = endTime - startTime;
            // Step 4: Generate a structured set of artifacts for reporting and auditing.
            const artifacts = {
                decision_summary: {
                    id: createdDecision.id,
                    question: createdDecision.question,
                    recommendation: createdDecision.recommendation,
                    rationale: createdDecision.rationale,
                },
                claims_referenced: allClaims.map(c => ({ id: c.id, statement: c.statement })),
                sources_manifest: {
                    note: "Source manifest generation will be part of the Disclosure Pack step.",
                    sources: []
                },
                cost_and_latency: {
                    latency_ms: latencyMs,
                    cost_units: latencyMs * 0.01, // Mock cost calculation for demonstration.
                },
            };
            await this.artifactService.recordRunSuccess(runId, artifacts);
            return {
                decision: createdDecision,
                referencedClaims: allClaims,
                artifacts,
            };
        }
        catch (error) {
            await this.artifactService.recordRunFailure(runId, error.message);
            throw error; // Re-throw the error after recording it
        }
    }
}
exports.DecisionAnalysisPipeline = DecisionAnalysisPipeline;
