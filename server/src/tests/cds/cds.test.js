"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CrossDomainGuard_js_1 = require("../../cds/CrossDomainGuard.js");
const ABACEngine_js_1 = require("../../cds/ABACEngine.js");
const ContentInspector_js_1 = require("../../cds/ContentInspector.js");
// Mock Dependencies
const mockEntityRepo = {
    findById: globals_1.jest.fn(),
    create: globals_1.jest.fn(),
};
(0, globals_1.describe)('CrossDomainGuard', () => {
    let guard;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        guard = new CrossDomainGuard_js_1.CrossDomainGuard(mockEntityRepo);
    });
    const highSideUser = {
        userId: 'user-high',
        clearance: 'TOP_SECRET',
        nationality: 'USA',
        accessCompartments: [],
        authorizedDomains: ['high-side'],
    };
    const lowSideUser = {
        userId: 'user-low',
        clearance: 'UNCLASSIFIED',
        nationality: 'USA',
        accessCompartments: [],
        authorizedDomains: ['low-side'],
    };
    (0, globals_1.it)('should block transfer if entity not found', async () => {
        mockEntityRepo.findById.mockResolvedValue(null);
        const result = await guard.processTransfer({
            entityId: 'missing',
            sourceDomainId: 'high-side',
            targetDomainId: 'low-side',
            justification: 'test',
            userContext: highSideUser,
        });
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('Entity not found');
    });
    (0, globals_1.it)('should allow HIGH to LOW transfer if content is clean and user authorized', async () => {
        const entity = {
            id: 'e1',
            tenantId: 'high-side',
            kind: 'Report',
            labels: [],
            props: {
                classification: 'UNCLASSIFIED', // Labeled unclassified but on high side
                content: 'Public info',
            },
        };
        mockEntityRepo.findById.mockResolvedValue(entity);
        mockEntityRepo.create.mockResolvedValue({ ...entity, id: 'new-e1', tenantId: 'low-side' });
        const result = await guard.processTransfer({
            entityId: 'e1',
            sourceDomainId: 'high-side',
            targetDomainId: 'low-side',
            justification: 'Mission requirement',
            userContext: highSideUser,
        });
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(mockEntityRepo.create).toHaveBeenCalled();
    });
    (0, globals_1.it)('should BLOCK HIGH to LOW transfer if content contains dirty words', async () => {
        const entity = {
            id: 'e2',
            tenantId: 'high-side',
            kind: 'Report',
            labels: [],
            props: {
                classification: 'UNCLASSIFIED',
                content: 'This contains TOP SECRET info inadvertently',
            },
        };
        mockEntityRepo.findById.mockResolvedValue(entity);
        const result = await guard.processTransfer({
            entityId: 'e2',
            sourceDomainId: 'high-side',
            targetDomainId: 'low-side',
            justification: 'Oops',
            userContext: highSideUser,
        });
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('Content Inspection Failed');
    });
    (0, globals_1.it)('should allow LOW to HIGH transfer (ingest)', async () => {
        const entity = {
            id: 'e3',
            tenantId: 'low-side',
            kind: 'OSINT',
            labels: [],
            props: {
                classification: 'UNCLASSIFIED',
                content: 'News article',
            },
        };
        mockEntityRepo.findById.mockResolvedValue(entity);
        mockEntityRepo.create.mockResolvedValue({ ...entity, id: 'new-e3', tenantId: 'high-side' });
        const result = await guard.processTransfer({
            entityId: 'e3',
            sourceDomainId: 'low-side',
            targetDomainId: 'high-side',
            justification: 'Ingest',
            userContext: highSideUser, // High side user pulling low side data
        });
        (0, globals_1.expect)(result.success).toBe(true);
    });
});
(0, globals_1.describe)('ABACEngine', () => {
    const abac = new ABACEngine_js_1.ABACEngine();
    (0, globals_1.it)('should deny access if clearance is insufficient', () => {
        const user = {
            userId: 'u1',
            clearance: 'SECRET',
            nationality: 'USA',
            accessCompartments: [],
            authorizedDomains: []
        };
        const label = { classification: 'TOP_SECRET' };
        (0, globals_1.expect)(abac.canAccess(user, label)).toBe(false);
    });
    (0, globals_1.it)('should grant access if clearance is sufficient', () => {
        const user = {
            userId: 'u1',
            clearance: 'TOP_SECRET',
            nationality: 'USA',
            accessCompartments: [],
            authorizedDomains: []
        };
        const label = { classification: 'SECRET' };
        (0, globals_1.expect)(abac.canAccess(user, label)).toBe(true);
    });
});
(0, globals_1.describe)('ContentInspector', () => {
    const inspector = new ContentInspector_js_1.ContentInspector();
    (0, globals_1.it)('should detect dirty words', () => {
        const data = { title: 'Test', body: 'This is NOFORN material' };
        const result = inspector.inspect(data, 'UNCLASSIFIED');
        (0, globals_1.expect)(result.passed).toBe(false);
        (0, globals_1.expect)(result.issues[0]).toContain('NOFORN');
    });
    (0, globals_1.it)('should pass clean content', () => {
        const data = { title: 'Test', body: 'This is public material' };
        const result = inspector.inspect(data, 'UNCLASSIFIED');
        (0, globals_1.expect)(result.passed).toBe(true);
    });
});
