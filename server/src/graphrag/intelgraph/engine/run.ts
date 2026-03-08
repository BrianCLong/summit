import { IntelGraphTemplate } from '../template/template-registry';
import { assertScope, ScopeInput } from './plan';
import { compileTemplate } from './compile';
import { generateEvidenceId } from '../template/evidence-id';

// Mock Neo4j context
export interface Neo4jContext {
  run(query: string, params: Record<string, unknown>): Promise<any>;
}

export async function runScopedTemplate(
  ctx: { neo4j?: Neo4jContext },
  template: IntelGraphTemplate,
  params: Record<string, unknown>,
  scope: ScopeInput
) {
  assertScope(scope);
  const plan = compileTemplate(template, params, scope);

  let result;
  if (ctx.neo4j) {
    // Here we would enforce plan budgets via the DB driver capabilities.
    result = await ctx.neo4j.run(plan.compiledCypher, plan.parameters);
  } else {
    // Mock result for demonstration/testing if no context is provided
    result = {
      records: [
        { get: (key: string) => ({ id: 'mock-node-1', labels: ['Account'], properties: { handle: 'alice' } }) }
      ],
      summary: {
        counters: { updates: () => ({ nodesCreated: 0, relationshipsCreated: 0 }) },
        resultAvailableAfter: 10,
        resultConsumedAfter: 5
      }
    };
  }

  const evidenceId = generateEvidenceId(template.evidence.idPattern);

  // Parse result into GraphNode and GraphEdge shapes
  const nodes = result.records?.map((record: any) => {
    // Assuming simple mapping for mock
    const nodeData = record.get('n');
    return {
      id: nodeData?.id || 'n1',
      label: nodeData?.labels?.[0] || 'Entity'
    };
  }) || [];

  return {
    templateId: template.id,
    templateVersion: template.version,
    runId: `igrun_${Date.now()}`,
    tenantScope: `${scope.tenantId}/${scope.workspaceId}`,
    nodes: nodes,
    edges: [],
    matches: [],
    provenance: [{ sourceId: 'mock-source', firstSeenAt: new Date().toISOString(), confidence: 0.9 }],
    warnings: [],
    cost: { dbHits: 100, rows: nodes.length, elapsedMs: 15 },
    evidenceIds: [evidenceId]
  };
}
