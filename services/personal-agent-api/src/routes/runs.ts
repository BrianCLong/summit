import { FastifyInstance } from 'fastify';

export async function runRoutes(fastify: FastifyInstance) {
  fastify.get('/:run_id', async (request, reply) => {
    const { run_id } = request.params as { run_id: string };

    return {
      run_id: run_id,
      status: 'completed',
      outputs: {
        summary_md: 'Agent triaged the alert successfully.',
        enrichment: { iocs: [], similar_cases: [] },
        recommended_actions: [
          { action: 'soar.containment.isolate_host', requires_approval: true }
        ]
      },
      governance: {
        policy_version: 'policyset_sha256:abc123',
        policy_decisions: [{ rule_id: 'OPA.RUN.ALLOW', outcome: 'allow' }],
        audit_record_ids: ['aud_1001', 'aud_1002'],
        evidence_bundle_ref: `ledger://evidence/${run_id}`
      }
    };
  });
}
