import { Driver, Session } from 'neo4j-driver';
import { Pool } from 'pg';
import * as dns from 'node:dns/promises';
import { getNeo4jDriver, getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { z } from 'zod/v4';
import { ManagedPostgresPool } from '../db/postgres.js';

// Use global fetch (Node 18+) to avoid ESM/CJS issues with node-fetch v3 in Jest
// If global fetch is not available, we fall back to a simple implementation or error.
declare const fetch: any;

// Define schemas for validation
export const OSINTTargetSchema = z.object({
  type: z.enum(['ip', 'domain', 'email', 'ssl', 'social', 'api', 'entity']),
  value: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type OSINTTarget = z.infer<typeof OSINTTargetSchema>;

export const EnrichmentResultSchema = z.object({
  source: z.string(),
  data: z.record(z.string(), z.any()),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
});

export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;

export class OSINTService {
  private driver: Driver;
  private pool: ManagedPostgresPool;
  private logger = logger;

  constructor() {
    this.driver = getNeo4jDriver();
    this.pool = getPostgresPool();
  }

  // --- Core Enrichment Methods ---

  async enrich(target: OSINTTarget): Promise<EnrichmentResult | null> {
    try {
      // Validate input
      OSINTTargetSchema.parse(target);

      this.logger.info(`Starting OSINT enrichment for ${target.type}: ${target.value}`);

      let result: EnrichmentResult | null = null;

      switch (target.type) {
        case 'entity':
          result = await this.enrichFromWikipedia({ title: target.value });
          break;
        case 'ip':
          result = await this.enrichIPRange(target.value);
          break;
        case 'domain':
        case 'email':
          result = await this.enrichDomain(target.value);
          break;
        case 'ssl':
          result = await this.enrichSSL(target.value);
          break;
        case 'social':
          result = await this.enrichSocial(target.value);
          break;
        case 'api':
          result = await this.enrichAPI(target.value);
          break;
        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }

      if (result) {
        await this.persistResult(target, result);
        await this.recordProvenance(target, result);
      }

      return result;
    } catch (error) {
      this.logger.error(`Enrichment failed for ${target.value}`, error);
      throw error;
    }
  }

  // --- Bulk Processing with Rate Limiting ---

  async processBulk(targets: OSINTTarget[], concurrency = 3): Promise<Array<{ target: OSINTTarget; result: EnrichmentResult | null; error?: any }>> {
    const results: Array<{ target: OSINTTarget; result: EnrichmentResult | null; error?: any }> = [];

    const queue = [...targets];
    const workers = Array(concurrency).fill(null).map(async () => {
      while (queue.length > 0) {
        const target = queue.shift();
        if (!target) break;

        try {
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 500));

          const result = await this.enrich(target);
          results.push({ target, result });
        } catch (error) {
          results.push({ target, error, result: null });
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  // --- Specific Enrichers ---

  private async enrichFromWikipedia({ title }: { title: string }): Promise<EnrichmentResult> {
    const t = title?.trim();
    if (!t) throw new Error('Provide title');

    let page;
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
            titles: t,
          }),
      );
      const data = await res.json() as any;
      const pages = data?.query?.pages || {};
      page = Object.values(pages)[0] as any;
    } catch (e) {
      this.logger.error('Wikipedia fetch failed', e);
      throw e;
    }

    if (!page || page.missing) throw new Error('No page found');

    return {
      source: 'wikipedia',
      data: {
        title: page.title,
        fullurl: page.fullurl,
        extract: page.extract,
        pageid: page.pageid
      },
      timestamp: Date.now(),
      confidence: 1.0
    };
  }

  private async enrichIPRange(ip: string): Promise<EnrichmentResult> {
    // In production, integration with MaxMind or IPInfo would go here.
    // For now, we return basic structural data and simulate GeoIP
    return {
      source: 'geoip-provider',
      data: {
        ip,
        range: `${ip}/24`, // Assumed /24 for basic analysis
        country: 'Unknown', // Requires DB
        asn: 'Unknown',
        isp: 'Unknown',
        note: 'GeoIP lookup requires MaxMind database or API key.'
      },
      timestamp: Date.now(),
      confidence: 0.5
    };
  }

  private async enrichDomain(domain: string): Promise<EnrichmentResult> {
    // Implement real DNS lookup
    try {
      const addresses = await dns.resolve4(domain).catch(() => []);
      const mxRecords = await dns.resolveMx(domain).catch(() => []);

      return {
        source: 'dns-lookup',
        data: {
          domain,
          a_records: addresses,
          mx_records: mxRecords.map(r => r.exchange),
          registrar: 'Unknown' // Requires Whois API
        },
        timestamp: Date.now(),
        confidence: 0.9
      };
    } catch (e) {
      // Fallback or error
       return {
        source: 'dns-lookup',
        data: { domain, error: 'Resolution failed' },
        timestamp: Date.now(),
        confidence: 0.0
      };
    }
  }

  private async enrichSSL(domain: string): Promise<EnrichmentResult> {
    // Requires 'tls' module connection, can be slow.
    // For stabilization, we return a structured placeholder.
    return {
      source: 'ssl-analyzer',
      data: {
        subject: domain,
        issuer: 'Pending Analysis',
        valid: false,
        note: 'Deep SSL analysis disabled in default pipeline to prevent timeouts.'
      },
      timestamp: Date.now(),
      confidence: 0.5
    };
  }

  private async enrichSocial(handle: string): Promise<EnrichmentResult> {
    // Social graph scraping is highly specific and often requires auth.
    return {
      source: 'social-graph',
      data: {
        handle,
        platform: 'generic',
        status: 'Profile analysis pending'
      },
      timestamp: Date.now(),
      confidence: 0.3
    };
  }

  private async enrichAPI(endpoint: string): Promise<EnrichmentResult> {
     try {
       const res = await fetch(endpoint, { method: 'HEAD', timeout: 5000 });
       return {
         source: 'api-probe',
         data: {
           url: endpoint,
           status: res.status,
           server: res.headers.get('server') || 'unknown',
           content_type: res.headers.get('content-type')
         },
         timestamp: Date.now(),
         confidence: 0.9
       };
     } catch (e) {
       return {
         source: 'api-probe',
         data: { url: endpoint, status: 'unreachable' },
         timestamp: Date.now(),
         confidence: 0.1
       };
     }
  }

  // --- Persistence & Graph Integration ---

  private async persistResult(target: OSINTTarget, result: EnrichmentResult) {
    const session = this.driver.session();
    try {
      // Different graph patterns based on type
      let cypher = '';
      const params: any = {
        props: { ...result.data, updatedAt: result.timestamp },
        targetValue: target.value
      };

      switch (target.type) {
        case 'ip':
          cypher = `
            MERGE (n:IPAddress {ip: $targetValue})
            SET n += $props
            MERGE (loc:Location {country: COALESCE($props.country, 'Unknown')})
            MERGE (n)-[:LOCATED_IN]->(loc)
          `;
          break;
        case 'domain':
        case 'email':
          cypher = `
            MERGE (d:Domain {name: $targetValue})
            SET d += $props
            FOREACH (mx IN $props.mx_records |
              MERGE (m:MailServer {host: mx})
              MERGE (d)-[:HAS_MX]->(m)
            )
          `;
          break;
        case 'ssl':
           cypher = `
            MERGE (d:Domain {name: $targetValue})
            SET d.ssl_issuer = $props.issuer
           `;
           break;
        case 'social':
           cypher = `
            MERGE (p:Persona {handle: $targetValue})
            SET p += $props
           `;
           break;
        case 'api':
           cypher = `
            MERGE (e:Endpoint {url: $targetValue})
            SET e += $props
           `;
           break;
        default:
          // Default generic Entity or Wikipedia
           cypher = `
            MERGE (n:Entity {id: $targetValue})
            SET n += $props
           `;
      }

      await session.run(cypher, params);
      this.logger.info(`Persisted OSINT data for ${target.value} to graph`);

    } catch (e) {
      this.logger.error('Failed to persist to graph', e);
      throw e;
    } finally {
      await session.close();
    }
  }

  private async recordProvenance(target: OSINTTarget, result: EnrichmentResult) {
    try {
      await this.pool.query(
        `INSERT INTO provenance (resource_type, resource_id, source, uri, extractor, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'osint_target',
          target.value,
          result.source,
          target.value, // using value as URI for now
          `osint.${target.type}`,
          JSON.stringify({
            confidence: result.confidence,
            targetType: target.type
          }),
        ],
      );
    } catch (e) {
      // Soft fail for provenance if table missing or other issue, but log it
      this.logger.warn('Failed to record provenance', e);
    }
  }
}
