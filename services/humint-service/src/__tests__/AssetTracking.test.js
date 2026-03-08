"use strict";
/**
 * Asset Tracking Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const humint_types_1 = require("@intelgraph/humint-types");
(0, globals_1.describe)('Asset Tracking Validation Schemas', () => {
    (0, globals_1.describe)('GeoLocationSchema', () => {
        (0, globals_1.it)('should validate valid location', () => {
            const validLocation = {
                latitude: 38.8951,
                longitude: -77.0364,
                altitude: 100,
                accuracy: 10,
                timestamp: new Date(),
                source: 'GPS',
            };
            const result = humint_types_1.GeoLocationSchema.safeParse(validLocation);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid latitude', () => {
            const invalidLocation = {
                latitude: 100, // Invalid: > 90
                longitude: -77.0364,
                accuracy: 10,
                timestamp: new Date(),
                source: 'GPS',
            };
            const result = humint_types_1.GeoLocationSchema.safeParse(invalidLocation);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('should reject invalid longitude', () => {
            const invalidLocation = {
                latitude: 38.8951,
                longitude: -200, // Invalid: < -180
                accuracy: 10,
                timestamp: new Date(),
                source: 'GPS',
            };
            const result = humint_types_1.GeoLocationSchema.safeParse(invalidLocation);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('CreateAssetActivitySchema', () => {
        (0, globals_1.it)('should validate valid activity', () => {
            const validActivity = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                activityType: 'MEETING',
                timestamp: new Date(),
                duration: 60,
                participants: ['Person A', 'Person B'],
                description: 'Meeting with target organization leadership to discuss operational plans.',
                classification: 'SECRET',
            };
            const result = humint_types_1.CreateAssetActivitySchema.safeParse(validActivity);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should validate activity with location', () => {
            const validActivity = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                activityType: 'TRAVEL',
                timestamp: new Date(),
                location: {
                    latitude: 38.8951,
                    longitude: -77.0364,
                    accuracy: 50,
                    timestamp: new Date(),
                    source: 'REPORTED',
                },
                participants: [],
                description: 'Source traveled to target location for observation.',
                classification: 'CONFIDENTIAL',
            };
            const result = humint_types_1.CreateAssetActivitySchema.safeParse(validActivity);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject empty description', () => {
            const invalidActivity = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                activityType: 'CONTACT',
                timestamp: new Date(),
                participants: [],
                description: '', // Empty
                classification: 'UNCLASSIFIED',
            };
            const result = humint_types_1.CreateAssetActivitySchema.safeParse(invalidActivity);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('CreateRiskIndicatorSchema', () => {
        (0, globals_1.it)('should validate valid risk indicator', () => {
            const validIndicator = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                indicatorType: 'BEHAVIORAL',
                severity: 'MODERATE',
                description: 'Source exhibited unusual nervousness during last contact.',
                detectionMethod: 'HANDLER',
                mitigationActions: ['Increase surveillance', 'Reduce operational tempo'],
            };
            const result = humint_types_1.CreateRiskIndicatorSchema.safeParse(validIndicator);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should validate all indicator types', () => {
            const types = ['BEHAVIORAL', 'COMMUNICATION', 'FINANCIAL', 'TRAVEL', 'COUNTERINTEL', 'OPERATIONAL'];
            types.forEach((type) => {
                const indicator = {
                    sourceId: '123e4567-e89b-12d3-a456-426614174000',
                    indicatorType: type,
                    severity: 'LOW',
                    description: `Test ${type} indicator`,
                    detectionMethod: 'AUTOMATED',
                };
                const result = humint_types_1.CreateRiskIndicatorSchema.safeParse(indicator);
                (0, globals_1.expect)(result.success).toBe(true);
            });
        });
        (0, globals_1.it)('should validate all severity levels', () => {
            const severities = ['MINIMAL', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];
            severities.forEach((severity) => {
                const indicator = {
                    sourceId: '123e4567-e89b-12d3-a456-426614174000',
                    indicatorType: 'OPERATIONAL',
                    severity,
                    description: `Test ${severity} severity indicator`,
                    detectionMethod: 'ANALYST',
                };
                const result = humint_types_1.CreateRiskIndicatorSchema.safeParse(indicator);
                (0, globals_1.expect)(result.success).toBe(true);
            });
        });
    });
    (0, globals_1.describe)('CreateGraphLinkSchema', () => {
        (0, globals_1.it)('should validate valid graph link', () => {
            const validLink = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                entityId: '123e4567-e89b-12d3-a456-426614174001',
                entityType: 'Person',
                relationshipType: 'REPORTS_ON',
                direction: 'OUTBOUND',
                strength: 80,
                confidence: 90,
                validFrom: new Date(),
                properties: { role: 'primary target' },
            };
            const result = humint_types_1.CreateGraphLinkSchema.safeParse(validLink);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should validate all relationship types', () => {
            const types = [
                'REPORTS_ON', 'HAS_ACCESS_TO', 'HANDLES', 'DEBRIEFED_BY',
                'DERIVED_FROM_SOURCE', 'CORROBORATES', 'CONTRADICTS',
                'RECRUITED_BY', 'AFFILIATED_WITH', 'OPERATES_IN',
                'COMPENSATED_BY', 'TASKED_WITH',
            ];
            types.forEach((type) => {
                const link = {
                    sourceId: '123e4567-e89b-12d3-a456-426614174000',
                    entityId: '123e4567-e89b-12d3-a456-426614174001',
                    entityType: 'Entity',
                    relationshipType: type,
                    direction: 'BIDIRECTIONAL',
                    strength: 50,
                    confidence: 75,
                    validFrom: new Date(),
                    properties: {},
                };
                const result = humint_types_1.CreateGraphLinkSchema.safeParse(link);
                (0, globals_1.expect)(result.success).toBe(true);
            });
        });
        (0, globals_1.it)('should enforce strength/confidence bounds', () => {
            const invalidLink = {
                sourceId: '123e4567-e89b-12d3-a456-426614174000',
                entityId: '123e4567-e89b-12d3-a456-426614174001',
                entityType: 'Person',
                relationshipType: 'REPORTS_ON',
                direction: 'OUTBOUND',
                strength: 150, // Invalid: > 100
                confidence: 90,
                validFrom: new Date(),
                properties: {},
            };
            const result = humint_types_1.CreateGraphLinkSchema.safeParse(invalidLink);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('AssetTrackingQuerySchema', () => {
        (0, globals_1.it)('should apply default values', () => {
            const input = {};
            const result = humint_types_1.AssetTrackingQuerySchema.parse(input);
            (0, globals_1.expect)(result.limit).toBe(20);
            (0, globals_1.expect)(result.offset).toBe(0);
            (0, globals_1.expect)(result.includeActivities).toBe(false);
            (0, globals_1.expect)(result.includeGraphLinks).toBe(false);
            (0, globals_1.expect)(result.includeRiskIndicators).toBe(false);
        });
        (0, globals_1.it)('should validate complex query', () => {
            const input = {
                sourceIds: [
                    '123e4567-e89b-12d3-a456-426614174000',
                    '123e4567-e89b-12d3-a456-426614174001',
                ],
                statuses: ['ACTIVE', 'DEVELOPMENTAL'],
                riskLevels: ['HIGH', 'CRITICAL'],
                hasActiveIndicators: true,
                lastContactBefore: new Date(),
                includeActivities: true,
                includeGraphLinks: true,
                limit: 50,
            };
            const result = humint_types_1.AssetTrackingQuerySchema.safeParse(input);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
});
(0, globals_1.describe)('Graph Query Builders', () => {
    (0, globals_1.describe)('buildNetworkQuery', () => {
        (0, globals_1.it)('should build valid network query', () => {
            const query = (0, humint_types_1.buildNetworkQuery)('source-123', 2);
            (0, globals_1.expect)(query).toContain('MATCH path');
            (0, globals_1.expect)(query).toContain('$sourceId');
            (0, globals_1.expect)(query).toContain('*1..2');
        });
        (0, globals_1.it)('should support relationship type filtering', () => {
            const query = (0, humint_types_1.buildNetworkQuery)('source-123', 2, ['REPORTS_ON', 'HAS_ACCESS_TO']);
            (0, globals_1.expect)(query).toContain(':REPORTS_ON|HAS_ACCESS_TO');
        });
        (0, globals_1.it)('should handle depth parameter', () => {
            const query1 = (0, humint_types_1.buildNetworkQuery)('source-123', 1);
            const query3 = (0, humint_types_1.buildNetworkQuery)('source-123', 3);
            (0, globals_1.expect)(query1).toContain('*1..1');
            (0, globals_1.expect)(query3).toContain('*1..3');
        });
    });
    (0, globals_1.describe)('buildPathQuery', () => {
        (0, globals_1.it)('should build valid path query', () => {
            const query = (0, humint_types_1.buildPathQuery)('source-123', 'target-456', 5);
            (0, globals_1.expect)(query).toContain('shortestPath');
            (0, globals_1.expect)(query).toContain('$sourceId');
            (0, globals_1.expect)(query).toContain('$targetEntityId');
            (0, globals_1.expect)(query).toContain('*1..5');
        });
        (0, globals_1.it)('should respect max hops', () => {
            const query = (0, humint_types_1.buildPathQuery)('source-123', 'target-456', 3);
            (0, globals_1.expect)(query).toContain('*1..3');
        });
    });
});
