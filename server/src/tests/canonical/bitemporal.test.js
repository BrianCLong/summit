"use strict";
/**
 * Unit Tests: Bitemporal Functionality
 *
 * Tests for canonical entities with bitemporal tracking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const globals_1 = require("@jest/globals");
const helpers_js_1 = require("../../canonical/helpers.js");
const Person_js_1 = require("../../canonical/entities/Person.js");
const types_js_1 = require("../../canonical/types.js");
const _021_canonical_entities_bitemporal_js_1 = __importDefault(require("../../migrations/021_canonical_entities_bitemporal.js"));
const describeIfDb = process.env.TEST_DATABASE_URL ? globals_1.describe : globals_1.describe.skip;
describeIfDb('Bitemporal Functionality', () => {
    let pool;
    const tenantId = 'test-tenant';
    const userId = 'test-user';
    (0, globals_1.beforeAll)(async () => {
        // Setup test database
        pool = new pg_1.Pool({
            connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/test',
        });
        // Run migration
        await (0, _021_canonical_entities_bitemporal_js_1.default)(pool);
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup
        await pool.query('DROP TABLE IF EXISTS canonical_person CASCADE');
        await pool.query('DROP TABLE IF EXISTS canonical_provenance CASCADE');
        await pool.end();
    });
    (0, globals_1.beforeEach)(async () => {
        // Clear test data
        await pool.query('DELETE FROM canonical_person WHERE tenant_id = $1', [tenantId]);
        await pool.query('DELETE FROM canonical_provenance WHERE tenant_id = $1', [tenantId]);
    });
    (0, globals_1.describe)('Valid Time Dimension', () => {
        (0, globals_1.it)('should track when facts were true in reality', async () => {
            const personId = 'person-1';
            const validFrom1 = new Date('2023-01-01');
            const validFrom2 = new Date('2023-06-01');
            // Create initial version (person joined company on Jan 1)
            const person1 = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                affiliations: [
                    {
                        organizationName: 'Acme Corp',
                        role: 'Engineer',
                        from: validFrom1,
                    },
                ],
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: validFrom1,
                validTo: null,
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person1);
            // Update version (person promoted to Senior Engineer on June 1)
            const person2 = {
                ...person1,
                validFrom: validFrom2,
                validTo: null,
                observedAt: new Date('2023-06-01'),
                recordedAt: new Date('2023-06-01'),
                version: 2,
                affiliations: [
                    {
                        organizationName: 'Acme Corp',
                        role: 'Senior Engineer',
                        from: validFrom2,
                    },
                ],
            };
            // Close previous version
            await pool.query(`UPDATE canonical_person
         SET valid_to = $1
         WHERE id = $2 AND valid_from = $3`, [validFrom2, personId, validFrom1]);
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person2);
            // Query: Who was this person on March 1, 2023?
            const march = await (0, helpers_js_1.snapshotAtTime)(pool, 'Person', tenantId, new Date('2023-03-01'));
            (0, globals_1.expect)(march).toHaveLength(1);
            (0, globals_1.expect)(march[0].affiliations[0].role).toBe('Engineer');
            // Query: Who was this person on August 1, 2023?
            const august = await (0, helpers_js_1.snapshotAtTime)(pool, 'Person', tenantId, new Date('2023-08-01'));
            (0, globals_1.expect)(august).toHaveLength(1);
            (0, globals_1.expect)(august[0].affiliations[0].role).toBe('Senior Engineer');
        });
        (0, globals_1.it)('should support querying entities in a time range', async () => {
            const person1Id = 'person-1';
            const person2Id = 'person-2';
            // Person 1: valid from Jan 1 to March 31
            const person1 = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: person1Id,
                tenantId,
                validFrom: new Date('2023-01-01'),
                validTo: new Date('2023-03-31'),
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            // Person 2: valid from June 1 onwards
            const person2 = (0, Person_js_1.createPerson)({
                name: { full: 'Jane Smith' },
                identifiers: {},
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: person2Id,
                tenantId,
                validFrom: new Date('2023-06-01'),
                validTo: null,
                observedAt: new Date('2023-06-01'),
                recordedAt: new Date('2023-06-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-2');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person1);
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person2);
            // Query: Who existed during Feb-May 2023?
            const febToMay = (await (0, helpers_js_1.getEntitiesInTimeRange)(pool, 'Person', tenantId, new Date('2023-02-01'), new Date('2023-05-31')));
            // Should only get person1 (person2 starts in June)
            (0, globals_1.expect)(febToMay).toHaveLength(1);
            (0, globals_1.expect)(febToMay[0].id).toBe(person1Id);
            // Query: Who existed during May-July 2023?
            const mayToJuly = (await (0, helpers_js_1.getEntitiesInTimeRange)(pool, 'Person', tenantId, new Date('2023-05-01'), new Date('2023-07-31')));
            // Should get person2 (person1 ended in March)
            (0, globals_1.expect)(mayToJuly).toHaveLength(1);
            (0, globals_1.expect)(mayToJuly[0].id).toBe(person2Id);
        });
    });
    (0, globals_1.describe)('Transaction Time Dimension', () => {
        (0, globals_1.it)('should track when facts were recorded in the system', async () => {
            const personId = 'person-1';
            // Fact: Person started working on Jan 1
            // But we only learned about it on Feb 1
            const person = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-01-01'), // Started Jan 1
                validTo: null,
                observedAt: new Date('2023-02-01'), // Observed Feb 1
                recordedAt: new Date('2023-02-01'), // Recorded Feb 1
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person);
            // Query: What did we know on January 15?
            const jan15 = await (0, helpers_js_1.snapshotAtTime)(pool, 'Person', tenantId, new Date('2023-01-15'), new Date('2023-01-15'));
            // Should be empty - we didn't know about this person yet
            (0, globals_1.expect)(jan15).toHaveLength(0);
            // Query: What did we know on February 15?
            const feb15 = (await (0, helpers_js_1.snapshotAtTime)(pool, 'Person', tenantId, new Date('2023-01-15'), // Valid at Jan 15
            new Date('2023-02-15')));
            // Should have the person - we learned about them on Feb 1
            (0, globals_1.expect)(feb15).toHaveLength(1);
            (0, globals_1.expect)(feb15[0].id).toBe(personId);
        });
        (0, globals_1.it)('should support retroactive corrections', async () => {
            const personId = 'person-1';
            // Initial record: Person named "John Doe"
            const person1 = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-01-01'),
                validTo: null,
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person1);
            // Correction: We discover the name was misspelled
            // The correct name was always "Jon Doe" (not John)
            await (0, helpers_js_1.correctEntity)(pool, 'Person', personId, tenantId, new Date('2023-01-01'), // Correct from the beginning
            {
                name: { full: 'Jon Doe' },
            }, userId, 'prov-2');
            // Query the history
            const history = (await (0, helpers_js_1.getEntityHistory)(pool, 'Person', personId, tenantId));
            // Should have 2 versions
            (0, globals_1.expect)(history.length).toBeGreaterThanOrEqual(2);
            // The corrected version should have the right name
            const corrected = history.find(h => h.name.full === 'Jon Doe');
            (0, globals_1.expect)(corrected).toBeDefined();
            (0, globals_1.expect)(new Date(corrected.validFrom)).toEqual(new Date('2023-01-01'));
        });
    });
    (0, globals_1.describe)('Entity History', () => {
        (0, globals_1.it)('should track all versions of an entity', async () => {
            const personId = 'person-1';
            // Version 1: Initial record
            const v1 = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                occupations: ['Engineer'],
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-01-01'),
                validTo: null,
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', v1);
            // Version 2: Promotion
            await pool.query('UPDATE canonical_person SET valid_to = $1 WHERE id = $2 AND version = 1', [new Date('2023-06-01'), personId]);
            const v2 = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                occupations: ['Senior Engineer'],
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-06-01'),
                validTo: null,
                observedAt: new Date('2023-06-01'),
                recordedAt: new Date('2023-06-01'),
                version: 2,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-2');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', v2);
            // Version 3: Name change
            await pool.query('UPDATE canonical_person SET valid_to = $1 WHERE id = $2 AND version = 2', [new Date('2023-09-01'), personId]);
            const v3 = (0, Person_js_1.createPerson)({
                name: { full: 'John Smith' },
                identifiers: {},
                occupations: ['Senior Engineer'],
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-09-01'),
                validTo: null,
                observedAt: new Date('2023-09-01'),
                recordedAt: new Date('2023-09-01'),
                version: 3,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-3');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', v3);
            // Get full history
            const history = (await (0, helpers_js_1.getEntityHistory)(pool, 'Person', personId, tenantId));
            (0, globals_1.expect)(history.length).toBeGreaterThanOrEqual(3);
            // Verify progression
            const sorted = history.sort((a, b) => (a.version || 0) - (b.version || 0));
            (0, globals_1.expect)(sorted[0].occupations).toContain('Engineer');
            (0, globals_1.expect)(sorted[1].occupations).toContain('Senior Engineer');
            (0, globals_1.expect)(sorted[2].name.full).toBe('John Smith');
        });
        (0, globals_1.it)('should calculate temporal distance between versions', () => {
            const v1 = {
                validFrom: new Date('2023-01-01'),
                validTo: new Date('2023-06-01'),
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
            };
            const v2 = {
                validFrom: new Date('2023-06-01'),
                validTo: null,
                observedAt: new Date('2023-06-01'),
                recordedAt: new Date('2023-06-01'),
            };
            const distance = (0, helpers_js_1.temporalDistance)(v1, v2);
            // 5 months ≈ 150 days
            (0, globals_1.expect)(distance.validTimeDays).toBeCloseTo(151, 0);
            (0, globals_1.expect)(distance.transactionTimeDays).toBeCloseTo(151, 0);
        });
    });
    (0, globals_1.describe)('Soft Delete', () => {
        (0, globals_1.it)('should soft delete entities without removing history', async () => {
            const personId = 'person-1';
            const person = (0, Person_js_1.createPerson)({
                name: { full: 'John Doe' },
                identifiers: {},
                classifications: [],
                metadata: {},
                properties: {},
            }, {
                id: personId,
                tenantId,
                validFrom: new Date('2023-01-01'),
                validTo: null,
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
                version: 1,
                modifiedBy: userId,
                deleted: false,
            }, 'prov-1');
            await (0, helpers_js_1.createEntityVersion)(pool, 'Person', person);
            // Soft delete
            await (0, helpers_js_1.softDeleteEntity)(pool, 'Person', personId, tenantId, new Date('2023-12-31'), userId);
            // Query current entities - should not include deleted
            const current = (await (0, helpers_js_1.snapshotAtTime)(pool, 'Person', tenantId, new Date()));
            const found = current.find(p => p.id === personId);
            (0, globals_1.expect)(found).toBeUndefined();
            // But history should still be accessible
            const history = (await (0, helpers_js_1.getEntityHistory)(pool, 'Person', personId, tenantId));
            (0, globals_1.expect)(history.length).toBeGreaterThan(0);
            (0, globals_1.expect)(history[history.length - 1].deleted).toBe(true);
        });
    });
    (0, globals_1.describe)('Helper Functions', () => {
        (0, globals_1.it)('should check if entity is valid at a specific time', () => {
            const entity = {
                validFrom: new Date('2023-01-01'),
                validTo: new Date('2023-12-31'),
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-01-01'),
            };
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2023-06-15'))).toBe(true);
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2022-12-31'))).toBe(false);
            (0, globals_1.expect)((0, types_js_1.isValidAt)(entity, new Date('2024-01-01'))).toBe(false);
        });
        (0, globals_1.it)('should check if entity was known at a specific time', () => {
            const entity = {
                validFrom: new Date('2023-01-01'),
                validTo: null,
                observedAt: new Date('2023-01-01'),
                recordedAt: new Date('2023-02-01'),
            };
            (0, globals_1.expect)((0, types_js_1.wasKnownAt)(entity, new Date('2023-02-15'))).toBe(true);
            (0, globals_1.expect)((0, types_js_1.wasKnownAt)(entity, new Date('2023-01-15'))).toBe(false);
        });
        (0, globals_1.it)('should filter entities by temporal constraints', () => {
            const entities = [
                {
                    id: '1',
                    kind: 'Person',
                    tenantId: tenantId,
                    sourceIds: [],
                    properties: {},
                    createdAt: '2023-01-01',
                    updatedAt: '2023-01-01',
                    validFrom: '2023-01-01',
                    validTo: '2023-06-30',
                },
                {
                    id: '2',
                    kind: 'Person',
                    tenantId: tenantId,
                    sourceIds: [],
                    properties: {},
                    createdAt: '2023-07-01',
                    updatedAt: '2023-07-01',
                    validFrom: '2023-07-01',
                    validTo: undefined,
                },
            ];
            // Filter by valid time
            const filtered = (0, types_js_1.filterByTemporal)(entities, '2023-03-15');
            (0, globals_1.expect)(filtered).toHaveLength(1);
            (0, globals_1.expect)(filtered[0].id).toBe('1');
            // Filter by later valid time
            const knownFilter = (0, types_js_1.filterByTemporal)(entities, '2023-07-10');
            (0, globals_1.expect)(knownFilter).toHaveLength(1);
            (0, globals_1.expect)(knownFilter[0].id).toBe('1');
        });
    });
});
