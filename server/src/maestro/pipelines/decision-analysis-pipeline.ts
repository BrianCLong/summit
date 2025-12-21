// server/src/maestro/pipelines/decision-analysis-pipeline.ts
import { randomUUID } from 'crypto';
import { IntelGraphService } from '../../services/IntelGraphService';
import { Decision, Claim } from '../../graph/schema';

// Mock model service for now
const mockModelService = {
  async analyze(question: string, context: any): Promise<{ recommendation: string; rationale: string; }> {
    // In a real scenario, this would call an LLM or other model
    console.log(`Analyzing question: "${question}" with context:`, context);
    return Promise.resolve({
      recommendation: `Based on the provided context, the best course of action is to proceed with Option A.`,
      rationale: `Option A is recommended due to its strong alignment with historical data and minimal risk profile identified in the claims.`,
    });
  },
};

export interface DecisionAnalysisInput {
  tenantId: string;
  ownerId: string;
  requestId?: string;
  question: string;
  intelGraphEntityIds: string[];
  constraints: string[];
}

export interface DecisionAnalysisResult {
  decision: Decision;
  referencedClaims: Claim[];
  artifacts: {
    decision_summary: object;
    claims_referenced: object;
    sources_manifest: object; // This will be implemented in the next step
    cost_and_latency: object;
  };
}

export class DecisionAnalysisPipeline {
  constructor(private igService = IntelGraphService.getInstance()) {}

  async execute(input: DecisionAnalysisInput): Promise<DecisionAnalysisResult> {
    const startTime = Date.now();
    const requestId = input.requestId ?? randomUUID();

    // 1. Fetch relevant claims/evidence from IntelGraph, gracefully handling errors
    const claimsPromises = input.intelGraphEntityIds.map(async (id) => {
        try {
            return await this.igService.getEntityClaims(id, input.tenantId);
        } catch (error) {
            console.warn(`Could not retrieve claims for entity ID ${id}: ${error.message}`);
            return null; // Return null for failed lookups to avoid crashing Promise.all
        }
    });

    const entityClaimsResults = await Promise.all(claimsPromises);
    const allClaims = entityClaimsResults
        .filter(Boolean) // Filter out any null results from failed fetches
        .flatMap(ec => ec.claims.map(c => c.claim).filter(Boolean));

    // 2. Call model(s) to propose options & reasoning
    const modelContext = {
      claims: allClaims,
      constraints: input.constraints,
    };
    const { recommendation, rationale } = await mockModelService.analyze(input.question, modelContext);

    // 3. Write back the decision to IntelGraph
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

    // 4. Generate Artifacts
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
        cost_units: latencyMs * 0.01, // Mock cost calculation
      },
    };

    return {
      decision: createdDecision,
      referencedClaims: allClaims,
      artifacts,
    };
  }
}
