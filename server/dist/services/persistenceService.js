import { cacheService } from './cacheService';
class PersistenceService {
    // In-memory storage for demonstration
    // In production, this would be backed by PostgreSQL/Neo4j
    investigations = new Map();
    entities = new Map();
    relationships = new Map();
    constructor() {
        this.initializeMockData();
    }
    initializeMockData() {
        // Initialize with some mock data
        const investigation1 = {
            id: 'inv-001',
            name: 'Operation Nightfall',
            description: 'Investigation into advanced persistent threat',
            status: 'ACTIVE',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            nodeCount: 47,
            edgeCount: 23,
            metadata: { priority: 'HIGH', analyst: 'John Doe' },
        };
        const investigation2 = {
            id: 'inv-002',
            name: 'Project Aurora',
            description: 'Financial fraud investigation',
            status: 'COMPLETED',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            nodeCount: 23,
            edgeCount: 15,
            metadata: { priority: 'MEDIUM', analyst: 'Jane Smith' },
        };
        this.investigations.set(investigation1.id, investigation1);
        this.investigations.set(investigation2.id, investigation2);
        // Initialize mock entities
        const entity1 = {
            id: '1',
            type: 'person',
            label: 'John Doe',
            description: 'Suspected threat actor',
            properties: { age: 30, role: 'analyst' },
            confidence: 0.95,
            source: 'internal_analysis',
            investigationId: 'inv-001',
            createdBy: 'system',
            updatedBy: 'analyst_1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attack_ttps: ['T1003', 'T1059'],
            capec_ttps: ['CAPEC-151', 'CAPEC-88'],
            triage_score: 0.85,
            actor_links: ['APT29', 'FIN7'],
        };
        const entity2 = {
            id: '2',
            type: 'organization',
            label: 'ACME Corp',
            description: 'Target organization',
            properties: { industry: 'technology', employees: 1000 },
            confidence: 0.88,
            source: 'osint',
            investigationId: 'inv-001',
            createdBy: 'system',
            updatedBy: 'analyst_1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attack_ttps: ['T1566'],
            capec_ttps: ['CAPEC-163'],
            triage_score: 0.72,
            actor_links: ['Lazarus Group'],
        };
        this.entities.set(entity1.id, entity1);
        this.entities.set(entity2.id, entity2);
        console.log('[PERSISTENCE] Initialized with mock data');
    }
    // Investigation operations
    async getInvestigations() {
        const cacheKey = 'investigations:all';
        let investigations = await cacheService.get(cacheKey);
        if (!investigations) {
            investigations = Array.from(this.investigations.values());
            await cacheService.set(cacheKey, investigations, 60); // Cache for 1 minute
        }
        return investigations;
    }
    async getInvestigation(id) {
        const cacheKey = `investigation:${id}`;
        let investigation = await cacheService.get(cacheKey);
        if (!investigation) {
            investigation = this.investigations.get(id) || null;
            if (investigation) {
                await cacheService.set(cacheKey, investigation, 300); // Cache for 5 minutes
            }
        }
        return investigation;
    }
    async createInvestigation(investigation) {
        const newInvestigation = {
            ...investigation,
            id: `inv-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.investigations.set(newInvestigation.id, newInvestigation);
        // Invalidate cache
        await cacheService.delete('investigations:all');
        console.log(`[PERSISTENCE] Created investigation: ${newInvestigation.id}`);
        return newInvestigation;
    }
    // Entity operations
    async getEntities(investigationId) {
        const cacheKey = investigationId
            ? `entities:investigation:${investigationId}`
            : 'entities:all';
        let entities = await cacheService.get(cacheKey);
        if (!entities) {
            entities = Array.from(this.entities.values());
            if (investigationId) {
                entities = entities.filter((e) => e.investigationId === investigationId);
            }
            await cacheService.set(cacheKey, entities, 120); // Cache for 2 minutes
        }
        return entities;
    }
    async getEntity(id) {
        const cacheKey = `entity:${id}`;
        let entity = await cacheService.get(cacheKey);
        if (!entity) {
            entity = this.entities.get(id) || null;
            if (entity) {
                await cacheService.set(cacheKey, entity, 300); // Cache for 5 minutes
            }
        }
        return entity;
    }
    async searchEntities(query, limit = 10) {
        const cacheKey = `search:entities:${query}:${limit}`;
        let results = await cacheService.get(cacheKey);
        if (!results) {
            const allEntities = Array.from(this.entities.values());
            results = allEntities
                .filter((entity) => entity.label.toLowerCase().includes(query.toLowerCase()) ||
                entity.description?.toLowerCase().includes(query.toLowerCase()) ||
                entity.type.toLowerCase().includes(query.toLowerCase()))
                .slice(0, limit);
            await cacheService.set(cacheKey, results, 60); // Cache search results for 1 minute
        }
        return results;
    }
    async createEntity(entity) {
        const newEntity = {
            ...entity,
            id: `entity-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.entities.set(newEntity.id, newEntity);
        // Invalidate relevant caches
        await cacheService.delete('entities:all');
        if (newEntity.investigationId) {
            await cacheService.delete(`entities:investigation:${newEntity.investigationId}`);
        }
        console.log(`[PERSISTENCE] Created entity: ${newEntity.id}`);
        return newEntity;
    }
    // Relationship operations
    async getRelationships(investigationId) {
        const cacheKey = investigationId
            ? `relationships:investigation:${investigationId}`
            : 'relationships:all';
        let relationships = await cacheService.get(cacheKey);
        if (!relationships) {
            relationships = Array.from(this.relationships.values());
            if (investigationId) {
                relationships = relationships.filter((r) => r.investigationId === investigationId);
            }
            await cacheService.set(cacheKey, relationships, 120); // Cache for 2 minutes
        }
        return relationships;
    }
    // Statistics
    async getStats() {
        const stats = {
            investigations: {
                total: this.investigations.size,
                active: Array.from(this.investigations.values()).filter((i) => i.status === 'ACTIVE').length,
                completed: Array.from(this.investigations.values()).filter((i) => i.status === 'COMPLETED').length,
            },
            entities: {
                total: this.entities.size,
                byType: this.getEntityTypeStats(),
            },
            relationships: {
                total: this.relationships.size,
            },
            cache: cacheService.getStats(),
        };
        return stats;
    }
    getEntityTypeStats() {
        const typeStats = {};
        for (const entity of this.entities.values()) {
            typeStats[entity.type] = (typeStats[entity.type] || 0) + 1;
        }
        return typeStats;
    }
}
// Global persistence service instance
export const persistenceService = new PersistenceService();
//# sourceMappingURL=persistenceService.js.map