import fetch from 'node-fetch';
import { getNeo4jDriver } from '../db/neo4j.js';
import { pg } from '../db/pg.js';
import logger from '../utils/logger.js';
import { cacheService } from './CacheService.js';

export class OSINTService {
    private logger = logger;
    private driver: any = null;
    private pool: any = pg;

    private getDriver() {
        if (!this.driver) {
            this.driver = getNeo4jDriver();
        }
        return this.driver;
    }

    async enrichFromWikipedia({ entityId, title }: { entityId?: string; title?: string }) {
        const t = title?.trim();
        if (!t && !entityId) throw new Error('Provide title or entityId');

        const cacheKey = `osint:wikipedia:${t || entityId}`;

        // Use cacheService to get or fetch data
        const page = await cacheService.getOrSet(cacheKey, async () => {
            try {
                const res = await fetch(
                    'https://en.wikipedia.org/w/api.php?' +
                    new URLSearchParams({
                        action: 'query',
                        prop: 'extracts|info',
                        exintro: '1',
                        explaintext: '1',
                        inprop: 'url',
                        format: 'json',
                        titles: t || '',
                    }),
                );
                const data: any = await res.json();
                const pages = data?.query?.pages || {};
                const p = Object.values(pages)[0] as any;

                if (!p || p.missing) throw new Error('No page found on Wikipedia');
                return p;
            } catch (e) {
                this.logger.error('Wikipedia fetch failed', e);
                throw e;
            }
        }, 86400); // Cache for 24 hours

        // Persist to Neo4j
        const session = this.getDriver().session();
        let updated: any;
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
        } finally {
            await session.close();
        }

        // Provenance
        try {
            await this.pool.query(
                `INSERT INTO provenance (resource_type, resource_id, source, uri, extractor, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)`,
                [
                    'entity',
                    updated.id,
                    'wikipedia',
                    page.fullurl,
                    'osint.wikipedia',
                    { pageid: page.pageid, title: page.title },
                ],
            );
        } catch (e) {
            this.logger.warn('Failed to record provenance', e);
        }

        return updated;
    }
}
