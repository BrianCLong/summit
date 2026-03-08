"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DiscoveryRetriever_js_1 = require("../DiscoveryRetriever.js");
describe('DiscoveryRetriever', () => {
    let mockDriver;
    let mockSession;
    beforeEach(() => {
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        };
        mockDriver = {
            session: globals_1.jest.fn(() => mockSession),
        };
    });
    test('should return candidates within budget', async () => {
        const retriever = new DiscoveryRetriever_js_1.DiscoveryRetriever(mockDriver);
        const mockRecords = [
            {
                get: (key) => {
                    if (key === 'entityId')
                        return 'e1';
                    if (key === 'pathNodes')
                        return [{}, {}];
                    if (key === 'pathRels')
                        return [{}];
                    if (key === 'seedId')
                        return 'seed1';
                    if (key === 'confidenceScore')
                        return 0.9;
                    return null;
                }
            }
        ];
        mockSession.run.mockResolvedValue({
            records: mockRecords
        });
        const result = await retriever.discover('test query', ['seed1'], {
            maxHops: 2,
            maxCandidates: 10,
            timeoutMs: 1000
        });
        expect(result.candidates.length).toBe(1);
        expect(result.metadata.hopsReached).toBe(2);
        expect(mockSession.run).toHaveBeenCalledWith(expect.stringContaining('MATCH path = (n)-[*1..2]-(m:Entity)'), expect.any(Object));
    });
});
