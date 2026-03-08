"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_js_1 = require("../../src/events.js");
const rules_js_1 = require("../../src/rules.js");
const workflow_js_1 = require("../../src/workflow.js");
const taxonomy_js_1 = require("../../src/taxonomy.js");
const rules = [
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
(0, vitest_1.describe)('Rule engine residency and license enforcement', () => {
    const bus = new events_js_1.ChmEventBus();
    const taxonomy = new taxonomy_js_1.TaxonomyRegistry(bus, taxonomy_js_1.defaultTaxonomy);
    const ruleEngine = new rules_js_1.RuleEngine({ bus, rules });
    const workflow = new workflow_js_1.DowngradeWorkflow(bus, taxonomy, ruleEngine);
    (0, vitest_1.it)('blocks export when license is insufficient', () => {
        const tag = taxonomy.applyTag('doc-1', 'CHM-TS');
        const exportRequest = workflow.handleExport({
            id: 'export-1',
            documentId: 'doc-1',
            context: { residency: 'us', license: 'domestic-only', actorId: 'alice', destination: 'eu-cloud' },
            tag,
            decision: { allowed: false, reason: 'init' }
        });
        (0, vitest_1.expect)(exportRequest.decision.allowed).toBe(false);
        (0, vitest_1.expect)(exportRequest.decision.reason).toContain('Export blocked');
    });
    (0, vitest_1.it)('requires dual approval for downgrade then allows export under relaxed tag', () => {
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
        (0, vitest_1.expect)(request.status).toBe('pending');
        workflow.approveDowngrade(request.id, 'approver-b');
        (0, vitest_1.expect)(request.status).toBe('approved');
        const downgraded = workflow.finalizeDowngrade(request.id, tag);
        const exportRequest = workflow.handleExport({
            id: 'export-2',
            documentId: 'doc-2',
            context: { residency: 'us', license: 'exportable', actorId: 'alice', destination: 'ally' },
            tag: downgraded,
            decision: { allowed: false, reason: 'init' }
        });
        (0, vitest_1.expect)(exportRequest.decision.allowed).toBe(true);
        (0, vitest_1.expect)(exportRequest.decision.reason).toContain('Export allowed');
    });
});
