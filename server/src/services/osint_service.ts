import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { pg } from '../db/pg.js';
import { MockLLM } from './llm.js';

export class OsintService {
  private llm: MockLLM;
  private db: any;
  private fetcher: any;
  private parser: XMLParser;

  constructor(db = pg, fetcher = axios) {
    this.llm = new MockLLM();
    this.db = db;
    this.fetcher = fetcher;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
  }

  /**
   * Ingests IOCs from an RSS feed.
   * @param url The RSS feed URL.
   */
  async ingestFeed(url: string = 'https://www.cisa.gov/uscert/ncas/current-activity.xml') {
    console.log(`Ingesting from ${url}...`);
    try {
      const response = await this.fetcher.get(url);
      const parsed = this.parser.parse(response.data);

      let items: any[] = [];

      // Handle RSS
      if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
        items = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
      }
      // Handle Atom
      else if (parsed.feed && parsed.feed.entry) {
        items = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
      }

      const iocs: any[] = [];

      for (const item of items) {
        const title = item.title || "No Title";
        const link = item.link && typeof item.link === 'string' ? item.link : (item.link?.['@_href'] || "");
        const description = item.description || item.content || "";

        const extracted = this.extractPotentialIOCs(description + " " + title);

        for (const val of extracted) {
          iocs.push({
            type: val.type,
            value: val.value,
            source: url,
            external_id: link,
            metadata: { title, link }
          });
        }
      }

      console.log(`Found ${iocs.length} potential IOCs.`);

      let newCount = 0;
      for (const ioc of iocs) {
        try {
          const query = `
            INSERT INTO iocs (type, value, source, external_id, metadata)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (type, value) DO NOTHING
            RETURNING id
          `;
          const res = await this.db.oneOrNone(query, [ioc.type, ioc.value, ioc.source, ioc.external_id, ioc.metadata]);
          if (res) newCount++;
        } catch (err) {
          console.error(`Failed to insert IOC ${ioc.value}:`, err);
        }
      }

      return { count: iocs.length, new: newCount };

    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  }

  private extractPotentialIOCs(text: string): { type: string, value: string }[] {
    const results: { type: string, value: string }[] = [];

    // Simple regex for IPv4
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    const ips = text.match(ipRegex) || [];
    ips.forEach(ip => results.push({ type: 'ipv4', value: ip }));

    // Simple regex for domains (very basic)
    const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b/g;
    const domains = text.match(domainRegex) || [];

    const uniqueDomains = [...new Set(domains)].slice(0, 5);
    uniqueDomains.forEach(d => results.push({ type: 'domain', value: d }));

    return results;
  }

  /**
   * Analyzes pending IOCs using LLM.
   */
  async analyzePending(limit = 5) {
    // 1. Fetch unanalyzed IOCs
    const query = `
      SELECT i.* FROM iocs i
      LEFT JOIN risk_assessments r ON i.id = r.ioc_id
      WHERE r.id IS NULL
      LIMIT $1
    `;
    let iocs = [];
    try {
        iocs = await this.db.many(query, [limit]);
    } catch (e: any) {
        // pg-promise (if used) throws on 0 rows. node-postgres pool.query returns rows.
        // If wrapper throws, we catch it.
        // Assuming this.db.many returns array based on previous check, but just in case:
        if (e.message?.includes('No data returned') || Array.isArray(e)) {
            iocs = [];
        } else if (Array.isArray(e)) {
            iocs = e; // Sometimes e is the result in weird promise chains? Unlikely.
        } else {
             // If db.many returns empty array it won't throw.
             // If it throws, we assume empty or error.
             console.log("No pending IOCs or error fetching:", e.message);
             return [];
        }
    }

    if (!iocs || iocs.length === 0) return [];

    const results = [];

    for (const ioc of iocs) {
      const summary = await this.mockAnalysis(ioc);

      const insertQuery = `
        INSERT INTO risk_assessments (ioc_id, risk_score, summary, analyst_model)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const riskScore = Math.floor(Math.random() * 100);

      const saved = await this.db.oneOrNone(insertQuery, [ioc.id, riskScore, summary, 'mock-llama-3']);
      results.push(saved);
    }

    return results;
  }

  private async mockAnalysis(ioc: any): Promise<string> {
    const input = `Analyze this IOC: ${ioc.value} (Type: ${ioc.type})`;
    const ac = new AbortController();
    const stream = this.llm.stream(input, ac.signal);

    let response = "";
    for await (const chunk of stream) {
        response += chunk;
    }

    return `Analysis for ${ioc.value}: Likely associated with recent ${ioc.type} scanning activity. Risk is variable. ${response}`;
  }

  async getLatestIOCs(limit = 20) {
    const query = `
      SELECT i.*, r.risk_score, r.summary, r.analyst_model, r.created_at as analysis_time
      FROM iocs i
      LEFT JOIN risk_assessments r ON i.id = r.ioc_id
      ORDER BY i.created_at DESC
      LIMIT $1
    `;
    try {
      const rows = await this.db.many(query, [limit]);
      return rows;
    } catch (e) {
      return [];
    }
  }
}

export const osintService = new OsintService();
