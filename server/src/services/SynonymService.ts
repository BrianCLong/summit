import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

const logger = pino({ name: 'SynonymService' });

export class SynonymService {
  private synonyms: Record<string, string[]> = {};
  private loaded = false;

  constructor() {
    this.loadSynonyms();
  }

  private loadSynonyms() {
    try {
      // Handle both ESM and CJS environments or different structures
      // Ideally use a config loader, but simple fs check is fine
      let configPath = '';
      if (typeof import.meta !== 'undefined' && import.meta.url) {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          configPath = path.join(__dirname, '../config/synonyms.json');
      } else {
          // Fallback if import.meta not available (CJS) or different structure
          configPath = path.resolve('server/src/config/synonyms.json');
      }

      // Check relative to process.cwd() as fallback
      if (!fs.existsSync(configPath)) {
        configPath = path.resolve(process.cwd(), 'server/src/config/synonyms.json');
      }

      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.synonyms = JSON.parse(raw);
        this.loaded = true;
        logger.info(`Loaded synonyms for ${Object.keys(this.synonyms).length} terms.`);
      } else {
        logger.warn(`Synonym file not found at ${configPath}`);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to load synonyms');
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
