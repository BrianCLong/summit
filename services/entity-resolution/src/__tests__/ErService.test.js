"use strict";
/**
 * Entity Resolution Service - Integration Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ErService_js_1 = require("../services/ErService.js");
const InMemoryRepositories_js_1 = require("../repositories/InMemoryRepositories.js");
const classifier_js_1 = require("../matching/classifier.js");
(0, globals_1.describe)('ErService', () => {
    let service;
    let entityRepo;
    let decisionRepo;
    let mergeRepo;
    (0, globals_1.beforeEach)(() => {
        entityRepo = new InMemoryRepositories_js_1.InMemoryEntityRecordRepository();
        decisionRepo = new InMemoryRepositories_js_1.InMemoryMatchDecisionRepository();
        mergeRepo = new InMemoryRepositories_js_1.InMemoryMergeOperationRepository();
        service = new ErService_js_1.ErService(entityRepo, decisionRepo, mergeRepo, classifier_js_1.DEFAULT_CONFIG);
    });
    (0, globals_1.describe)('compare', () => {
        (0, globals_1.it)('should compare two records and return decision', async () => {
            const recordA = {
                id: 'A1',
                entityType: 'Person',
                attributes: {
                    name: 'John Smith',
                    email: 'john.smith@example.com',
                },
            };
            const recordB = {
                id: 'B1',
                entityType: 'Person',
                attributes: {
                    name: 'John Smith',
                    email: 'john.smith@example.com',
                },
            };
            const decision = await service.compare(recordA, recordB);
            (0, globals_1.expect)(decision).toBeDefined();
            (0, globals_1.expect)(decision.recordIdA).toBe('A1');
            (0, globals_1.expect)(decision.recordIdB).toBe('B1');
            (0, globals_1.expect)(decision.outcome).toBe('MERGE');
            (0, globals_1.expect)(decision.explanation).toBeDefined();
        });
        (0, globals_1.it)('should save decision to repository', async () => {
            const recordA = {
                id: 'A1',
                entityType: 'Person',
                attributes: { name: 'John' },
            };
            const recordB = {
                id: 'B1',
                entityType: 'Person',
                attributes: { name: 'John' },
            };
            const decision = await service.compare(recordA, recordB);
            const savedDecision = await decisionRepo.findById(decision.id);
            (0, globals_1.expect)(savedDecision).toBeDefined();
            (0, globals_1.expect)(savedDecision?.matchScore).toBe(decision.matchScore);
        });
    });
    (0, globals_1.describe)('merge and split', () => {
        (0, globals_1.it)('should merge two records', async () => {
            const primary = {
                id: 'primary-1',
                entityType: 'Person',
                attributes: {
                    name: 'John Smith',
                    email: 'john@example.com',
                },
            };
            const secondary = {
                id: 'secondary-1',
                entityType: 'Person',
                attributes: {
                    name: 'J. Smith',
                    phone: '+1-555-0100',
                },
            };
            await entityRepo.save(primary);
            await entityRepo.save(secondary);
            const merged = await service.merge('primary-1', 'secondary-1', 'user-123', 'Same person, different records');
            (0, globals_1.expect)(merged).toBeDefined();
            (0, globals_1.expect)(merged.id).toBe('primary-1');
            (0, globals_1.expect)(merged.attributes.email).toBe('john@example.com');
            (0, globals_1.expect)(merged.attributes.phone).toBe('+1-555-0100'); // Merged from secondary
        });
        (0, globals_1.it)('should split (undo) a merge', async () => {
            const primary = {
                id: 'primary-2',
                entityType: 'Person',
                attributes: { name: 'Alice', age: 30 },
            };
            const secondary = {
                id: 'secondary-2',
                entityType: 'Person',
                attributes: { name: 'Alice', city: 'NYC' },
            };
            await entityRepo.save(primary);
            await entityRepo.save(secondary);
            // Merge
            const merged = await service.merge('primary-2', 'secondary-2', 'user-123', 'Test merge');
            const mergeId = merged.mergeOperationId;
            // Split
            await service.split(mergeId, 'Test split', 'user-123');
            // Verify original records are restored
            const restoredPrimary = await entityRepo.findById('primary-2');
            const restoredSecondary = await entityRepo.findById('secondary-2');
            (0, globals_1.expect)(restoredPrimary).toBeDefined();
            (0, globals_1.expect)(restoredSecondary).toBeDefined();
            (0, globals_1.expect)(restoredPrimary?.attributes.city).toBeUndefined(); // Should not have merged attribute
        });
        (0, globals_1.it)('should throw error when trying to split non-existent merge', async () => {
            await (0, globals_1.expect)(service.split('non-existent-merge', 'Test', 'user-123')).rejects.toThrow('Merge operation not found');
        });
    });
    (0, globals_1.describe)('getMergeHistory', () => {
        (0, globals_1.it)('should return merge history for a record', async () => {
            const primary = {
                id: 'primary-3',
                entityType: 'Person',
                attributes: { name: 'Bob' },
            };
            const secondary = {
                id: 'secondary-3',
                entityType: 'Person',
                attributes: { name: 'Robert' },
            };
            await entityRepo.save(primary);
            await entityRepo.save(secondary);
            await service.merge('primary-3', 'secondary-3', 'user-123', 'Merge test');
            const history = await service.getMergeHistory('primary-3');
            (0, globals_1.expect)(history).toBeDefined();
            (0, globals_1.expect)(history.length).toBeGreaterThan(0);
            (0, globals_1.expect)(history[0].primaryId).toBe('primary-3');
            (0, globals_1.expect)(history[0].secondaryId).toBe('secondary-3');
        });
    });
});
