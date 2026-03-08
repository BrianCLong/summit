"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EntityResolutionService_js_1 = require("../EntityResolutionService.js");
const node_crypto_1 = require("node:crypto");
(0, globals_1.describe)('EntityResolutionService', () => {
    let service;
    const mockSalt = 'test-salt';
    (0, globals_1.beforeEach)(() => {
        service = new EntityResolutionService_js_1.EntityResolutionService({
            privacy: {
                saltedHash: false,
                salt: mockSalt
            }
        });
    });
    (0, globals_1.describe)('normalizeEntityProperties', () => {
        (0, globals_1.it)('should normalize name and email', () => {
            const entity = {
                name: '  John Doe  ',
                email: 'JOHN.DOE@Example.COM ',
            };
            const normalized = service.normalizeEntityProperties(entity);
            (0, globals_1.expect)(normalized.name).toBe('john doe');
            (0, globals_1.expect)(normalized.email).toBe('john.doe@example.com');
        });
        // TODO: Implement URL normalization in EntityResolutionService
        globals_1.it.skip('should normalize URL', () => {
            const entity = { url: 'https://WWW.Example.com/Profile' };
            const normalized = service.normalizeEntityProperties(entity);
            (0, globals_1.expect)(normalized.url).toBe('www.example.com/profile');
        });
        (0, globals_1.it)('should handle missing properties', () => {
            const entity = { name: 'John' };
            const normalized = service.normalizeEntityProperties(entity);
            (0, globals_1.expect)(normalized.name).toBe('john');
            (0, globals_1.expect)(normalized.email).toBeUndefined();
        });
        // TODO: Implement privacy mode email hashing in EntityResolutionService
        globals_1.it.skip('should hash email if privacy mode is enabled', () => {
            service = new EntityResolutionService_js_1.EntityResolutionService({
                privacy: {
                    saltedHash: true,
                    salt: mockSalt
                }
            });
            const email = 'john.doe@example.com';
            const expectedHash = (0, node_crypto_1.createHash)('sha256')
                .update(email + mockSalt)
                .digest('hex');
            const normalized = service.normalizeEntityProperties({ email });
            (0, globals_1.expect)(normalized.email).toBe(expectedHash);
        });
    });
    (0, globals_1.describe)('evaluateMatch', () => {
        (0, globals_1.it)('should return high score for matching emails', async () => {
            const entityA = { name: 'Alice', email: 'alice@example.com' };
            const entityB = { name: 'Alice', email: 'alice@example.com' };
            const score = await service.evaluateMatch(entityA, entityB);
            (0, globals_1.expect)(score).toBe(1.0); // Email exact match
        });
        (0, globals_1.it)('should return lower score for matching names only', async () => {
            const entityA = { name: 'Alice', email: 'alice@example.com' };
            const entityB = { name: 'Alice', email: 'different@example.com' };
            const score = await service.evaluateMatch(entityA, entityB);
            (0, globals_1.expect)(score).toBe(0.8); // Name match only
        });
        (0, globals_1.it)('should return zero for non-matching entities', async () => {
            const entityA = { name: 'Alice', email: 'alice@example.com' };
            const entityB = { name: 'Bob', email: 'bob@example.com' };
            const score = await service.evaluateMatch(entityA, entityB);
            (0, globals_1.expect)(score).toBe(0);
        });
    });
});
