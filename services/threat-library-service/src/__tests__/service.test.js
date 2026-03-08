"use strict";
/**
 * Service Unit Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_js_1 = require("../service.js");
const repository_js_1 = require("../repository.js");
const errors_js_1 = require("../errors.js");
(0, globals_1.describe)('ThreatLibraryService', () => {
    let service;
    let repository;
    // Test data
    const createArchetype = async () => {
        return repository.createThreatArchetype({
            name: 'Test APT',
            description: 'Test APT description',
            summary: 'Test summary',
            sophistication: 'EXPERT',
            motivation: ['ESPIONAGE'],
            targetSectors: ['GOVERNMENT', 'DEFENSE'],
            typicalTTPs: [],
            patternTemplates: [],
            indicators: [],
            countermeasures: [
                { id: 'c1', name: 'Counter', description: 'Desc', effectiveness: 'HIGH' },
            ],
            riskScore: 85,
            prevalence: 'UNCOMMON',
            active: true,
            status: 'ACTIVE',
        }, { author: 'test' });
    };
    const createTTP = async () => {
        return repository.createTTP({
            name: 'Test TTP',
            description: 'Test TTP description',
            tactic: 'LATERAL_MOVEMENT',
            techniqueId: 'T1021',
            techniqueName: 'Remote Services',
            procedures: [],
            platforms: ['WINDOWS'],
            dataSources: ['Process', 'Network'],
            mitreReference: {
                techniqueId: 'T1021',
                techniqueName: 'Remote Services',
                tacticIds: ['TA0008'],
                mitreUrl: 'https://attack.mitre.org/techniques/T1021/',
            },
            severity: 'HIGH',
            prevalence: 'COMMON',
            status: 'ACTIVE',
        }, { author: 'test' });
    };
    const createPattern = async () => {
        return repository.createPatternTemplate({
            name: 'Test Pattern',
            description: 'Test pattern description',
            category: 'LATERAL_MOVEMENT',
            graphMotifs: [
                {
                    id: 'motif-1',
                    name: 'Lateral Movement Motif',
                    description: 'Detects lateral movement',
                    nodes: [
                        { id: 'actor', type: 'THREAT_ACTOR' },
                        { id: 'source', type: 'ASSET' },
                        { id: 'target', type: 'ASSET' },
                    ],
                    edges: [
                        {
                            id: 'e1',
                            sourceNodeId: 'actor',
                            targetNodeId: 'source',
                            type: 'CONTROLS',
                            direction: 'OUTGOING',
                        },
                        {
                            id: 'e2',
                            sourceNodeId: 'source',
                            targetNodeId: 'target',
                            type: 'LATERAL_MOVE_TO',
                            direction: 'OUTGOING',
                        },
                    ],
                    weight: 0.9,
                },
            ],
            signals: [
                {
                    id: 'signal-1',
                    name: 'Multiple Host Access',
                    description: 'Detects access to multiple hosts',
                    signalType: 'THRESHOLD',
                    dataSource: 'Auth Logs',
                    metric: 'host_count',
                    threshold: 5,
                    operator: 'GT',
                },
            ],
            indicators: [],
            ttps: [],
            requiredMotifMatches: 1,
            requiredSignalMatches: 1,
            severity: 'HIGH',
            status: 'ACTIVE',
        }, { author: 'test' });
    };
    const createIndicator = async () => {
        return repository.createIndicatorPattern({
            name: 'Test Indicator',
            description: 'Test indicator',
            type: 'IP_ADDRESS',
            pattern: '10.0.0.0/8',
            patternFormat: 'LITERAL',
            confidence: 'HIGH',
            severity: 'MEDIUM',
            validFrom: new Date().toISOString(),
            status: 'ACTIVE',
        }, { author: 'test' });
    };
    (0, globals_1.beforeEach)(() => {
        (0, repository_js_1.resetRepository)();
        repository = (0, repository_js_1.getRepository)();
        service = (0, service_js_1.createService)(repository);
    });
    (0, globals_1.afterEach)(() => {
        (0, repository_js_1.resetRepository)();
    });
    (0, globals_1.describe)('Threat operations', () => {
        (0, globals_1.it)('should list threats', async () => {
            await createArchetype();
            const result = await service.listThreats();
            (0, globals_1.expect)(result.items.length).toBe(1);
            (0, globals_1.expect)(result.items[0].name).toBe('Test APT');
        });
        (0, globals_1.it)('should get threat by ID', async () => {
            const archetype = await createArchetype();
            const result = await service.getThreatById(archetype.id);
            (0, globals_1.expect)(result.id).toBe(archetype.id);
        });
        (0, globals_1.it)('should deprecate a threat', async () => {
            const archetype = await createArchetype();
            const deprecated = await service.deprecateThreat(archetype.id, { author: 'test' });
            (0, globals_1.expect)(deprecated.status).toBe('DEPRECATED');
        });
    });
    (0, globals_1.describe)('Pattern operations', () => {
        (0, globals_1.it)('should list patterns', async () => {
            await createPattern();
            const result = await service.listPatterns();
            (0, globals_1.expect)(result.items.length).toBe(1);
        });
        (0, globals_1.it)('should validate pattern coverage', async () => {
            const pattern = await createPattern();
            const validation = await service.validatePatternCoverage(pattern.id);
            (0, globals_1.expect)(validation.valid).toBe(false); // No TTPs linked
            (0, globals_1.expect)(validation.coverage.hasGraphMotifs).toBe(true);
            (0, globals_1.expect)(validation.coverage.hasSignals).toBe(true);
        });
        (0, globals_1.it)('should reject pattern with invalid graph motif', async () => {
            await (0, globals_1.expect)(service.createPattern({
                name: 'Invalid Pattern',
                description: 'Pattern with invalid motif',
                category: 'LATERAL_MOVEMENT',
                graphMotifs: [
                    {
                        id: 'motif-1',
                        name: 'Invalid Motif',
                        description: 'Motif with no nodes',
                        nodes: [], // Invalid: no nodes
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
            }, { author: 'test' })).rejects.toThrow(errors_js_1.InvalidPatternError);
        });
        (0, globals_1.it)('should reject pattern with invalid edge references', async () => {
            await (0, globals_1.expect)(service.createPattern({
                name: 'Invalid Pattern',
                description: 'Pattern with invalid edge',
                category: 'LATERAL_MOVEMENT',
                graphMotifs: [
                    {
                        id: 'motif-1',
                        name: 'Invalid Motif',
                        description: 'Motif with bad edge',
                        nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
                        edges: [
                            {
                                id: 'e1',
                                sourceNodeId: 'n1',
                                targetNodeId: 'n2', // n2 doesn't exist
                                type: 'CONTROLS',
                                direction: 'OUTGOING',
                            },
                        ],
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
            }, { author: 'test' })).rejects.toThrow(errors_js_1.InvalidPatternError);
        });
    });
    (0, globals_1.describe)('Pattern Evaluation Spec Generation', () => {
        (0, globals_1.it)('should generate evaluation spec for a pattern', async () => {
            const pattern = await createPattern();
            const spec = await service.generatePatternEvaluationSpec({
                patternId: pattern.id,
                evaluationOptions: {
                    maxMatches: 50,
                    minConfidence: 0.6,
                    includePartialMatches: false,
                    timeout: 30000,
                },
            });
            (0, globals_1.expect)(spec.specId).toBeDefined();
            (0, globals_1.expect)(spec.patternId).toBe(pattern.id);
            (0, globals_1.expect)(spec.patternName).toBe('Test Pattern');
            (0, globals_1.expect)(spec.cypherQueries.length).toBeGreaterThan(0);
            (0, globals_1.expect)(spec.signalEvaluations.length).toBe(1);
            (0, globals_1.expect)(spec.matchCriteria.requiredMotifMatches).toBe(1);
        });
        (0, globals_1.it)('should generate bulk specs for a threat', async () => {
            const archetype = await createArchetype();
            const pattern = await createPattern();
            // Link pattern to archetype
            await repository.updateThreatArchetype(archetype.id, { patternTemplates: [pattern.id] }, { author: 'test' });
            const specs = await service.generateBulkEvaluationSpecs(archetype.id, {
                maxMatches: 100,
                minConfidence: 0.5,
                includePartialMatches: false,
                timeout: 30000,
            });
            (0, globals_1.expect)(specs.length).toBe(1);
            (0, globals_1.expect)(specs[0].patternId).toBe(pattern.id);
        });
        (0, globals_1.it)('should throw error when no pattern or threat ID provided', async () => {
            await (0, globals_1.expect)(service.generatePatternEvaluationSpec({
                evaluationOptions: {
                    maxMatches: 100,
                    minConfidence: 0.5,
                    includePartialMatches: false,
                    timeout: 30000,
                },
            })).rejects.toThrow(errors_js_1.ValidationError);
        });
    });
    (0, globals_1.describe)('Explanation Payload Generation', () => {
        (0, globals_1.it)('should generate explanation payload for a threat', async () => {
            const archetype = await createArchetype();
            const ttp = await createTTP();
            const indicator = await createIndicator();
            // Link TTP and indicator to archetype
            await repository.updateThreatArchetype(archetype.id, {
                typicalTTPs: [ttp.id],
                indicators: [indicator.id],
            }, { author: 'test' });
            const explanation = await service.generateExplanationPayload(archetype.id);
            (0, globals_1.expect)(explanation.threatId).toBe(archetype.id);
            (0, globals_1.expect)(explanation.threatName).toBe('Test APT');
            (0, globals_1.expect)(explanation.severity).toBe('CRITICAL'); // riskScore 85 = CRITICAL
            (0, globals_1.expect)(explanation.explanation.whatItIs).toBe('Test APT description');
            (0, globals_1.expect)(explanation.explanation.typicalTargets).toContain('GOVERNMENT');
            (0, globals_1.expect)(explanation.mitreMapping.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should generate brief explanation', async () => {
            const archetype = await createArchetype();
            const indicator = await createIndicator();
            await repository.updateThreatArchetype(archetype.id, { indicators: [indicator.id] }, { author: 'test' });
            const brief = await service.generateBriefExplanation(archetype.id);
            (0, globals_1.expect)(brief.summary).toBe('Test summary');
            (0, globals_1.expect)(brief.severity).toBe('CRITICAL');
            (0, globals_1.expect)(brief.topIndicators).toContain('Test Indicator');
        });
    });
    (0, globals_1.describe)('Library Statistics', () => {
        (0, globals_1.it)('should return comprehensive statistics', async () => {
            await createArchetype();
            await createTTP();
            await createPattern();
            await createIndicator();
            const stats = await service.getLibraryStatistics();
            (0, globals_1.expect)(stats.threatArchetypes.total).toBe(1);
            (0, globals_1.expect)(stats.ttps.total).toBe(1);
            (0, globals_1.expect)(stats.ttps.byTactic['LATERAL_MOVEMENT']).toBe(1);
            (0, globals_1.expect)(stats.patterns.total).toBe(1);
            (0, globals_1.expect)(stats.indicators.total).toBe(1);
        });
    });
});
