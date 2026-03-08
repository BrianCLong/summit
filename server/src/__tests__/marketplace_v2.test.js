"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const types_js_1 = require("../marketplace/types.js");
// Mock PIIDetector directly
globals_1.jest.unstable_mockModule('../privacy/PIIDetector.js', () => ({
    piiDetector: {
        scanObject: globals_1.jest.fn().mockImplementation(async (payload) => {
            // Very simple mock logic: If there's an 'ssn' key, flag it
            if (payload && typeof payload === 'object' && ('ssn' in payload || payload.text?.includes('ssn'))) {
                return { data: { hasPI: true, riskScore: 100 } };
            }
            return { data: { hasPI: false, riskScore: 0 } };
        })
    }
}));
// Mock verifyCosign
globals_1.jest.unstable_mockModule('../plugins/verify.js', () => ({
    verifyCosign: globals_1.jest.fn().mockImplementation(async (sig) => {
        return sig === 'valid_sig';
    })
}));
(0, globals_1.describe)('Marketplace v2 Subgraph Federation', () => {
    let MarketplaceService;
    let FederationService;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        globals_1.jest.resetModules();
        const serviceModule = await Promise.resolve().then(() => __importStar(require('../marketplace/service.js')));
        const fedModule = await Promise.resolve().then(() => __importStar(require('../federation/service.js')));
        MarketplaceService = serviceModule.MarketplaceService;
        FederationService = fedModule.FederationService;
    });
    (0, globals_1.it)('should successfully submit a valid subgraph without PII', async () => {
        const service = MarketplaceService.getInstance();
        // Reset reputations for test isolation
        service.contributorReputations.clear();
        const pkg = {
            id: 'sub-1',
            contributorId: 'org-1',
            payload: { indicators: ['1.1.1.1'] },
            signature: 'valid_sig'
        };
        const result = await service.submitSubgraph(pkg);
        (0, globals_1.expect)(result.status).toBe(types_js_1.SubgraphStatus.APPROVED);
        (0, globals_1.expect)(result.reputationScore).toBe(100);
        // Score should increase after successful submission
        (0, globals_1.expect)(service.getReputation('org-1')).toBe(100);
    });
    (0, globals_1.it)('should quarantine a subgraph containing PII (ssn)', async () => {
        const service = MarketplaceService.getInstance();
        service.contributorReputations.clear();
        const pkg = {
            id: 'sub-2',
            contributorId: 'org-2',
            payload: { threatActor: 'APT1', ssn: '000-00-0000' },
            signature: 'valid_sig'
        };
        const result = await service.submitSubgraph(pkg);
        (0, globals_1.expect)(result.status).toBe(types_js_1.SubgraphStatus.QUARANTINED);
        (0, globals_1.expect)(result.quarantineReason).toContain('PII Detected');
        (0, globals_1.expect)(result.riskScore).toBe(100);
        // Score should decrease due to PII
        (0, globals_1.expect)(service.getReputation('org-2')).toBe(95);
    });
    (0, globals_1.it)('should quarantine a subgraph with an invalid signature', async () => {
        const service = MarketplaceService.getInstance();
        service.contributorReputations.clear();
        const pkg = {
            id: 'sub-3',
            contributorId: 'org-3',
            payload: { some: 'data' },
            signature: 'invalid_sig'
        };
        const result = await service.submitSubgraph(pkg);
        (0, globals_1.expect)(result.status).toBe(types_js_1.SubgraphStatus.QUARANTINED);
        (0, globals_1.expect)(result.quarantineReason).toBe('Invalid cryptographic signature');
        // Score should decrease due to invalid sig
        (0, globals_1.expect)(service.getReputation('org-3')).toBe(90);
    });
    (0, globals_1.it)('should immediately quarantine if contributor reputation is too low', async () => {
        const service = MarketplaceService.getInstance();
        service.contributorReputations.clear();
        // Setup low reputation
        service.contributorReputations.set('bad-org', 40);
        const pkg = {
            id: 'sub-4',
            contributorId: 'bad-org',
            payload: { safe: 'data' },
            signature: 'valid_sig'
        };
        const result = await service.submitSubgraph(pkg);
        (0, globals_1.expect)(result.status).toBe(types_js_1.SubgraphStatus.QUARANTINED);
        (0, globals_1.expect)(result.quarantineReason).toBe('Contributor reputation below threshold');
    });
    (0, globals_1.it)('should correctly format exported STIX/MISP bundles', () => {
        const payload = { threat: "malware" };
        const provenance = { signature: "valid_sig" };
        const stix = FederationService.exportToSTIX('sub-1', payload, provenance);
        (0, globals_1.expect)(stix.type).toBe('bundle');
        (0, globals_1.expect)(stix.objects[0].custom_properties.x_summit_payload).toEqual(payload);
        const misp = FederationService.exportToMISP('sub-1', payload, provenance);
        (0, globals_1.expect)(misp.Event.Attribute[0].x_summit_payload).toEqual(payload);
    });
});
