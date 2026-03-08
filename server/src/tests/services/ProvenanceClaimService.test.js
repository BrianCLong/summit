"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ProvenanceClaimService_js_1 = require("../../services/ProvenanceClaimService.js");
const pg_js_1 = require("../../db/pg.js");
const ledger_js_1 = require("../../provenance/ledger.js");
// Mock dependencies
globals_1.jest.mock('../../db/pg.js', () => ({
    pool: {
        connect: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('ProvenanceClaimService', () => {
    let service;
    let mockClient;
    (0, globals_1.beforeEach)(() => {
        service = ProvenanceClaimService_js_1.ProvenanceClaimService.getInstance();
        globals_1.jest.clearAllMocks();
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        // Using any cast to bypass complex type checks on mock methods
        pg_js_1.pool.connect.mockResolvedValue(mockClient);
    });
    (0, globals_1.describe)('registerClaim', () => {
        (0, globals_1.it)('should register a structured claim', async () => {
            const input = {
                content: 'Subject Predicate Object',
                subject: 'EntityA',
                predicate: 'met_with',
                object: 'EntityB',
                claim_type: 'fact',
                confidence: 0.9,
                evidence_ids: [],
                source_id: 'source-123',
                license_id: 'lic-123',
                created_by: 'user-1',
                tenant_id: 'tenant-1',
            };
            const mockClaim = { id: 'claim-123', ...input };
            mockClient.query.mockImplementation((query) => {
                if (query.includes('INSERT INTO claims_registry')) {
                    return { rows: [mockClaim] };
                }
                return { rows: [] };
            });
            const result = await service.registerClaim(input);
            (0, globals_1.expect)(result).toEqual(mockClaim);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO claims_registry'), globals_1.expect.arrayContaining(['EntityA', 'met_with', 'EntityB']));
            (0, globals_1.expect)(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalled();
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });
    (0, globals_1.describe)('linkClaimToEvidence', () => {
        (0, globals_1.it)('should link evidence with granular details', async () => {
            const input = {
                claim_id: 'claim-123',
                evidence_id: 'evidence-456',
                relation_type: 'SUPPORTS',
                offset_start: 10,
                offset_end: 20,
                segment_text: 'evidence text',
                created_by: 'user-1',
                tenant_id: 'tenant-1',
            };
            const mockLink = { id: 'link-789', ...input };
            mockClient.query.mockImplementation((query) => {
                if (query.includes('SELECT id FROM claim_evidence_links')) {
                    return { rows: [] };
                }
                if (query.includes('INSERT INTO claim_evidence_links')) {
                    return { rows: [mockLink] };
                }
                return { rows: [] };
            });
            const result = await service.linkClaimToEvidence(input);
            (0, globals_1.expect)(result).toEqual(mockLink);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO claim_evidence_links'), globals_1.expect.arrayContaining([10, 20, 'evidence text']));
        });
    });
});
