const { getNeo4jDriver, getPostgresPool } = require('../config/database');
class PublicDataService {
    constructor() {
        this.driver = null;
        this.pool = null;
    }
    getDriver() {
        if (!this.driver) {
            this.driver = getNeo4jDriver();
        }
        return this.driver;
    }
    getPool() {
        if (!this.pool) {
            this.pool = getPostgresPool();
        }
        return this.pool;
    }
    async import(source, query, investigationId) {
        // Placeholder imports; integrate real APIs (SEC/Edgar, USPTO, county records) per deployment
        // Simulate one entity enrichment and provenance
        const session = this.getDriver().session();
        try {
            const id = `${source}:${query}`;
            const props = {
                id,
                label: `${source.toUpperCase()} ${query}`,
                type: 'DOCUMENT',
                investigation_id: investigationId,
            };
            await session.run(`MERGE (n:Entity {id:$id}) SET n += $props`, {
                id,
                props,
            });
            await this.pool.query(`INSERT INTO provenance (resource_type, resource_id, source, uri, extractor, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)`, ['entity', id, source, null, 'publicdata', { query }]);
        }
        finally {
            await session.close();
        }
        return 1;
    }
}
module.exports = PublicDataService;
//# sourceMappingURL=PublicDataService.js.map