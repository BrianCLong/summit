// @ts-nocheck
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = (pino as any)({ name: 'SynonymService' });

export class SynonymService {
  private synonyms: Record<string, string[]> = {};
  private loaded = false;

  constructor() {
    this.loadSynonyms();
  }

  private loadSynonyms() {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), 'server/src/config/synonyms.json'),
        path.resolve(process.cwd(), 'src/config/synonyms.json'),
      ];

      const configPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

      if (configPath) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.synonyms = JSON.parse(raw);
        this.loaded = true;
        logger.info(`Loaded synonyms for ${Object.keys(this.synonyms).length} terms.`);
      } else {
        logger.warn('Synonym file not found in expected locations');
      }
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({ err: error }, 'Failed to load synonyms');
    }
  }

  /**
   * Expands a query string by adding synonyms for known terms.
   * Returns the expanded query string.
   */
  expandQuery(query: string): string {
    if (!query || !this.loaded) return query;

    const terms = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set<string>();

    for (const term of terms) {
      expandedTerms.add(term);
      if (this.synonyms[term]) {
        this.synonyms[term].forEach(syn => expandedTerms.add(syn));
      }
    }

    // Also check multi-word keys
    for (const key of Object.keys(this.synonyms)) {
      if (query.toLowerCase().includes(key) && !terms.includes(key)) {
        this.synonyms[key].forEach(syn => expandedTerms.add(syn));
      }
    }

    return Array.from(expandedTerms).join(' ');
  }

  getSynonyms(term: string): string[] {
    return this.synonyms[term.toLowerCase()] || [];
  }
}

export const synonymService = new SynonymService();
