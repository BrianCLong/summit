"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const search_js_1 = require("../src/search/search.js");
// Mock dependencies
globals_1.jest.mock('pg', () => {
    const mPool = {
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    };
    return { Pool: globals_1.jest.fn(() => mPool) };
});
globals_1.jest.mock('../src/config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        pool: {
            connect: globals_1.jest.fn(),
            query: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
        },
        query: globals_1.jest.fn(),
    })),
    getNeo4jDriver: globals_1.jest.fn(() => ({
        session: globals_1.jest.fn(() => ({
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
        })),
    })),
}));
globals_1.jest.mock('../src/services/EmbeddingService', () => {
    return globals_1.jest.fn().mockImplementation(() => ({
        generateEmbedding: globals_1.jest.fn().mockResolvedValue(new Array(3072).fill(0.1))
    }));
});
// Mock SynonymService completely to avoid import.meta issues in Jest
globals_1.jest.mock('../src/services/SemanticSearchService.js', () => {
    return globals_1.jest.fn().mockImplementation(() => ({
        searchCases: globals_1.jest.fn().mockResolvedValue([]),
        searchDocs: globals_1.jest.fn().mockResolvedValue([]),
        close: globals_1.jest.fn(),
    }));
});
(0, globals_1.describe)('Docs Search Integration', () => {
    (0, globals_1.it)('should be defined', () => {
        (0, globals_1.expect)(search_js_1.searchAll).toBeDefined();
    });
});
