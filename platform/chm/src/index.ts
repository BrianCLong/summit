import crypto from 'node:crypto';
import { defaultTaxonomy, TaxonomyRegistry } from './taxonomy.js';
import { ChmEventBus } from './events.js';
import { RuleEngine } from './rules.js';
import { DowngradeWorkflow } from './workflow.js';
import { AuditReceiptService } from './audit.js';
import { createPool } from './db.js';
import { type TagRule } from './config.js';

const bus = new ChmEventBus();
const taxonomy = new TaxonomyRegistry(bus, defaultTaxonomy);
const rules: TagRule[] = [
  {
    tag: 'CHM-TS',
    residency: 'us',
    license: 'domestic-only',
    exportable: false,
    rationale: 'Top secret data must remain domestic'
  },
  {
    tag: 'CHM-S',
    residency: 'us',
    license: 'exportable',
    exportable: true,
    rationale: 'Secret export requires explicit license'
  }
];
const ruleEngine = new RuleEngine({ bus, rules });
const workflow = new DowngradeWorkflow(bus, taxonomy, ruleEngine);
const pool = createPool();
const audit = new AuditReceiptService(pool);

bus.on('chm.tag.applied', async (tag) => {
  await audit.recordTag(tag, 'tag.applied', 'system');
});

bus.on('chm.tag.downgraded', async ({ downgraded }) => {
  await audit.recordTag(downgraded, 'tag.downgraded', 'approver');
});

bus.on('chm.tag.violated', (payload) => {
  console.warn('Export policy violation detected', payload);
});

export function applyAndEvaluate(documentId: string, exportActor: string) {
  const tag = taxonomy.applyTag(documentId, 'CHM-TS');
  const exportRequest = workflow.handleExport({
    id: crypto.randomUUID(),
    documentId,
    context: {
      residency: 'us',
      license: 'domestic-only',
      actorId: exportActor,
      destination: 'partner-cloud'
    },
    tag,
    decision: { allowed: false, reason: 'pending evaluation' }
  });
  return exportRequest;
}

export { taxonomy, workflow, ruleEngine };
