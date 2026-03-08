"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const er_engine_1 = require("../../src/core/er-engine");
(0, globals_1.describe)('ER Engine Integration', () => {
    let engine;
    let goldenDataset;
    (0, globals_1.beforeEach)(() => {
        engine = new er_engine_1.EREngine();
        // Load golden dataset
        const dataPath = (0, node_path_1.join)(process.cwd(), 'tests/fixtures/golden-dataset.json');
        goldenDataset = JSON.parse((0, node_fs_1.readFileSync)(dataPath, 'utf-8'));
        // Store entities in engine for testing
        goldenDataset.entities.forEach(entity => {
            engine.storeEntity(entity);
        });
    });
    (0, globals_1.describe)('Candidate Finding', () => {
        (0, globals_1.it)('should find high-quality candidates for duplicate entities', () => {
            const entity = goldenDataset.entities[0]; // John Michael Smith
            const population = goldenDataset.entities;
            const result = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                topK: 3,
                threshold: 0.7,
            });
            (0, globals_1.expect)(result.candidates.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.candidates[0].entityId).toBe('person-002'); // Jon M. Smith
            (0, globals_1.expect)(result.candidates[0].score).toBeGreaterThan(0.8);
            (0, globals_1.expect)(result.requestId).toBeDefined();
            (0, globals_1.expect)(result.executionTimeMs).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should respect topK parameter', () => {
            const entity = goldenDataset.entities[0];
            const population = goldenDataset.entities;
            const result = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                topK: 2,
                threshold: 0.3,
            });
            (0, globals_1.expect)(result.candidates.length).toBeLessThanOrEqual(2);
        });
        (0, globals_1.it)('should filter by threshold', () => {
            const entity = goldenDataset.entities[2]; // Jane Doe
            const population = goldenDataset.entities;
            const result = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                topK: 10,
                threshold: 0.9, // Very high threshold
            });
            // Jane should not match John entities with high threshold
            (0, globals_1.expect)(result.candidates.length).toBe(0);
        });
        (0, globals_1.it)('should use different scoring methods', () => {
            const entity = goldenDataset.entities[0];
            const population = goldenDataset.entities;
            const detResult = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                method: 'deterministic',
            });
            const probResult = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                method: 'probabilistic',
            });
            (0, globals_1.expect)(detResult.method).toBe('deterministic');
            (0, globals_1.expect)(probResult.method).toBe('probabilistic');
        });
    });
    (0, globals_1.describe)('Merge Operations', () => {
        (0, globals_1.it)('should merge entities successfully', () => {
            const mergeResult = engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: ['person-001', 'person-002'],
                actor: 'test-analyst@example.com',
                reason: 'Same person with spelling variation',
                policyTags: ['er:manual-review'],
            });
            (0, globals_1.expect)(mergeResult.mergeId).toBeDefined();
            (0, globals_1.expect)(mergeResult.primaryId).toBe('person-001');
            (0, globals_1.expect)(mergeResult.mergedIds).toContain('person-002');
            (0, globals_1.expect)(mergeResult.reversible).toBe(true);
            (0, globals_1.expect)(mergeResult.actor).toBe('test-analyst@example.com');
        });
        (0, globals_1.it)('should require at least 2 entities', () => {
            (0, globals_1.expect)(() => {
                engine.merge({
                    tenantId: goldenDataset.tenantId,
                    entityIds: ['person-001'],
                    actor: 'test@example.com',
                    reason: 'Test',
                });
            }).toThrow('At least 2 entity IDs required');
        });
        (0, globals_1.it)('should revert merge successfully', () => {
            const mergeResult = engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: ['person-001', 'person-002'],
                actor: 'analyst@example.com',
                reason: 'Duplicate detection',
            });
            engine.revertMerge(mergeResult.mergeId, 'supervisor@example.com', 'False positive');
            const merge = engine.getMerge(mergeResult.mergeId);
            (0, globals_1.expect)(merge).toBeUndefined();
            // Check audit log
            const auditLog = engine.getAuditLog({ event: 'revert' });
            (0, globals_1.expect)(auditLog.length).toBeGreaterThan(0);
            (0, globals_1.expect)(auditLog[0].event).toBe('revert');
            (0, globals_1.expect)(auditLog[0].reason).toBe('False positive');
        });
        (0, globals_1.it)('should track merge in audit log', () => {
            engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: ['person-003', 'person-004'],
                actor: 'analyst@example.com',
                reason: 'Test merge',
            });
            const auditLog = engine.getAuditLog({
                tenantId: goldenDataset.tenantId,
                event: 'merge',
            });
            (0, globals_1.expect)(auditLog.length).toBeGreaterThan(0);
            (0, globals_1.expect)(auditLog[0].event).toBe('merge');
            (0, globals_1.expect)(auditLog[0].actor).toBe('analyst@example.com');
        });
    });
    (0, globals_1.describe)('Split Operations', () => {
        (0, globals_1.it)('should split entity successfully', () => {
            const splitResult = engine.split({
                tenantId: goldenDataset.tenantId,
                entityId: 'person-001',
                splitGroups: [
                    {
                        attributes: { context: 'work' },
                        deviceIds: ['device-abc123'],
                    },
                    {
                        attributes: { context: 'personal' },
                        deviceIds: ['device-def456'],
                    },
                ],
                actor: 'analyst@example.com',
                reason: 'Separate work and personal identities',
            });
            (0, globals_1.expect)(splitResult.splitId).toBeDefined();
            (0, globals_1.expect)(splitResult.originalEntityId).toBe('person-001');
            (0, globals_1.expect)(splitResult.newEntityIds.length).toBe(2);
            (0, globals_1.expect)(splitResult.actor).toBe('analyst@example.com');
            // Verify new entities were created
            const newEntity1 = engine.getEntity(splitResult.newEntityIds[0]);
            const newEntity2 = engine.getEntity(splitResult.newEntityIds[1]);
            (0, globals_1.expect)(newEntity1).toBeDefined();
            (0, globals_1.expect)(newEntity2).toBeDefined();
        });
        (0, globals_1.it)('should require at least 2 split groups', () => {
            (0, globals_1.expect)(() => {
                engine.split({
                    tenantId: goldenDataset.tenantId,
                    entityId: 'person-001',
                    splitGroups: [{ attributes: {} }],
                    actor: 'test@example.com',
                    reason: 'Test',
                });
            }).toThrow('At least 2 split groups required');
        });
        (0, globals_1.it)('should track split in audit log', () => {
            engine.split({
                tenantId: goldenDataset.tenantId,
                entityId: 'person-001',
                splitGroups: [
                    { attributes: { group: 'A' } },
                    { attributes: { group: 'B' } },
                ],
                actor: 'analyst@example.com',
                reason: 'Test split',
            });
            const auditLog = engine.getAuditLog({ event: 'split' });
            (0, globals_1.expect)(auditLog.length).toBeGreaterThan(0);
            (0, globals_1.expect)(auditLog[0].event).toBe('split');
        });
    });
    (0, globals_1.describe)('Explainability', () => {
        (0, globals_1.it)('should provide detailed explanation for merge', () => {
            const mergeResult = engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: ['person-001', 'person-002'],
                actor: 'analyst@example.com',
                reason: 'High similarity match',
                policyTags: ['er:high-confidence'],
            });
            const explanation = engine.explain(mergeResult.mergeId);
            (0, globals_1.expect)(explanation.mergeId).toBe(mergeResult.mergeId);
            (0, globals_1.expect)(explanation.features).toBeDefined();
            (0, globals_1.expect)(explanation.rationale).toBeInstanceOf(Array);
            (0, globals_1.expect)(explanation.rationale.length).toBeGreaterThan(0);
            (0, globals_1.expect)(explanation.featureWeights).toBeDefined();
            (0, globals_1.expect)(explanation.threshold).toBeDefined();
            (0, globals_1.expect)(explanation.policyTags).toContain('er:high-confidence');
        });
        (0, globals_1.it)('should include feature weights in explanation', () => {
            const mergeResult = engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: ['org-001', 'org-002'],
                actor: 'analyst@example.com',
                reason: 'Same organization',
            });
            const explanation = engine.explain(mergeResult.mergeId);
            const weights = explanation.featureWeights;
            (0, globals_1.expect)(weights.nameSimilarity).toBeDefined();
            (0, globals_1.expect)(weights.typeMatch).toBeDefined();
            (0, globals_1.expect)(Object.keys(weights).length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should throw error for non-existent merge', () => {
            (0, globals_1.expect)(() => {
                engine.explain('non-existent-merge-id');
            }).toThrow('Explanation for merge non-existent-merge-id not found');
        });
    });
    (0, globals_1.describe)('Reproducible Merge Test (Golden Dataset)', () => {
        (0, globals_1.it)('should produce consistent results on golden dataset', () => {
            const entity = goldenDataset.entities[0]; // John Michael Smith
            const population = goldenDataset.entities;
            const result = engine.candidates({
                tenantId: goldenDataset.tenantId,
                entity,
                population,
                topK: 3,
            });
            // Reproducible: top candidate should always be person-002
            (0, globals_1.expect)(result.candidates[0].entityId).toBe('person-002');
            (0, globals_1.expect)(result.candidates[0].score).toBeGreaterThan(0.8);
            // Merge should succeed
            const mergeResult = engine.merge({
                tenantId: goldenDataset.tenantId,
                entityIds: [entity.id, result.candidates[0].entityId],
                actor: 'system@example.com',
                reason: 'Automated ER',
            });
            (0, globals_1.expect)(mergeResult.reversible).toBe(true);
            // Explanation should be available
            const explanation = engine.explain(mergeResult.mergeId);
            (0, globals_1.expect)(explanation.features.nameSimilarity).toBeGreaterThan(0.7);
        });
    });
});
