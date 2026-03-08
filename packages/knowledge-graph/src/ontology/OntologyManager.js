"use strict";
/**
 * Ontology and Schema Management System
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OntologyManager = void 0;
const uuid_1 = require("uuid");
const ontology_js_1 = require("../types/ontology.js");
class OntologyManager {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    /**
     * Create a new ontology
     */
    async createOntology(ontology) {
        const now = new Date().toISOString();
        const fullOntology = {
            ...ontology,
            id: (0, uuid_1.v4)(),
            createdAt: now,
            updatedAt: now,
        };
        const validated = ontology_js_1.OntologySchema.parse(fullOntology);
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (o:Ontology {
          id: $id,
          name: $name,
          version: $version,
          namespace: $namespace,
          description: $description,
          metadata: $metadata,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        RETURN o
        `, {
                id: validated.id,
                name: validated.name,
                version: validated.version,
                namespace: validated.namespace,
                description: validated.description || null,
                metadata: JSON.stringify(validated.metadata || {}),
                createdAt: validated.createdAt,
                updatedAt: validated.updatedAt,
            });
            // Create entity types
            for (const entityType of validated.entityTypes) {
                await this.createEntityType(validated.id, entityType);
            }
            // Create relationship types
            for (const relType of validated.relationshipTypes) {
                await this.createRelationshipType(validated.id, relType);
            }
            return validated;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get an ontology by ID
     */
    async getOntology(ontologyId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (o:Ontology {id: $ontologyId})
        OPTIONAL MATCH (o)-[:HAS_ENTITY_TYPE]->(et:EntityType)
        OPTIONAL MATCH (o)-[:HAS_RELATIONSHIP_TYPE]->(rt:RelationshipType)
        RETURN o,
               collect(DISTINCT et) as entityTypes,
               collect(DISTINCT rt) as relationshipTypes
        `, { ontologyId });
            if (result.records.length === 0) {
                return null;
            }
            const record = result.records[0];
            const ontologyNode = record.get('o').properties;
            const entityTypes = record.get('entityTypes').map((n) => n.properties);
            const relationshipTypes = record.get('relationshipTypes').map((n) => n.properties);
            return ontology_js_1.OntologySchema.parse({
                ...ontologyNode,
                metadata: JSON.parse(ontologyNode.metadata || '{}'),
                entityTypes: entityTypes.map((et) => ({
                    ...et,
                    properties: JSON.parse(et.properties || '[]'),
                    parentTypes: JSON.parse(et.parentTypes || '[]'),
                })),
                relationshipTypes: relationshipTypes.map((rt) => ({
                    ...rt,
                    properties: JSON.parse(rt.properties || '[]'),
                    sourceTypes: JSON.parse(rt.sourceTypes || '[]'),
                    targetTypes: JSON.parse(rt.targetTypes || '[]'),
                })),
                imports: [],
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Create an entity type within an ontology
     */
    async createEntityType(ontologyId, entityType) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (o:Ontology {id: $ontologyId})
        CREATE (et:EntityType {
          id: $id,
          name: $name,
          description: $description,
          namespace: $namespace,
          properties: $properties,
          parentTypes: $parentTypes,
          version: $version,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        CREATE (o)-[:HAS_ENTITY_TYPE]->(et)
        `, {
                ontologyId,
                id: entityType.id,
                name: entityType.name,
                description: entityType.description || null,
                namespace: entityType.namespace,
                properties: JSON.stringify(entityType.properties),
                parentTypes: JSON.stringify(entityType.parentTypes),
                version: entityType.version,
                createdAt: entityType.createdAt,
                updatedAt: entityType.updatedAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Create a relationship type within an ontology
     */
    async createRelationshipType(ontologyId, relType) {
        const session = this.driver.session();
        try {
            await session.run(`
        MATCH (o:Ontology {id: $ontologyId})
        CREATE (rt:RelationshipType {
          id: $id,
          name: $name,
          description: $description,
          namespace: $namespace,
          sourceTypes: $sourceTypes,
          targetTypes: $targetTypes,
          properties: $properties,
          cardinality: $cardinality,
          symmetric: $symmetric,
          transitive: $transitive,
          version: $version,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        CREATE (o)-[:HAS_RELATIONSHIP_TYPE]->(rt)
        `, {
                ontologyId,
                id: relType.id,
                name: relType.name,
                description: relType.description || null,
                namespace: relType.namespace,
                sourceTypes: JSON.stringify(relType.sourceTypes),
                targetTypes: JSON.stringify(relType.targetTypes),
                properties: JSON.stringify(relType.properties),
                cardinality: relType.cardinality,
                symmetric: relType.symmetric,
                transitive: relType.transitive,
                version: relType.version,
                createdAt: relType.createdAt,
                updatedAt: relType.updatedAt,
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Import a standard ontology (FOAF, Schema.org, etc.)
     */
    async importStandardOntology(namespace) {
        const now = new Date().toISOString();
        // Define standard ontology templates
        const standardOntologies = {
            FOAF: {
                name: 'Friend of a Friend (FOAF)',
                namespace: ontology_js_1.STANDARD_NAMESPACES.FOAF,
                version: '0.1',
                description: 'FOAF vocabulary for describing people and organizations',
                entityTypes: [
                    {
                        id: (0, uuid_1.v4)(),
                        name: 'Person',
                        namespace: ontology_js_1.STANDARD_NAMESPACES.FOAF,
                        properties: [
                            { name: 'name', type: 'string', required: true },
                            { name: 'mbox', type: 'string', required: false },
                            { name: 'homepage', type: 'uri', required: false },
                            { name: 'nick', type: 'string', required: false },
                        ],
                        parentTypes: [],
                        version: '0.1',
                        createdAt: now,
                        updatedAt: now,
                    },
                    {
                        id: (0, uuid_1.v4)(),
                        name: 'Organization',
                        namespace: ontology_js_1.STANDARD_NAMESPACES.FOAF,
                        properties: [
                            { name: 'name', type: 'string', required: true },
                            { name: 'homepage', type: 'uri', required: false },
                        ],
                        parentTypes: [],
                        version: '0.1',
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
                relationshipTypes: [
                    {
                        id: (0, uuid_1.v4)(),
                        name: 'knows',
                        namespace: ontology_js_1.STANDARD_NAMESPACES.FOAF,
                        sourceTypes: ['Person'],
                        targetTypes: ['Person'],
                        properties: [],
                        cardinality: 'many-to-many',
                        symmetric: true,
                        transitive: false,
                        version: '0.1',
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
                imports: [],
            },
            SCHEMA_ORG: {
                name: 'Schema.org',
                namespace: ontology_js_1.STANDARD_NAMESPACES.SCHEMA_ORG,
                version: '1.0',
                description: 'Schema.org vocabulary for structured data',
                entityTypes: [
                    {
                        id: (0, uuid_1.v4)(),
                        name: 'Thing',
                        namespace: ontology_js_1.STANDARD_NAMESPACES.SCHEMA_ORG,
                        properties: [
                            { name: 'name', type: 'string', required: true },
                            { name: 'description', type: 'string', required: false },
                            { name: 'url', type: 'uri', required: false },
                        ],
                        parentTypes: [],
                        version: '1.0',
                        createdAt: now,
                        updatedAt: now,
                    },
                ],
                relationshipTypes: [],
                imports: [],
            },
        };
        const ontologyTemplate = standardOntologies[namespace];
        if (!ontologyTemplate) {
            throw new Error(`Unknown standard ontology: ${namespace}`);
        }
        return this.createOntology(ontologyTemplate);
    }
    /**
     * Record a schema change for versioning
     */
    async recordSchemaChange(change) {
        const fullChange = {
            ...change,
            id: (0, uuid_1.v4)(),
            createdAt: new Date().toISOString(),
        };
        const validated = ontology_js_1.SchemaChangeSchema.parse(fullChange);
        const session = this.driver.session();
        try {
            await session.run(`
        CREATE (sc:SchemaChange {
          id: $id,
          ontologyId: $ontologyId,
          version: $version,
          previousVersion: $previousVersion,
          changeType: $changeType,
          changes: $changes,
          migrationType: $migrationType,
          migrationScript: $migrationScript,
          appliedAt: $appliedAt,
          createdBy: $createdBy,
          createdAt: datetime($createdAt)
        })
        `, {
                id: validated.id,
                ontologyId: validated.ontologyId,
                version: validated.version,
                previousVersion: validated.previousVersion || null,
                changeType: validated.changeType,
                changes: JSON.stringify(validated.changes),
                migrationType: validated.migrationType,
                migrationScript: validated.migrationScript || null,
                appliedAt: validated.appliedAt || null,
                createdBy: validated.createdBy,
                createdAt: validated.createdAt,
            });
            return validated;
        }
        finally {
            await session.close();
        }
    }
    /**
     * Get schema evolution history for an ontology
     */
    async getSchemaHistory(ontologyId) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (sc:SchemaChange {ontologyId: $ontologyId})
        RETURN sc
        ORDER BY sc.createdAt DESC
        `, { ontologyId });
            return result.records.map((record) => {
                const props = record.get('sc').properties;
                return ontology_js_1.SchemaChangeSchema.parse({
                    ...props,
                    changes: JSON.parse(props.changes),
                });
            });
        }
        finally {
            await session.close();
        }
    }
    /**
     * Validate entity against ontology
     */
    async validateEntity(entityTypeId, properties) {
        const session = this.driver.session();
        try {
            const result = await session.run(`
        MATCH (et:EntityType {id: $entityTypeId})
        RETURN et
        `, { entityTypeId });
            if (result.records.length === 0) {
                return { valid: false, errors: ['Entity type not found'] };
            }
            const entityType = result.records[0].get('et').properties;
            const typeProperties = JSON.parse(entityType.properties || '[]');
            const errors = [];
            // Check required properties
            for (const prop of typeProperties) {
                if (prop.required && !(prop.name in properties)) {
                    errors.push(`Required property '${prop.name}' is missing`);
                }
                if (prop.name in properties) {
                    const value = properties[prop.name];
                    // Basic type checking
                    if (prop.type === 'number' && typeof value !== 'number') {
                        errors.push(`Property '${prop.name}' must be a number`);
                    }
                    if (prop.type === 'string' && typeof value !== 'string') {
                        errors.push(`Property '${prop.name}' must be a string`);
                    }
                    if (prop.type === 'boolean' && typeof value !== 'boolean') {
                        errors.push(`Property '${prop.name}' must be a boolean`);
                    }
                }
            }
            return {
                valid: errors.length === 0,
                errors,
            };
        }
        finally {
            await session.close();
        }
    }
}
exports.OntologyManager = OntologyManager;
