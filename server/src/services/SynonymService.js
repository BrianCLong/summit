"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.synonymService = exports.SynonymService = void 0;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'SynonymService' });
class SynonymService {
    synonyms = {};
    loaded = false;
    constructor() {
        this.loadSynonyms();
    }
    loadSynonyms() {
        try {
            const candidatePaths = [
                path_1.default.resolve(process.cwd(), 'server/src/config/synonyms.json'),
                path_1.default.resolve(process.cwd(), 'src/config/synonyms.json'),
            ];
            const configPath = candidatePaths.find((candidate) => fs_1.default.existsSync(candidate));
            if (configPath) {
                const raw = fs_1.default.readFileSync(configPath, 'utf-8');
                this.synonyms = JSON.parse(raw);
                this.loaded = true;
                logger.info(`Loaded synonyms for ${Object.keys(this.synonyms).length} terms.`);
            }
            else {
                logger.warn('Synonym file not found in expected locations');
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error({ err: error }, 'Failed to load synonyms');
        }
    }
    /**
     * Expands a query string by adding synonyms for known terms.
     * Returns the expanded query string.
     */
    expandQuery(query) {
        if (!query || !this.loaded)
            return query;
        const terms = query.toLowerCase().split(/\s+/);
        const expandedTerms = new Set();
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
    getSynonyms(term) {
        return this.synonyms[term.toLowerCase()] || [];
    }
}
exports.SynonymService = SynonymService;
exports.synonymService = new SynonymService();
