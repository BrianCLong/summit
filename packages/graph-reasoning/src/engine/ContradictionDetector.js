"use strict";
/**
 * Contradiction Detection Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContradictionDetector = void 0;
const uuid_1 = require("uuid");
const inference_js_1 = require("../types/inference.js");
class ContradictionDetector {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Detect all contradictions in the knowledge graph
     */
    async detectContradictions() {
        const contradictions = [];
        // Detect property conflicts
        contradictions.push(...(await this.detectPropertyConflicts()));
        // Detect relationship conflicts
        contradictions.push(...(await this.detectRelationshipConflicts()));
        // Detect type conflicts
        contradictions.push(...(await this.detectTypeConflicts()));
        // Detect cardinality violations
        contradictions.push(...(await this.detectCardinalityViolations()));
        return contradictions;
    }
    /**
     * Detect property conflicts (same property with different values)
     */
    async detectPropertyConflicts() {
        const session = this.driver.session();
        try {
            // Find entities with conflicting properties from different sources
            const result = await session.run(`
        MATCH (e)
        WHERE exists(e.properties)
        WITH e, e.id as entityId, e.properties as props
        // This is simplified - in production, parse properties JSON and compare
        RETURN entityId, props
        LIMIT 100
        `);
            const contradictions = [];
            // Simplified property conflict detection
            // In production, implement sophisticated property comparison
            return contradictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Detect relationship conflicts
     */
    async detectRelationshipConflicts() {
        const session = this.driver.session();
        try {
            // Find mutually exclusive relationships
            const result = await session.run(`
        MATCH (a)-[r1:CONFLICTS_WITH]->(b)
        MATCH (a)-[r2:COMPATIBLE_WITH]->(b)
        RETURN a.id as entity1, b.id as entity2, r1.id as rel1, r2.id as rel2
        `);
            const contradictions = [];
            for (const record of result.records) {
                const contradiction = {
                    id: (0, uuid_1.v4)(),
                    contradictionType: 'relationship_conflict',
                    entity1Id: record.get('entity1'),
                    entity2Id: record.get('entity2'),
                    description: 'Mutually exclusive relationships detected',
                    severity: 'high',
                    conflictingFacts: [
                        {
                            factId: record.get('rel1'),
                            value: 'CONFLICTS_WITH',
                            source: 'graph',
                            confidence: 1.0,
                        },
                        {
                            factId: record.get('rel2'),
                            value: 'COMPATIBLE_WITH',
                            source: 'graph',
                            confidence: 1.0,
                        },
                    ],
                    resolved: false,
                    detectedAt: new Date().toISOString(),
                };
                contradictions.push(inference_js_1.ContradictionSchema.parse(contradiction));
            }
            return contradictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Detect type conflicts
     */
    async detectTypeConflicts() {
        const session = this.driver.session();
        try {
            // Find entities with incompatible types
            const result = await session.run(`
        MATCH (e)
        WHERE size([label in labels(e) WHERE label IN ['Person', 'Organization']]) > 1
        RETURN e.id as entityId, labels(e) as labels
        `);
            const contradictions = [];
            for (const record of result.records) {
                const labels = record.get('labels');
                if (labels.includes('Person') && labels.includes('Organization')) {
                    const contradiction = {
                        id: (0, uuid_1.v4)(),
                        contradictionType: 'type_conflict',
                        entity1Id: record.get('entityId'),
                        description: 'Entity has incompatible types: Person and Organization',
                        severity: 'critical',
                        conflictingFacts: [
                            {
                                factId: record.get('entityId'),
                                value: 'Person',
                                source: 'type_system',
                                confidence: 1.0,
                            },
                            {
                                factId: record.get('entityId'),
                                value: 'Organization',
                                source: 'type_system',
                                confidence: 1.0,
                            },
                        ],
                        suggestedResolution: 'Remove one of the conflicting type labels',
                        resolved: false,
                        detectedAt: new Date().toISOString(),
                    };
                    contradictions.push(inference_js_1.ContradictionSchema.parse(contradiction));
                }
            }
            return contradictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Detect cardinality violations
     */
    async detectCardinalityViolations() {
        const session = this.driver.session();
        try {
            // Example: Find entities with more than one value for a single-valued property
            // In production, check against ontology cardinality constraints
            const contradictions = [];
            return contradictions;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Store a detected contradiction
     */
    async storeContradiction(contradiction) {
        const validated = inference_js_1.ContradictionSchema.parse(contradiction);
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (c:Contradiction {
          id: $id,
          contradictionType: $contradictionType,
          entity1Id: $entity1Id,
          entity2Id: $entity2Id,
          relationshipId: $relationshipId,
          description: $description,
          severity: $severity,
          conflictingFacts: $conflictingFacts,
          suggestedResolution: $suggestedResolution,
          resolved: $resolved,
          resolvedBy: $resolvedBy,
          resolvedAt: $resolvedAt,
          detectedAt: datetime($detectedAt)
        })
        `, {
                id: validated.id,
                contradictionType: validated.contradictionType,
                entity1Id: validated.entity1Id || null,
                entity2Id: validated.entity2Id || null,
                relationshipId: validated.relationshipId || null,
                description: validated.description,
                severity: validated.severity,
                conflictingFacts: JSON.stringify(validated.conflictingFacts),
                suggestedResolution: validated.suggestedResolution || null,
                resolved: validated.resolved,
                resolvedBy: validated.resolvedBy || null,
                resolvedAt: validated.resolvedAt || null,
                detectedAt: validated.detectedAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Resolve a contradiction
     */
    async resolveContradiction(contradictionId, resolvedBy, resolution) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (c:Contradiction {id: $contradictionId})
        SET c.resolved = true,
            c.resolvedBy = $resolvedBy,
            c.resolvedAt = datetime(),
            c.resolution = $resolution
        `, { contradictionId, resolvedBy, resolution });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get all unresolved contradictions
     */
    async getUnresolvedContradictions() {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (c:Contradiction {resolved: false})
        RETURN c
        ORDER BY c.severity DESC, c.detectedAt DESC
        `);
            return result.records.map((record) => {
                const props = record.get('c').properties;
                return inference_js_1.ContradictionSchema.parse({
                    ...props,
                    conflictingFacts: JSON.parse(props.conflictingFacts),
                });
            });
        }
        finally {
            await session.close();
        }
    }
}
exports.ContradictionDetector = ContradictionDetector;
