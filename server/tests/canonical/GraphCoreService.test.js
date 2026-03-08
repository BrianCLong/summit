"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GraphCoreService_1 = require("../../src/services/GraphCoreService");
const ledger_1 = require("../../src/provenance/ledger");
const neo4j_1 = require("../../src/db/neo4j");
const types_1 = require("../../src/canonical/types");
// Mock dependencies
globals_1.jest.mock('../../src/provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn(),
        registerClaim: globals_1.jest.fn(),
    }
}));
globals_1.jest.mock('../../src/db/neo4j', () => ({
    neo4jDriver: {
        session: globals_1.jest.fn(),
    }
}));
(0, globals_1.describe)('GraphCoreService', () => {
    let service;
    let mockSession;
    let mockTx;
    (0, globals_1.beforeEach)(() => {
        mockTx = {
            run: globals_1.jest.fn(),
        };
        mockSession = {
            executeWrite: globals_1.jest.fn((cb) => cb(mockTx)),
            executeRead: globals_1.jest.fn((cb) => cb(mockTx)),
            close: globals_1.jest.fn(),
        };
        neo4j_1.neo4jDriver.session.mockReturnValue(mockSession);
        // Reset singleton if possible, or just get instance
        service = GraphCoreService_1.GraphCoreService.getInstance();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should create an entity with policy labels', async () => {
        const policyLabels = {
            origin: 'Source A',
            sensitivity: types_1.SensitivityLevel.CONFIDENTIAL,
            clearance: types_1.ClearanceLevel.SECRET,
            legalBasis: 'Consent',
            needToKnow: ['Intel'],
            purposeLimitation: ['Analysis'],
            retentionClass: types_1.RetentionClass.LONG_TERM,
        };
        mockTx.run
            .mockResolvedValueOnce({ records: [] }) // terminate query result
            .mockResolvedValueOnce({
            records: [{
                    get: () => ({
                        properties: {
                            id: '123',
                            entityType: 'Person',
                            name: 'John Doe',
                            policyLabels: JSON.stringify(policyLabels),
                            validFrom: new Date().toISOString()
                        }
                    })
                }]
        });
        const result = await service.saveEntity('tenant-1', 'Person', { name: 'John Doe' }, policyLabels, 'user-1');
        (0, globals_1.expect)(result.id).toBe('123');
        (0, globals_1.expect)(result.entityType).toBe('Person');
        (0, globals_1.expect)(result.policyLabels).toEqual(policyLabels);
        (0, globals_1.expect)(ledger_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'CREATE_UPDATE_ENTITY',
            resourceType: 'Person',
            payload: globals_1.expect.objectContaining({
                policyLabels: policyLabels
            }),
            metadata: globals_1.expect.objectContaining({
                purpose: 'Create/Update Entity'
            })
        }));
    });
    (0, globals_1.it)('should link evidence to a claim', async () => {
        mockTx.run.mockResolvedValueOnce({
            records: [{
                    get: () => ({
                        properties: {
                            weight: 0.9,
                            description: 'Strong evidence'
                        }
                    })
                }]
        });
        const result = await service.linkEvidenceToClaim('tenant-1', 'claim-1', 'evidence-1', 0.9, 'Strong evidence', 'user-1');
        (0, globals_1.expect)(result).toEqual({
            weight: 0.9,
            description: 'Strong evidence'
        });
        (0, globals_1.expect)(ledger_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'CREATE_RELATIONSHIP',
            resourceType: 'Relationship',
            resourceId: 'evidence-1->claim-1',
            payload: globals_1.expect.objectContaining({
                fromId: 'evidence-1',
                toId: 'claim-1',
                relationType: 'SUPPORTS'
            })
        }));
    });
});
