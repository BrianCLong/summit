"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_memory_1 = require("../storage_memory");
describe('Memory Broker', () => {
    let broker;
    let storage;
    beforeEach(() => {
        storage = new storage_memory_1.InMemoryMemoryStorage();
        broker = new broker_1.MemoryBroker(storage);
    });
    const future = Date.now() + 10000;
    test('should store and retrieve a valid record', async () => {
        const record = {
            id: 'mem1',
            userId: 'user123',
            content: 'I like apples',
            facets: { preference: 'apples' },
            purpose: 'assist',
            contextSpace: 'personal',
            sources: ['chat'],
            expiresAt: future,
            visibility: 'user',
        };
        await broker.remember(record);
        const scope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
        const retrieved = await broker.retrieve('mem1', scope);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.content).toBe('I like apples');
    });
    test('should return null when retrieving with wrong scope', async () => {
        const record = {
            id: 'mem2',
            userId: 'user123',
            content: 'I work at Acme',
            facets: { job: 'Acme' },
            purpose: 'assist',
            contextSpace: 'work',
            sources: ['chat'],
            expiresAt: future,
            visibility: 'user',
        };
        await broker.remember(record);
        const wrongScope = { userId: 'user123', purpose: 'assist', contextSpace: 'personal' };
        const retrieved = await broker.retrieve('mem2', wrongScope);
        expect(retrieved).toBeNull();
    });
});
