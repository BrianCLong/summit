"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const index_js_1 = require("../index.js");
(0, node_test_1.default)('detects contract drift across versions', () => {
    const current = {
        id: 'dpic-001',
        dataset: 'alpha',
        version: '1.0.0',
        owner: 'alpha',
        license: { name: 'CC-BY-4.0' },
        termsHash: '',
        fields: [
            { name: 'user_id', type: 'string', nullable: false, classification: 'pii' },
            { name: 'region', type: 'string', nullable: false }
        ]
    };
    const proposed = {
        ...current,
        version: '1.1.0',
        fields: [
            ...current.fields,
            { name: 'dp_score', type: 'number', nullable: true, classification: 'dp', unit: 'epsilon' }
        ]
    };
    const diffs = (0, index_js_1.diffContracts)(current, proposed);
    strict_1.default.equal(diffs.length, 1);
    strict_1.default.equal(diffs[0].field, 'dp_score');
    strict_1.default.equal(diffs[0].change, 'added');
});
(0, node_test_1.default)('quarantine to recertification loop', () => {
    const registry = new index_js_1.QuarantineRegistry();
    const ca = new index_js_1.CertificateAuthority();
    const workflow = new index_js_1.CertificationWorkflow(ca);
    const spec = {
        id: 'dpic-002',
        dataset: 'beta',
        version: '1.0.0',
        owner: 'beta',
        license: { name: 'CC-BY-4.0' },
        termsHash: '',
        fields: []
    };
    const record = registry.quarantine(spec.id, spec.version, 'no schema defined');
    strict_1.default.ok(record);
    strict_1.default.equal(registry.active().length, 1);
    spec.fields.push({ name: 'event_id', type: 'string', nullable: false });
    const { cert } = workflow.certify(spec);
    strict_1.default.ok(cert.signature);
    const resolved = registry.resolve(spec.id, spec.version, 'schema provided and certified');
    strict_1.default.ok(resolved?.releasedAt);
    strict_1.default.equal(registry.active().length, 0);
});
(0, node_test_1.default)('production ingest blocked without certification', () => {
    const ca = new index_js_1.CertificateAuthority();
    const workflow = new index_js_1.CertificationWorkflow(ca);
    const spec = {
        id: 'dpic-003',
        dataset: 'gamma',
        version: '1.0.0',
        owner: 'gamma',
        license: { name: 'CC0' },
        termsHash: '',
        fields: [{ name: 'user_id', type: 'string', nullable: false, classification: 'pii' }]
    };
    strict_1.default.throws(() => workflow.enforceProductionGate(spec));
    workflow.certify(spec);
    strict_1.default.doesNotThrow(() => workflow.enforceProductionGate(spec));
});
(0, node_test_1.default)('dp and pii flags surface in validation', () => {
    const spec = {
        id: 'dpic-004',
        dataset: 'delta',
        version: '1.0.0',
        owner: 'delta',
        license: { name: 'CC-BY-4.0' },
        termsHash: '',
        fields: [
            { name: 'user_id', type: 'string', nullable: false, classification: 'pii' },
            { name: 'privacy_budget', type: 'number', nullable: false, classification: 'dp', unit: 'epsilon' }
        ]
    };
    const specValidator = new index_js_1.ContractSpecification(spec);
    const findings = specValidator.validate();
    const warnings = findings.filter((finding) => finding.severity === 'warning');
    strict_1.default.ok(warnings.length >= 1);
});
