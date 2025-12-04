import natural from 'natural';

export type FacetFilter = Record<string, string[]>;

export type Entity = {
  id: string;
  type: string;
  label: string;
};

export type SearchDocument = {
  id: string;
  title: string;
  body: string;
  facets?: FacetFilter;
  tags?: string[];
  entities?: Entity[];
  references?: string[];
  embedding?: number[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type SavedSearch = {
  id: string;
  name: string;
  query: SearchQuery;
  createdBy: string;
  createdAt: Date;
};

export type SearchHistoryEntry = {
  userId: string;
  query: SearchQuery;
  executedAt: Date;
};

export type SearchQuery = {
  text?: string;
  dsl?: string;
  facets?: FacetFilter;
  fuzzy?: boolean;
  semantic?: boolean;
  time?: { from?: Date; to?: Date };
  limit?: number;
  userId?: string;
};

export type SearchHit = {
  document: SearchDocument;
  score: number;
  matchedEntities: Entity[];
  crossReferences: { id: string; direction: 'references' | 'referencedBy' }[];
};

export type SearchResponse = {
  hits: SearchHit[];
  facets: Record<string, Record<string, number>>;
  suggestions: string[];
  autocomplete: string[];
  analytics: {
    totalQueries: number;
    popularQueries: string[];
  };
};

type Token = { type: 'TERM'; field?: string; value: string } | { type: 'OP'; op: 'AND' | 'OR' | 'NOT' };

type Embedder = { embed(text: string): number[] };

class BasicEmbedder implements Embedder {
  embed(text: string): number[] {
    const tokens = tokenize(text);
    if (!tokens.length) return [0];
    return tokens.map((t) => t.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) / t.length);
  }
}

class SearchAnalytics {
  private queryCounts = new Map<string, number>();

  trackQuery(text: string | undefined) {
    if (!text) return;
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

class InMemorySearchStore {
  private docs = new Map<string, SearchDocument>();
  private savedSearches = new Map<string, SavedSearch>();
  private history: SearchHistoryEntry[] = [];

  constructor(private embedder: Embedder) {}

  indexDocuments(documents: SearchDocument[]) {
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

  getDocument(id: string) {
    return this.docs.get(id);
  }

  saveSearch(entry: SavedSearch) {
    this.savedSearches.set(entry.id, entry);
  }

  listSavedSearches() {
    return Array.from(this.savedSearches.values());
  }

  recordHistory(entry: SearchHistoryEntry) {
    this.history.push(entry);
  }

  historyFor(userId: string) {
    return this.history.filter((h) => h.userId === userId);
  }
}

export class AdvancedSearchEngine {
  private embedder: Embedder;
  private store: InMemorySearchStore;
  private analytics: SearchAnalytics;
  private now: () => Date;

  constructor(options?: {
    embedder?: Embedder;
    analytics?: SearchAnalytics;
    now?: () => Date;
  }) {
    this.embedder = options?.embedder ?? new BasicEmbedder();
    this.analytics = options?.analytics ?? new SearchAnalytics();
    this.store = new InMemorySearchStore(this.embedder);
    this.now = options?.now ?? (() => new Date());
  }

  index(documents: SearchDocument[]) {
    this.store.indexDocuments(documents);
  }

  saveSearch(search: Omit<SavedSearch, 'createdAt'>) {
    const entry: SavedSearch = { ...search, createdAt: this.now() };
    this.store.saveSearch(entry);
    return entry;
  }

  savedSearches() {
    return this.store.listSavedSearches();
  }

  searchHistory(userId: string) {
    return this.store.historyFor(userId);
  }

  search(query: SearchQuery): SearchResponse {
    const sanitizedLimit = query.limit && query.limit > 0 ? query.limit : 25;
    const documents = this.store.allDocuments();
    const tokens = tokenize(query.text ?? '');
    const dslTokens = query.dsl ? parseDsl(query.dsl) : [];
    const matches = documents
      .map((doc) => this.scoreDocument(doc, tokens, query, dslTokens))
      .filter((hit): hit is SearchHit => hit.score > 0)
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

  autocomplete(prefix: string) {
    if (!prefix) return [] as string[];
    const normalized = prefix.trim().toLowerCase();
    const seen = new Set<string>();
    const completions: string[] = [];

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

  private buildSuggestions(tokens: string[], matches: SearchHit[]) {
    const historySuggestions = this.analytics.topQueries(3);
    const fuzzySuggestions = matches
      .flatMap((m) => tokenize(m.document.title))
      .filter((term) => tokens.every((t) => !term.toLowerCase().startsWith(t.toLowerCase())));
    return Array.from(new Set([...historySuggestions, ...fuzzySuggestions])).slice(0, 10);
  }

  private scoreDocument(
    doc: SearchDocument,
    tokens: string[],
    query: SearchQuery,
    dslTokens: Token[],
  ): SearchHit | null {
    if (!this.matchesDsl(doc, dslTokens)) return null;
    if (!this.matchesFacetFilters(doc, query.facets)) return null;
    if (!this.matchesTimeWindow(doc, query.time)) return null;

    const fullTextScore = tokens.reduce((score, token) => {
      const combined = `${doc.title} ${doc.body}`.toLowerCase();
      if (combined.includes(token.toLowerCase())) return score + 2;
      if (query.fuzzy) {
        const distance = natural.LevenshteinDistance(token.toLowerCase(), doc.title.toLowerCase());
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
    if (score <= 0) return null;

    return {
      document: doc,
      score,
      matchedEntities: entityMatches,
      crossReferences: this.detectCrossReferences(doc),
    };
  }

  private detectCrossReferences(doc: SearchDocument) {
    const references: { id: string; direction: 'references' | 'referencedBy' }[] = [];
    const seen = new Set<string>();
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

  private matchEntities(doc: SearchDocument, tokens: string[]) {
    const normalizedTokens = tokens.map((t) => t.toLowerCase());
    return (doc.entities ?? []).filter((entity) =>
      normalizedTokens.some((token) => entity.label.toLowerCase().includes(token)),
    );
  }

  private matchesFacetFilters(doc: SearchDocument, filters?: FacetFilter) {
    if (!filters) return true;
    return Object.entries(filters).every(([facet, values]) => {
      if (!values.length) return true;
      const docValues = doc.facets?.[facet] ?? [];
      return values.some((v) => docValues.includes(v));
    });
  }

  private matchesTimeWindow(doc: SearchDocument, time?: { from?: Date; to?: Date }) {
    if (!time) return true;
    const created = doc.createdAt ? new Date(doc.createdAt) : undefined;
    if (!created) return true;
    if (time.from && created < time.from) return false;
    if (time.to && created > time.to) return false;
    return true;
  }

  private matchesDsl(doc: SearchDocument, tokens: Token[]) {
    if (!tokens.length) return true;
    let result: boolean | null = null;
    let pendingOp: 'AND' | 'OR' | null = null;
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
      } else if (pendingOp === 'AND') {
        result = result && termValue;
      } else if (pendingOp === 'OR') {
        result = result || termValue;
      }

      pendingOp = null;
    }

    return result ?? true;
  }

  private evaluateTerm(doc: SearchDocument, token: Extract<Token, { type: 'TERM' }>) {
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

  private aggregateFacets(docs: SearchDocument[]) {
    const facetBuckets: Record<string, Record<string, number>> = {};
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

function tokenize(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function parseDsl(input: string): Token[] {
  const raw = input.match(/"[^"]+"|\S+/g) ?? [];
  return raw.map((part) => {
    if (['AND', 'OR', 'NOT'].includes(part.toUpperCase())) {
      return { type: 'OP', op: part.toUpperCase() as Token['op'] } as Token;
    }
    if (part.includes(':')) {
      const [field, value] = part.split(':');
      return { type: 'TERM', field, value: value.replace(/\"/g, '') } as Token;
    }
    return { type: 'TERM', value: part.replace(/\"/g, '') } as Token;
  });
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (!aMag || !bMag) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

export function createAdvancedSearchEngine(options?: {
  embedder?: Embedder;
  analytics?: SearchAnalytics;
  now?: () => Date;
}) {
  return new AdvancedSearchEngine(options);
}

export { BasicEmbedder, SearchAnalytics };
