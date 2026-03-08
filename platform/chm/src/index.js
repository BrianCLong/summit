"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ruleEngine = exports.workflow = exports.taxonomy = void 0;
exports.applyAndEvaluate = applyAndEvaluate;
const node_crypto_1 = __importDefault(require("node:crypto"));
const taxonomy_js_1 = require("./taxonomy.js");
const events_js_1 = require("./events.js");
const rules_js_1 = require("./rules.js");
const workflow_js_1 = require("./workflow.js");
const audit_js_1 = require("./audit.js");
const db_js_1 = require("./db.js");
const bus = new events_js_1.ChmEventBus();
const taxonomy = new taxonomy_js_1.TaxonomyRegistry(bus, taxonomy_js_1.defaultTaxonomy);
exports.taxonomy = taxonomy;
const rules = [
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
const ruleEngine = new rules_js_1.RuleEngine({ bus, rules });
exports.ruleEngine = ruleEngine;
const workflow = new workflow_js_1.DowngradeWorkflow(bus, taxonomy, ruleEngine);
exports.workflow = workflow;
const pool = (0, db_js_1.createPool)();
const audit = new audit_js_1.AuditReceiptService(pool);
bus.on('chm.tag.applied', async (tag) => {
    await audit.recordTag(tag, 'tag.applied', 'system');
});
bus.on('chm.tag.downgraded', async ({ downgraded }) => {
    await audit.recordTag(downgraded, 'tag.downgraded', 'approver');
});
bus.on('chm.tag.violated', (payload) => {
    console.warn('Export policy violation detected', payload);
});
function applyAndEvaluate(documentId, exportActor) {
    const tag = taxonomy.applyTag(documentId, 'CHM-TS');
    const exportRequest = workflow.handleExport({
        id: node_crypto_1.default.randomUUID(),
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
