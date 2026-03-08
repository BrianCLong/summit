"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OSINTService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const neo4j_js_1 = require("../db/neo4j.js");
const pg_js_1 = require("../db/pg.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class OSINTService {
    logger = logger_js_1.default;
    driver = null;
    pool = pg_js_1.pg;
    getDriver() {
        if (!this.driver) {
            this.driver = (0, neo4j_js_1.getNeo4jDriver)();
        }
        return this.driver;
    }
    async enrichFromWikipedia({ entityId, title }) {
        const t = title?.trim();
        if (!t && !entityId)
            throw new Error('Provide title or entityId');
        let page;
        try {
            const res = await (0, node_fetch_1.default)('https://en.wikipedia.org/w/api.php?' +
                new URLSearchParams({
                    action: 'query',
                    prop: 'extracts|info',
                    exintro: '1',
                    explaintext: '1',
                    inprop: 'url',
                    format: 'json',
                    titles: t || '',
                }));
            const data = await res.json();
            const pages = data?.query?.pages || {};
            page = Object.values(pages)[0];
        }
        catch (e) {
            this.logger.error('Wikipedia fetch failed', e);
            throw e;
        }
        if (!page || page.missing)
            throw new Error('No page found on Wikipedia');
        // Persist to Neo4j
        const session = this.getDriver().session();
        let updated;
        try {
            const props = {
                label: page.title,
                wikipediaUrl: page.fullurl,
                summary: page.extract,
                updatedAt: Date.now(),
            };
            const q = `
        MERGE (n:Entity {id: $id})
        SET n += $props
        RETURN n as node
      `;
            const id = entityId || `wiki:${page.pageid}`;
            const result = await session.run(q, { id, props });
            updated = result.records[0]?.get('node').properties;
        }
        finally {
            await session.close();
        }
        // Provenance
        try {
            await this.pool.query(`INSERT INTO provenance (resource_type, resource_id, source, uri, extractor, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)`, [
                'entity',
                updated.id,
                'wikipedia',
                page.fullurl,
                'osint.wikipedia',
                { pageid: page.pageid, title: page.title },
            ]);
        }
        catch (e) {
            this.logger.warn('Failed to record provenance', e);
        }
        return updated;
    }
}
exports.OSINTService = OSINTService;
