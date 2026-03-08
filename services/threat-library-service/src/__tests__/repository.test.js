"use strict";
/**
 * Repository Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const repository_js_1 = require("../repository.js");
const errors_js_1 = require("../errors.js");
(0, globals_1.describe)('ThreatLibraryRepository', () => {
    let repository;
    (0, globals_1.beforeEach)(() => {
        (0, repository_js_1.resetRepository)();
        repository = (0, repository_js_1.getRepository)();
    });
    (0, globals_1.afterEach)(() => {
        (0, repository_js_1.resetRepository)();
    });
    (0, globals_1.describe)('ThreatArchetype operations', () => {
        const validArchetypeData = {
            name: 'Test Threat',
            description: 'A test threat archetype',
            summary: 'Test summary',
            sophistication: 'ADVANCED',
            motivation: ['ESPIONAGE'],
            targetSectors: ['GOVERNMENT'],
            typicalTTPs: [],
            patternTemplates: [],
            indicators: [],
            countermeasures: [
                {
                    id: 'cm1',
                    name: 'Test Countermeasure',
                    description: 'Test description',
                    effectiveness: 'HIGH',
                },
            ],
            riskScore: 75,
            prevalence: 'COMMON',
            active: true,
            status: 'ACTIVE',
        };
        (0, globals_1.it)('should create a threat archetype', async () => {
            const result = await repository.createThreatArchetype(validArchetypeData, {
                author: 'test-user',
            });
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.name).toBe('Test Threat');
            (0, globals_1.expect)(result.metadata.version).toBe(1);
            (0, globals_1.expect)(result.metadata.createdBy).toBe('test-user');
        });
        (0, globals_1.it)('should retrieve a threat archetype by ID', async () => {
            const created = await repository.createThreatArchetype(validArchetypeData, {
                author: 'test-user',
            });
            const retrieved = await repository.getThreatArchetypeById(created.id);
            (0, globals_1.expect)(retrieved.id).toBe(created.id);
            (0, globals_1.expect)(retrieved.name).toBe('Test Threat');
        });
        (0, globals_1.it)('should throw NotFoundError for non-existent archetype', async () => {
            await (0, globals_1.expect)(repository.getThreatArchetypeById('non-existent-id')).rejects.toThrow(errors_js_1.NotFoundError);
        });
        (0, globals_1.it)('should list threat archetypes with pagination', async () => {
            // Create multiple archetypes
            for (let i = 0; i < 5; i++) {
                await repository.createThreatArchetype({ ...validArchetypeData, name: `Threat ${i}`, riskScore: 50 + i * 10 }, { author: 'test-user' });
            }
            const result = await repository.listThreatArchetypes({}, { page: 1, limit: 3 });
            (0, globals_1.expect)(result.items.length).toBe(3);
            (0, globals_1.expect)(result.pagination.total).toBe(5);
            (0, globals_1.expect)(result.pagination.totalPages).toBe(2);
        });
        (0, globals_1.it)('should filter archetypes by status', async () => {
            await repository.createThreatArchetype(validArchetypeData, { author: 'test' });
            await repository.createThreatArchetype({ ...validArchetypeData, name: 'Deprecated', status: 'DEPRECATED' }, { author: 'test' });
            const activeOnly = await repository.listThreatArchetypes({ status: 'ACTIVE' }, { page: 1, limit: 10 });
            (0, globals_1.expect)(activeOnly.items.length).toBe(1);
            (0, globals_1.expect)(activeOnly.items[0].name).toBe('Test Threat');
        });
        (0, globals_1.it)('should filter archetypes by search term', async () => {
            await repository.createThreatArchetype(validArchetypeData, { author: 'test' });
            await repository.createThreatArchetype({ ...validArchetypeData, name: 'APT Campaign', description: 'Advanced threat' }, { author: 'test' });
            const searchResult = await repository.listThreatArchetypes({ search: 'APT' }, { page: 1, limit: 10 });
            (0, globals_1.expect)(searchResult.items.length).toBe(1);
            (0, globals_1.expect)(searchResult.items[0].name).toBe('APT Campaign');
        });
        (0, globals_1.it)('should update a threat archetype', async () => {
            const created = await repository.createThreatArchetype(validArchetypeData, {
                author: 'test-user',
            });
            const updated = await repository.updateThreatArchetype(created.id, { name: 'Updated Threat', riskScore: 90 }, { author: 'updater', description: 'Updated name and score' });
            (0, globals_1.expect)(updated.name).toBe('Updated Threat');
            (0, globals_1.expect)(updated.riskScore).toBe(90);
            (0, globals_1.expect)(updated.metadata.version).toBe(2);
            (0, globals_1.expect)(updated.metadata.updatedBy).toBe('updater');
            (0, globals_1.expect)(updated.metadata.changelog.length).toBe(2);
        });
        (0, globals_1.it)('should soft delete (archive) a threat archetype', async () => {
            const created = await repository.createThreatArchetype(validArchetypeData, {
                author: 'test-user',
            });
            await repository.deleteThreatArchetype(created.id, { author: 'deleter' });
            const archived = await repository.getThreatArchetypeById(created.id);
            (0, globals_1.expect)(archived.status).toBe('ARCHIVED');
            (0, globals_1.expect)(archived.active).toBe(false);
        });
    });
    (0, globals_1.describe)('TTP operations', () => {
        const validTTPData = {
            name: 'Test TTP',
            description: 'A test TTP',
            tactic: 'INITIAL_ACCESS',
            techniqueId: 'T1566',
            techniqueName: 'Phishing',
            procedures: [],
            platforms: ['WINDOWS'],
            dataSources: ['Email'],
            mitreReference: {
                techniqueId: 'T1566',
                techniqueName: 'Phishing',
                tacticIds: ['TA0001'],
                mitreUrl: 'https://attack.mitre.org/techniques/T1566/',
            },
            severity: 'HIGH',
            prevalence: 'COMMON',
            status: 'ACTIVE',
        };
        (0, globals_1.it)('should create a TTP', async () => {
            const result = await repository.createTTP(validTTPData, { author: 'test' });
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.techniqueId).toBe('T1566');
        });
        (0, globals_1.it)('should get TTP by ID', async () => {
            const created = await repository.createTTP(validTTPData, { author: 'test' });
            const retrieved = await repository.getTTPById(created.id);
            (0, globals_1.expect)(retrieved.id).toBe(created.id);
        });
        (0, globals_1.it)('should get TTPs by technique ID', async () => {
            await repository.createTTP(validTTPData, { author: 'test' });
            await repository.createTTP({ ...validTTPData, techniqueId: 'T1059', techniqueName: 'Command Line' }, { author: 'test' });
            const results = await repository.getTTPsByTechniqueId('T1566');
            (0, globals_1.expect)(results.length).toBe(1);
            (0, globals_1.expect)(results[0].techniqueId).toBe('T1566');
        });
        (0, globals_1.it)('should list TTPs with tactic filter', async () => {
            await repository.createTTP(validTTPData, { author: 'test' });
            await repository.createTTP({
                ...validTTPData,
                tactic: 'EXECUTION',
                techniqueId: 'T1059',
            }, { author: 'test' });
            const results = await repository.listTTPs({ tactic: 'INITIAL_ACCESS' }, { page: 1, limit: 10 });
            (0, globals_1.expect)(results.items.length).toBe(1);
            (0, globals_1.expect)(results.items[0].tactic).toBe('INITIAL_ACCESS');
        });
    });
    (0, globals_1.describe)('PatternTemplate operations', () => {
        const validPatternData = {
            name: 'Test Pattern',
            description: 'A test pattern',
            category: 'LATERAL_MOVEMENT',
            graphMotifs: [
                {
                    id: 'motif-1',
                    name: 'Test Motif',
                    description: 'Test motif description',
                    nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
                    edges: [],
                    weight: 1,
                },
            ],
            signals: [],
            indicators: [],
            ttps: [],
            requiredMotifMatches: 1,
            requiredSignalMatches: 0,
            severity: 'HIGH',
            status: 'ACTIVE',
        };
        (0, globals_1.it)('should create a pattern template', async () => {
            const result = await repository.createPatternTemplate(validPatternData, {
                author: 'test',
            });
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.category).toBe('LATERAL_MOVEMENT');
        });
        (0, globals_1.it)('should get pattern by ID', async () => {
            const created = await repository.createPatternTemplate(validPatternData, {
                author: 'test',
            });
            const retrieved = await repository.getPatternTemplateById(created.id);
            (0, globals_1.expect)(retrieved.id).toBe(created.id);
        });
        (0, globals_1.it)('should list patterns with category filter', async () => {
            await repository.createPatternTemplate(validPatternData, { author: 'test' });
            await repository.createPatternTemplate({ ...validPatternData, category: 'DATA_EXFILTRATION' }, { author: 'test' });
            const results = await repository.listPatternTemplates({ category: 'LATERAL_MOVEMENT' }, { page: 1, limit: 10 });
            (0, globals_1.expect)(results.items.length).toBe(1);
        });
    });
    (0, globals_1.describe)('IndicatorPattern operations', () => {
        const validIndicatorData = {
            name: 'Test Indicator',
            description: 'A test indicator',
            type: 'IP_ADDRESS',
            pattern: '192.168.1.0/24',
            patternFormat: 'LITERAL',
            confidence: 'HIGH',
            severity: 'MEDIUM',
            validFrom: new Date().toISOString(),
            status: 'ACTIVE',
        };
        (0, globals_1.it)('should create an indicator pattern', async () => {
            const result = await repository.createIndicatorPattern(validIndicatorData, {
                author: 'test',
            });
            (0, globals_1.expect)(result.id).toBeDefined();
            (0, globals_1.expect)(result.type).toBe('IP_ADDRESS');
        });
        (0, globals_1.it)('should get indicator by ID', async () => {
            const created = await repository.createIndicatorPattern(validIndicatorData, {
                author: 'test',
            });
            const retrieved = await repository.getIndicatorPatternById(created.id);
            (0, globals_1.expect)(retrieved.id).toBe(created.id);
        });
    });
    (0, globals_1.describe)('Statistics', () => {
        (0, globals_1.it)('should return repository statistics', async () => {
            const stats = await repository.getStatistics();
            (0, globals_1.expect)(stats).toHaveProperty('threatArchetypes');
            (0, globals_1.expect)(stats).toHaveProperty('ttps');
            (0, globals_1.expect)(stats).toHaveProperty('patternTemplates');
            (0, globals_1.expect)(stats).toHaveProperty('indicatorPatterns');
            (0, globals_1.expect)(stats).toHaveProperty('cacheStats');
        });
    });
});
