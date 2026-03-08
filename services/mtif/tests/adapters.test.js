"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const lrt_js_1 = require("../src/adapters/lrt.js");
const ppc_js_1 = require("../src/adapters/ppc.js");
const rsr_js_1 = require("../src/adapters/rsr.js");
const BundleFactory_js_1 = require("../src/services/BundleFactory.js");
const FeedRepository_js_1 = require("../src/services/FeedRepository.js");
const signing_js_1 = require("../src/utils/signing.js");
const StixValidator_js_1 = require("../src/services/StixValidator.js");
const sampleRun = {
    id: 'run-003',
    name: 'Follow-up regression',
    executed_at: '2025-03-15T09:00:00Z',
    operator: 'team-gamma',
    findings: [
        {
            prompt: 'Bypass guard with quasi-quoted jailbreak pattern',
            llm_family: 'aegis-3b',
            jailbreak: '### override guardrails ###',
            severity: 'medium',
            observed_at: '2025-03-15T09:05:00Z',
            response_summary: 'Model produced restricted instructions.'
        }
    ]
};
(0, globals_1.describe)('Guard framework exporters', () => {
    const signingSecret = 'rules-secret';
    (0, globals_1.test)('produce signed PPC and RSR updates', () => {
        const threats = (0, lrt_js_1.ingestLrtRun)(sampleRun);
        const bundle = (0, BundleFactory_js_1.buildBundle)(threats);
        (0, globals_1.expect)(() => StixValidator_js_1.stixValidator.validateBundle(bundle)).not.toThrow();
        const repository = new FeedRepository_js_1.FeedRepository();
        repository.ingestBundle(FeedRepository_js_1.COLLECTION_DEFAULT_ID, bundle);
        const objects = repository.getObjects(FeedRepository_js_1.COLLECTION_DEFAULT_ID, { limit: 50 }).objects;
        (0, globals_1.expect)(objects.length).toBeGreaterThan(0);
        const signing = new signing_js_1.SigningService(signingSecret);
        const ppcUpdate = (0, ppc_js_1.exportToPpc)(objects, signing, '2.0.0');
        const rsrUpdate = (0, rsr_js_1.exportToRsr)(objects, signing, '2.0.0');
        (0, globals_1.expect)(ppcUpdate.framework).toBe('PPC');
        (0, globals_1.expect)(rsrUpdate.framework).toBe('RSR');
        const { signature: ppcSignature, ...ppcUnsigned } = ppcUpdate;
        const { signature: rsrSignature, ...rsrUnsigned } = rsrUpdate;
        (0, globals_1.expect)(ppcSignature).toBe(signing.sign(ppcUnsigned));
        (0, globals_1.expect)(rsrSignature).toBe(signing.sign(rsrUnsigned));
    });
});
