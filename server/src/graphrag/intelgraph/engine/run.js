"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScopedTemplate = runScopedTemplate;
const plan_1 = require("./plan");
const compile_1 = require("./compile");
const evidence_id_1 = require("../template/evidence-id");
async function runScopedTemplate(ctx, template, params, scope) {
    (0, plan_1.assertScope)(scope);
    const plan = (0, compile_1.compileTemplate)(template, params, scope);
    let result;
    if (ctx.neo4j) {
        // Here we would enforce plan budgets via the DB driver capabilities.
        result = await ctx.neo4j.run(plan.compiledCypher, plan.parameters);
    }
    else {
        // Mock result for demonstration/testing if no context is provided
        result = {
            records: [
                { get: (key) => ({ id: 'mock-node-1', labels: ['Account'], properties: { handle: 'alice' } }) }
            ],
            summary: {
                counters: { updates: () => ({ nodesCreated: 0, relationshipsCreated: 0 }) },
                resultAvailableAfter: 10,
                resultConsumedAfter: 5
            }
        };
    }
    const evidenceId = (0, evidence_id_1.generateEvidenceId)(template.evidence.idPattern);
    // Parse result into GraphNode and GraphEdge shapes
    const nodes = result.records?.map((record) => {
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
