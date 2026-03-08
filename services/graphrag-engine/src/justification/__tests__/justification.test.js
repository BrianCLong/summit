"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const JustificationEvidenceAPI_js_1 = require("../JustificationEvidenceAPI.js");
const graphrag_core_1 = require("@summit/graphrag-core");
describe('JustificationEvidenceAPI', () => {
    let mockDriver;
    let mockSession;
    const mockRegistry = {
        queries: [
            {
                id: 'q1',
                phase: graphrag_core_1.Phase.JUSTIFICATION,
                cypher: 'MATCH (n) RETURN n',
                max_rows: 5,
                projection_allowlist: ['n'],
                tenant_scope: true
            }
        ]
    };
    beforeEach(() => {
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        };
        mockDriver = {
            session: globals_1.jest.fn(() => mockSession),
        };
    });
    test('should fetch proof using registered query', async () => {
        const api = new JustificationEvidenceAPI_js_1.JustificationEvidenceAPI(mockDriver, mockRegistry);
        mockSession.run.mockResolvedValue({
            records: []
        });
        const result = await api.fetchProof('q1', { id: 'test' });
        expect(result.nodes).toEqual([]);
        expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', { id: 'test' });
    });
    test('should throw if query is not in JUSTIFICATION phase', async () => {
        const discoveryRegistry = {
            queries: [
                {
                    id: 'q2',
                    phase: graphrag_core_1.Phase.DISCOVERY,
                    cypher: 'MATCH (n) RETURN n',
                    tenant_scope: true
                }
            ]
        };
        const api = new JustificationEvidenceAPI_js_1.JustificationEvidenceAPI(mockDriver, discoveryRegistry);
        await expect(api.fetchProof('q2', {})).rejects.toThrow('not a JUSTIFICATION query');
    });
});
