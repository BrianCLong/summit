"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.IntelGraphService = void 0;
const globals_1 = require("@jest/globals");
const mockIntelGraphInstance = {
    query: globals_1.jest.fn().mockResolvedValue({ records: [] }),
    createEntity: globals_1.jest.fn().mockResolvedValue({ id: 'mock-entity-id' }),
    updateEntity: globals_1.jest.fn().mockResolvedValue({ id: 'mock-entity-id' }),
    deleteEntity: globals_1.jest.fn().mockResolvedValue(true),
    createRelationship: globals_1.jest.fn().mockResolvedValue({ id: 'mock-rel-id' }),
    search: globals_1.jest.fn().mockResolvedValue([]),
    getEntity: globals_1.jest.fn().mockResolvedValue(null),
    getRelationships: globals_1.jest.fn().mockResolvedValue([]),
    runCypher: globals_1.jest.fn().mockResolvedValue({ records: [] }),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
};
class IntelGraphService {
    static instance = null;
    static getInstance = globals_1.jest.fn(() => {
        if (!IntelGraphService.instance) {
            IntelGraphService.instance = new IntelGraphService();
        }
        return IntelGraphService.instance;
    });
    static resetInstance = globals_1.jest.fn(() => {
        IntelGraphService.instance = null;
    });
    query = globals_1.jest.fn().mockResolvedValue({ records: [] });
    createEntity = globals_1.jest.fn().mockResolvedValue({ id: 'mock-entity-id' });
    updateEntity = globals_1.jest.fn().mockResolvedValue({ id: 'mock-entity-id' });
    deleteEntity = globals_1.jest.fn().mockResolvedValue(true);
    createRelationship = globals_1.jest.fn().mockResolvedValue({ id: 'mock-rel-id' });
    search = globals_1.jest.fn().mockResolvedValue([]);
    getEntity = globals_1.jest.fn().mockResolvedValue(null);
    getRelationships = globals_1.jest.fn().mockResolvedValue([]);
    runCypher = globals_1.jest.fn().mockResolvedValue({ records: [] });
    close = globals_1.jest.fn().mockResolvedValue(undefined);
}
exports.IntelGraphService = IntelGraphService;
exports.getInstance = IntelGraphService.getInstance;
exports.default = IntelGraphService;
