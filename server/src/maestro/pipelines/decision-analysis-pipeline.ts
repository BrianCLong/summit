// server/src/maestro/pipelines/decision-analysis-pipeline.ts
import { randomUUID } from 'crypto';
import { IntelGraphService } from '../../services/IntelGraphService';
import { modelService } from '../../services/ModelService';
import { maestroArtifactService } from '../../services/MaestroArtifactService';
import { Decision, Claim } from '../../graph/schema';

/**
 * @interface DecisionAnalysisInput
 * @description Defines the input parameters required to execute the DecisionAnalysisPipeline.
 */
export interface DecisionAnalysisInput {
  /** The tenant ID to scope all operations to. */
  tenantId: string;
  /** The user or service ID responsible for this run. */
  ownerId: string;
  /** An optional unique identifier for the request. */
  requestId?: string;
  /** The central question the decision analysis aims to answer. */
  question: string;
  /** An array of IntelGraph Entity IDs to be used as context for the decision. */
  intelGraphEntityIds: string[];
  /** An array of constraints or rules to guide the decision-making process. */
  constraints: string[];
}

/**
 * @interface DecisionAnalysisResult
 * @description Defines the output of a successful DecisionAnalysisPipeline execution.
 */
export interface DecisionAnalysisResult {
  /** The final Decision object as created in the IntelGraph. */
  decision: Decision;
  /** A list of all Claim objects that were referenced during the analysis. */
  referencedClaims: Claim[];
  /** A collection of structured artifacts generated during the run. */
  artifacts: {
    decision_summary: object;
    claims_referenced: object;
    sources_manifest: object;
    cost_and_latency: object;
  };
}

/**
 * @class DecisionAnalysisPipeline
 * @description An orchestration pipeline that automates the process of making a decision
 * by fetching provenance data, consulting an AI model, and recording the final decision.
 */
export class DecisionAnalysisPipeline {
  /**
   * @param {IntelGraphService} [igService=IntelGraphService.getInstance()] - An instance of the IntelGraphService.
   * @param {MaestroArtifactService} [artifactService=maestroArtifactService] - An instance of the MaestroArtifactService.
   */
  constructor(
    private igService = IntelGraphService.getInstance(),
    private artifactService = maestroArtifactService
  ) {}

  /**
   * Executes the decision analysis workflow with status tracking and artifact persistence.
   * @param {DecisionAnalysisInput} input - The input parameters for the pipeline.
   * @returns {Promise<DecisionAnalysisResult>} The results and artifacts of the pipeline run.
   */
  async execute(input: DecisionAnalysisInput): Promise<DecisionAnalysisResult> {
    const startTime = Date.now();
    const runId = input.requestId ?? randomUUID();

    await this.artifactService.createRun(runId, 'DecisionAnalysisPipeline');

    try {
      // Step 1: Fetch relevant claims from IntelGraph, gracefully handling errors.
    const claimsPromises = input.intelGraphEntityIds.map(async (id) => {
        try {
            return await this.igService.getEntityClaims(id, input.tenantId);
        } catch (error) {
            console.warn(`Could not retrieve claims for entity ID ${id}: ${error.message}`);
            return null;
        }
    });

    const entityClaimsResults = await Promise.all(claimsPromises);
    const allClaims = entityClaimsResults
        .filter(Boolean)
        .flatMap(ec => ec.claims.map(c => c.claim).filter(Boolean));

    // Step 2: Call the model service to propose a recommendation and rationale.
    const modelContext = {
      claims: allClaims,
      constraints: input.constraints,
    };
      const { recommendation, rationale } = await modelService.analyze(input.question, modelContext);

      // Step 3: Write the final decision back to the IntelGraph.
      const decisionObject: Omit<Decision, keyof import('../../graph/schema').BaseNode> = {
          question: input.question,
          recommendation,
          rationale,
      };

      const createdDecision = await this.igService.createDecision(
          decisionObject,
          allClaims.map(c => c.id),
          input.ownerId,
          input.tenantId
      );

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
    } catch (error) {
        await this.artifactService.recordRunFailure(runId, error.message);
        throw error; // Re-throw the error after recording it
    }
  }
}
