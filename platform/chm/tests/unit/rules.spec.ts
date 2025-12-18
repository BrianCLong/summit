import { describe, expect, it } from 'vitest';
import { ChmEventBus } from '../../src/events.js';
import { RuleEngine } from '../../src/rules.js';
import { DowngradeWorkflow } from '../../src/workflow.js';
import { defaultTaxonomy, TaxonomyRegistry } from '../../src/taxonomy.js';
import { type TagRule } from '../../src/config.js';

const rules: TagRule[] = [
  {
    tag: 'CHM-TS',
    residency: 'us',
    license: 'domestic-only',
    exportable: false,
    rationale: 'Top secret cannot export without downgrade'
  },
  {
    tag: 'CHM-S',
    residency: 'us',
    license: 'exportable',
    exportable: true,
    rationale: 'Secret content exportable with correct license'
  }
];

describe('Rule engine residency and license enforcement', () => {
  const bus = new ChmEventBus();
  const taxonomy = new TaxonomyRegistry(bus, defaultTaxonomy);
  const ruleEngine = new RuleEngine({ bus, rules });
  const workflow = new DowngradeWorkflow(bus, taxonomy, ruleEngine);

  it('blocks export when license is insufficient', () => {
    const tag = taxonomy.applyTag('doc-1', 'CHM-TS');
    const exportRequest = workflow.handleExport({
      id: 'export-1',
      documentId: 'doc-1',
      context: { residency: 'us', license: 'domestic-only', actorId: 'alice', destination: 'eu-cloud' },
      tag,
      decision: { allowed: false, reason: 'init' }
    });
    expect(exportRequest.decision.allowed).toBe(false);
    expect(exportRequest.decision.reason).toContain('Export blocked');
  });

  it('requires dual approval for downgrade then allows export under relaxed tag', () => {
    const tag = taxonomy.applyTag('doc-2', 'CHM-TS');
    const request = workflow.requestDowngrade({
      id: 'req-1',
      documentId: 'doc-2',
      requestedBy: 'alice',
      targetLevel: 'S',
      rationale: 'Need to collaborate with exportable partner',
      requiredApprovals: 2
    });

    workflow.approveDowngrade(request.id, 'approver-a');
    expect(request.status).toBe('pending');
    workflow.approveDowngrade(request.id, 'approver-b');
    expect(request.status).toBe('approved');

    const downgraded = workflow.finalizeDowngrade(request.id, tag);
    const exportRequest = workflow.handleExport({
      id: 'export-2',
      documentId: 'doc-2',
      context: { residency: 'us', license: 'exportable', actorId: 'alice', destination: 'ally' },
      tag: downgraded,
      decision: { allowed: false, reason: 'init' }
    });

    expect(exportRequest.decision.allowed).toBe(true);
    expect(exportRequest.decision.reason).toContain('Export allowed');
  });
});
