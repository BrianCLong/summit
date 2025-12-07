import { KnowledgePlan, PlanResult } from './types.js';
import { GraphStore } from '../store.js';

export class CKPEngine {
  private store: GraphStore;

  constructor() {
    this.store = new GraphStore();
  }

  private simulateLLMSummary(data: any): string {
    return `Summary of provided data: ${JSON.stringify(data).slice(0, 50)}... Analysis indicates attention required.`;
  }

  async executePlan(plan: KnowledgePlan, inputs: Record<string, any>, tenantId: string): Promise<PlanResult> {
    console.log(`Executing Plan: ${plan.name} for tenant ${tenantId}`);

    const context: Record<string, any> = { ...inputs };

    for (const step of plan.steps) {
      console.log(`Step: ${step.id} - ${step.operation}`);

      switch (step.operation) {
        case 'query':
          // Simplified: Replace params in cypher string
          let cypher = step.params.cypher;
          // Security: In production, use real params object, don't string-replace!
          // Here, we assume step.params.cypher is safe/trusted template and inputs are safe values.
          const results = await this.store.runCypher(cypher, { ...context, tenantId });
          context[step.id] = results;
          break;

        case 'summarize':
          // In production, this would call LLMService.summarize()
          // For now, we simulate a robust response structure
          context[step.id] = this.simulateLLMSummary(context[step.params.source]);
          break;

        case 'risk_check':
          const data = context[step.params.source];
          // Deterministic logic based on array length
          context[step.id] = Array.isArray(data) && data.length > 5 ? 'HIGH' : 'LOW';
          break;
      }
    }

    return {
      planId: plan.id,
      runId: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      artifacts: context,
      summary: context['final_summary']
    };
  }

  // Built-in Plans
  static readonly DEPENDENCY_BLAST_RADIUS: KnowledgePlan = {
    id: 'ckp_blast_radius',
    name: 'Dependency Blast Radius',
    description: 'Analyze impact of a change to an asset.',
    version: 1,
    steps: [
      {
        id: 'dependents',
        description: 'Find dependent assets',
        operation: 'query',
        params: {
          cypher: `
            MATCH (root:Asset { globalId: $assetId, tenantId: $tenantId })
            MATCH (root)<-[:USES|DEPENDS_ON*1..3]-(dependent)
            RETURN dependent
          `
        }
      },
      {
        id: 'risk_score',
        description: 'Calculate risk',
        operation: 'risk_check',
        params: { source: 'dependents' }
      }
    ]
  };
}
