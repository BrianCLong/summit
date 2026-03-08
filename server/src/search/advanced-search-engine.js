"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchAnalytics = exports.BasicEmbedder = exports.AdvancedSearchEngine = void 0;
exports.createAdvancedSearchEngine = createAdvancedSearchEngine;
const natural_1 = __importDefault(require("natural"));
class BasicEmbedder {
    embed(text) {
        const tokens = tokenize(text);
        if (!tokens.length)
            return [0];
        return tokens.map((t) => t.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) / t.length);
    }
}
exports.BasicEmbedder = BasicEmbedder;
class SearchAnalytics {
    queryCounts = new Map();
    trackQuery(text) {
        if (!text)
            return;
        const normalized = text.trim().toLowerCase();
        this.queryCounts.set(normalized, (this.queryCounts.get(normalized) || 0) + 1);
    }
    topQueries(limit = 5) {
        return Array.from(this.queryCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([q]) => q);
    }
    get totalQueries() {
        return Array.from(this.queryCounts.values()).reduce((acc, count) => acc + count, 0);
    }
}
exports.SearchAnalytics = SearchAnalytics;
class InMemorySearchStore {
    embedder;
    docs = new Map();
    savedSearches = new Map();
    history = [];
    constructor(embedder) {
        this.embedder = embedder;
    }
    indexDocuments(documents) {
        documents.forEach((doc) => {
            if (!doc.embedding) {
                doc.embedding = this.embedder.embed(doc.title + ' ' + doc.body);
            }
            this.docs.set(doc.id, doc);
        });
    }
    allDocuments() {
        return Array.from(this.docs.values());
    }
    getDocument(id) {
        return this.docs.get(id);
    }
    saveSearch(entry) {
        this.savedSearches.set(entry.id, entry);
    }
    listSavedSearches() {
        return Array.from(this.savedSearches.values());
    }
    recordHistory(entry) {
        this.history.push(entry);
    }
    historyFor(userId) {
        return this.history.filter((h) => h.userId === userId);
    }
}
class AdvancedSearchEngine {
    embedder;
    store;
    analytics;
    now;
    constructor(options) {
        this.embedder = options?.embedder ?? new BasicEmbedder();
        this.analytics = options?.analytics ?? new SearchAnalytics();
        this.store = new InMemorySearchStore(this.embedder);
        this.now = options?.now ?? (() => new Date());
    }
    index(documents) {
        this.store.indexDocuments(documents);
    }
    saveSearch(search) {
        const entry = { ...search, createdAt: this.now() };
        this.store.saveSearch(entry);
        return entry;
    }
    savedSearches() {
        return this.store.listSavedSearches();
    }
    searchHistory(userId) {
        return this.store.historyFor(userId);
    }
    search(query) {
        const sanitizedLimit = query.limit && query.limit > 0 ? query.limit : 25;
        const documents = this.store.allDocuments();
        const tokens = tokenize(query.text ?? '');
        const dslTokens = query.dsl ? parseDsl(query.dsl) : [];
        const matches = documents
            .map((doc) => this.scoreDocument(doc, tokens, query, dslTokens))
            .filter((hit) => !!hit && hit.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, sanitizedLimit);
        const facets = this.aggregateFacets(matches.map((m) => m.document));
        const suggestions = this.buildSuggestions(tokens, matches);
        const autocomplete = this.autocomplete(tokens.join(' '));
        if (query.userId) {
            this.store.recordHistory({ userId: query.userId, query, executedAt: this.now() });
        }
        this.analytics.trackQuery(query.text);
        return {
            hits: matches,
            facets,
            suggestions,
            autocomplete,
            analytics: {
                totalQueries: this.analytics.totalQueries,
                popularQueries: this.analytics.topQueries(),
            },
        };
    }
    autocomplete(prefix) {
        if (!prefix)
            return [];
        const normalized = prefix.trim().toLowerCase();
        const seen = new Set();
        const completions = [];
        this.store.allDocuments().forEach((doc) => {
            const candidates = [...tokenize(doc.title), ...(doc.tags ?? [])];
            candidates.forEach((c) => {
                if (c.toLowerCase().startsWith(normalized) && !seen.has(c)) {
                    completions.push(c);
                    seen.add(c);
                }
            });
        });
        this.store.listSavedSearches().forEach((saved) => {
            if (saved.name.toLowerCase().startsWith(normalized) && !seen.has(saved.name)) {
                completions.push(saved.name);
                seen.add(saved.name);
            }
        });
        return completions.slice(0, 10);
    }
    buildSuggestions(tokens, matches) {
        const historySuggestions = this.analytics.topQueries(3);
        const fuzzySuggestions = matches
            .flatMap((m) => tokenize(m.document.title))
            .filter((term) => tokens.every((t) => !term.toLowerCase().startsWith(t.toLowerCase())));
        return Array.from(new Set([...historySuggestions, ...fuzzySuggestions])).slice(0, 10);
    }
    scoreDocument(doc, tokens, query, dslTokens) {
        if (!this.matchesDsl(doc, dslTokens))
            return null;
        if (!this.matchesFacetFilters(doc, query.facets))
            return null;
        if (!this.matchesTimeWindow(doc, query.time))
            return null;
        const fullTextScore = tokens.reduce((score, token) => {
            const combined = `${doc.title} ${doc.body}`.toLowerCase();
            if (combined.includes(token.toLowerCase()))
                return score + 2;
            if (query.fuzzy) {
                const distance = natural_1.default.LevenshteinDistance(token.toLowerCase(), doc.title.toLowerCase());
                return distance <= 2 ? score + 1 : score;
            }
            return score;
        }, 0);
        const semanticScore = query.semantic
            ? cosineSimilarity(this.embedder.embed(tokens.join(' ')), doc.embedding ?? []) * 5
            : 0;
        const entityMatches = this.matchEntities(doc, tokens);
        const entityScore = entityMatches.length ? 1.5 : 0;
        const score = fullTextScore + semanticScore + entityScore;
        if (score <= 0)
            return null;
        return {
            document: doc,
            score,
            matchedEntities: entityMatches,
            crossReferences: this.detectCrossReferences(doc),
        };
    }
    detectCrossReferences(doc) {
        const references = [];
        const seen = new Set();
        const docs = this.store.allDocuments();
        docs.forEach((candidate) => {
            if (doc.references?.includes(candidate.id)) {
                const key = `${candidate.id}-references`;
                if (!seen.has(key)) {
                    references.push({ id: candidate.id, direction: 'references' });
                    seen.add(key);
                }
            }
            if (candidate.references?.includes(doc.id)) {
                const key = `${candidate.id}-referencedBy`;
                if (!seen.has(key)) {
                    references.push({ id: candidate.id, direction: 'referencedBy' });
                    seen.add(key);
                }
            }
        });
        return references;
    }
    matchEntities(doc, tokens) {
        const normalizedTokens = tokens.map((t) => t.toLowerCase());
        return (doc.entities ?? []).filter((entity) => normalizedTokens.some((token) => entity.label.toLowerCase().includes(token)));
    }
    matchesFacetFilters(doc, filters) {
        if (!filters)
            return true;
        return Object.entries(filters).every(([facet, values]) => {
            if (!values.length)
                return true;
            const docValues = doc.facets?.[facet] ?? [];
            return values.some((v) => docValues.includes(v));
        });
    }
    matchesTimeWindow(doc, time) {
        if (!time)
            return true;
        const created = doc.createdAt ? new Date(doc.createdAt) : undefined;
        if (!created)
            return true;
        if (time.from && created < time.from)
            return false;
        if (time.to && created > time.to)
            return false;
        return true;
    }
    matchesDsl(doc, tokens) {
        if (!tokens.length)
            return true;
        let result = null;
        let pendingOp = null;
        let negateNext = false;
        for (let i = 0; i < tokens.length; i += 1) {
            const token = tokens[i];
            if (token.type === 'OP') {
                if (token.op === 'NOT') {
                    negateNext = !negateNext;
                    continue;
                }
                pendingOp = token.op;
                continue;
            }
            let termValue = this.evaluateTerm(doc, token);
            if (negateNext) {
                termValue = !termValue;
                negateNext = false;
            }
            if (result === null) {
                result = termValue;
            }
            else if (pendingOp === 'AND') {
                result = result && termValue;
            }
            else if (pendingOp === 'OR') {
                result = result || termValue;
            }
            pendingOp = null;
        }
        return result ?? true;
    }
    evaluateTerm(doc, token) {
        if (!token.field) {
            const combined = `${doc.title} ${doc.body}`.toLowerCase();
            return combined.includes(token.value.toLowerCase());
        }
        if (token.field === 'tag') {
            return (doc.tags ?? []).includes(token.value);
        }
        if (token.field === 'entity') {
            return (doc.entities ?? []).some((e) => e.label.toLowerCase().includes(token.value.toLowerCase()));
        }
        const facetValues = doc.facets?.[token.field] ?? [];
        return facetValues.includes(token.value);
    }
    aggregateFacets(docs) {
        const facetBuckets = {};
        docs.forEach((doc) => {
            Object.entries(doc.facets ?? {}).forEach(([facet, values]) => {
                facetBuckets[facet] = facetBuckets[facet] ?? {};
                values.forEach((value) => {
                    facetBuckets[facet][value] = (facetBuckets[facet][value] ?? 0) + 1;
                });
            });
        });
        return facetBuckets;
    }
}
exports.AdvancedSearchEngine = AdvancedSearchEngine;
function tokenize(text) {
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean);
}
function parseDsl(input) {
    const raw = input.match(/"[^"]+"|\S+/g) ?? [];
    return raw.map((part) => {
        const upper = part.toUpperCase();
        if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
            return { type: 'OP', op: upper };
        }
        if (part.includes(':')) {
            const [field, value] = part.split(':');
            return { type: 'TERM', field, value: value.replace(/"/g, '') };
        }
        return { type: 'TERM', value: part.replace(/"/g, '') };
    });
}
function cosineSimilarity(a, b) {
    if (!a.length || !b.length)
        return 0;
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    for (let i = 0; i < length; i += 1) {
        dot += a[i] * b[i];
        aMag += a[i] * a[i];
        bMag += b[i] * b[i];
    }
    if (!aMag || !bMag)
        return 0;
    return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}
function createAdvancedSearchEngine(options) {
    return new AdvancedSearchEngine(options);
}
