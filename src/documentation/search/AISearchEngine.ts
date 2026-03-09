/**
 * Advanced AI-Powered Search and Discovery Engine
 *
 * Provides intelligent search capabilities for documentation including:
 * - Semantic search with vector embeddings
 * - Natural language query processing
 * - Context-aware search results
 * - Auto-completion and query suggestions
 * - Multi-language search support
 * - Faceted search and filtering
 * - Personalized search results
 * - Search analytics and optimization
 */

import EventEmitter from 'eventemitter3';

export interface SearchConfig {
  indexPath: string;
  embeddingModel: 'openai' | 'huggingface' | 'custom';
  languages: string[];
  maxResults: number;
  semanticThreshold: number;
  enableAutoComplete: boolean;
  enableFacetedSearch: boolean;
  enablePersonalization: boolean;
  cacheSize: number;
  rebuildInterval: number;
  /**
   * Controls diversity in MMR reranking. 0 favors diversity, 1 favors relevance.
   */
  diversityLambda?: number;
  /**
   * Days before recency boost halves. Smaller values emphasize fresh documents.
   */
  recencyHalfLifeDays?: number;
  /**
   * Number of words in semantic snippets around matched query terms.
   */
  snippetWindowSize?: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  url: string;
  type: 'page' | 'api' | 'tutorial' | 'reference' | 'guide';
  category: string;
  tags: string[];
  language: string;
  lastModified: Date;
  priority: number;
  metadata: { [key: string]: any };
  embedding?: number[];
}

export interface SearchQuery {
  query: string;
  language?: string;
  type?: string[];
  category?: string[];
  tags?: string[];
  userId?: string;
  sessionId?: string;
  filters?: { [key: string]: any };
  facets?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'title';
  includeSnippets?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: string;
  category: string;
  score: number;
  snippet: string;
  highlights: string[];
  metadata: { [key: string]: any };
  relatedResults?: SearchResult[];
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  facets: { [facet: string]: FacetResult[] };
  suggestions: string[];
  queryTime: number;
  correctedQuery?: string;
  relatedQueries: string[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface FacetResult {
  value: string;
  count: number;
  selected: boolean;
}

export interface AutoCompleteResult {
  suggestions: string[];
  completions: Array<{
    text: string;
    type: 'query' | 'document' | 'category';
    score: number;
  }>;
  popularQueries: string[];
}

export class AISearchEngine extends EventEmitter {
  private config: SearchConfig;
  private searchIndex: Map<string, SearchDocument> = new Map();
  private vectorIndex: Map<string, number[]> = new Map();
  private queryCache: Map<string, SearchResponse> = new Map();
  private userProfiles: Map<string, UserSearchProfile> = new Map();
  private isInitialized = false;

  private readonly defaults = {
    diversityLambda: 0.3,
    recencyHalfLifeDays: 30,
    snippetWindowSize: 30,
  };

  constructor(config: SearchConfig) {
    super();
    this.config = {
      ...this.defaults,
      ...config,
    };
  }

  /**
   * Initialize the search engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔍 Initializing AI search engine...');

    try {
      // Load existing search index
      await this.loadSearchIndex();

      // Initialize embedding service
      await this.initializeEmbeddingService();

      // Set up automatic reindexing
      this.setupAutoReindexing();

      // Load user profiles for personalization
      if (this.config.enablePersonalization) {
        await this.loadUserProfiles();
      }

      this.isInitialized = true;
      this.emit('initialized');
      console.log('✅ Search engine initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize search engine:', error);
      throw error;
    }
  }

  /**
   * Add document to search index
   */
  public async addDocument(document: SearchDocument): Promise<void> {
    // Generate embedding for the document
    const embedding = await this.generateEmbedding(
      `${document.title} ${document.content}`,
      document.language,
    );

    document.embedding = embedding;
    this.searchIndex.set(document.id, document);
    this.vectorIndex.set(document.id, embedding);

    // Clear cache to reflect new content
    this.queryCache.clear();

    this.emit('document_added', document.id);
  }

  /**
   * Remove document from search index
   */
  public removeDocument(documentId: string): void {
    this.searchIndex.delete(documentId);
    this.vectorIndex.delete(documentId);
    this.queryCache.clear();

    this.emit('document_removed', documentId);
  }

  /**
   * Update document in search index
   */
  public async updateDocument(
    documentId: string,
    updates: Partial<SearchDocument>,
  ): Promise<void> {
    const existing = this.searchIndex.get(documentId);
    if (!existing) {
      throw new Error(`Document ${documentId} not found`);
    }

    const updated = { ...existing, ...updates };

    // Regenerate embedding if content changed
    if (updates.title || updates.content) {
      updated.embedding = await this.generateEmbedding(
        `${updated.title} ${updated.content}`,
        updated.language,
      );
      this.vectorIndex.set(documentId, updated.embedding);
    }

    this.searchIndex.set(documentId, updated);
    this.queryCache.clear();

    this.emit('document_updated', documentId);
  }

  /**
   * Perform search with AI-powered ranking
   */
  public async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(query);
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      cached.queryTime = Date.now() - startTime;
      return cached;
    }

    try {
      // Process and clean query
      const processedQuery = await this.processQuery(
        query.query,
        query.language,
      );

      // Get semantic search results
      const semanticSearch = await this.performSemanticSearch(
        processedQuery,
        query,
      );

      // Get keyword search results
      const keywordResults = await this.performKeywordSearch(
        processedQuery,
        query,
      );

      // Combine and rank results
      const combinedResults = await this.combineAndRankResults(
        semanticSearch.results,
        keywordResults,
        query,
        semanticSearch.queryEmbedding,
      );

      // Apply filters and facets
      const filteredResults = this.applyFilters(combinedResults, query);

      // Generate facets
      const facets = this.generateFacets(filteredResults, query.facets || []);

      // Generate suggestions and corrections
      const suggestions = await this.generateSuggestions(
        query.query,
        query.language,
      );
      const correctedQuery = await this.getQueryCorrection(
        query.query,
        query.language,
      );

      // Personalize results if enabled
      let personalizedResults = filteredResults;
      if (this.config.enablePersonalization && query.userId) {
        personalizedResults = await this.personalizeResults(
          filteredResults,
          query.userId,
        );
      }

      // Paginate results
      const page = query.page || 1;
      const limit = query.limit || this.config.maxResults;
      const paginatedResults = this.paginateResults(
        personalizedResults,
        page,
        limit,
      );

      const response: SearchResponse = {
        query: query.query,
        results: paginatedResults.results,
        totalResults: filteredResults.length,
        facets,
        suggestions,
        queryTime: Date.now() - startTime,
        correctedQuery,
        relatedQueries: await this.getRelatedQueries(query.query),
        pagination: paginatedResults.pagination,
      };

      // Cache the response
      if (this.queryCache.size >= this.config.cacheSize) {
        const firstKey = this.queryCache.keys().next().value;
        this.queryCache.delete(firstKey);
      }
      this.queryCache.set(cacheKey, response);

      // Track search analytics
      this.trackSearchQuery(query, response);

      return response;
    } catch (error) {
      console.error('❌ Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get auto-complete suggestions
   */
  public async getAutoComplete(
    partialQuery: string,
    language?: string,
  ): Promise<AutoCompleteResult> {
    if (!this.config.enableAutoComplete) {
      return { suggestions: [], completions: [], popularQueries: [] };
    }

    const suggestions = await this.generateAutoCompleteSuggestions(
      partialQuery,
      language,
    );
    const completions = await this.generateCompletions(partialQuery, language);
    const popularQueries = await this.getPopularQueries(language);

    return {
      suggestions,
      completions,
      popularQueries,
    };
  }

  /**
   * Get search analytics
   */
  public async getSearchAnalytics(
    startDate: Date,
    endDate: Date,
    filters?: { [key: string]: any },
  ): Promise<SearchAnalytics> {
    // Implementation would connect to analytics storage
    return {
      totalQueries: 0,
      uniqueQueries: 0,
      averageQueryTime: 0,
      topQueries: [],
      noResultQueries: [],
      clickThroughRate: 0,
      searchSuccessRate: 0,
      queryRefinementRate: 0,
      popularFilters: {},
      searchTrends: [],
    };
  }

  /**
   * Rebuild search index
   */
  public async rebuildIndex(): Promise<void> {
    console.log('🔄 Rebuilding search index...');

    try {
      // Clear existing indices
      this.searchIndex.clear();
      this.vectorIndex.clear();
      this.queryCache.clear();

      // Reload documents and rebuild embeddings
      await this.loadSearchIndex();

      console.log('✅ Search index rebuilt successfully');
      this.emit('index_rebuilt');
    } catch (error) {
      console.error('❌ Failed to rebuild index:', error);
      throw error;
    }
  }

  /**
   * Export search index
   */
  public async exportIndex(format: 'json' | 'csv'): Promise<string> {
    const documents = Array.from(this.searchIndex.values());

    if (format === 'json') {
      return JSON.stringify(documents, null, 2);
    } else if (format === 'csv') {
      return this.convertDocumentsToCSV(documents);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  // Private methods
  private async loadSearchIndex(): Promise<void> {
    // Implementation would load from persistent storage
    // This is a placeholder for actual index loading logic
  }

  private async initializeEmbeddingService(): Promise<void> {
    switch (this.config.embeddingModel) {
      case 'openai':
        // Initialize OpenAI embedding service
        break;
      case 'huggingface':
        // Initialize HuggingFace embedding service
        break;
      case 'custom':
        // Initialize custom embedding service
        break;
    }
  }

  private async generateEmbedding(
    text: string,
    language?: string,
  ): Promise<number[]> {
    // Deterministic pseudo-embeddings to keep behavior stable across runs
    const seed = this.hashToSeed(`${language || 'any'}:${text}`);
    const random = this.mulberry32(seed);
    const raw = new Array(768).fill(0).map(() => random());

    return this.normalizeEmbedding(raw);
  }

  private async processQuery(
    query: string,
    language?: string,
  ): Promise<string> {
    // Clean and normalize the query
    let processed = query.toLowerCase().trim();

    // Remove special characters
    processed = processed.replace(/[^\w\s]/g, ' ');

    // Handle stemming/lemmatization based on language
    if (language) {
      processed = await this.applyStemming(processed, language);
    }

    return processed;
  }

  private async performSemanticSearch(
    query: string,
    searchQuery: SearchQuery,
    queryEmbedding?: number[],
  ): Promise<{ results: SearchResult[]; queryEmbedding: number[] }> {
    // Generate query embedding
    const preparedQueryEmbedding =
      queryEmbedding ||
      (await this.generateEmbedding(query, searchQuery.language));

    const results: SearchResult[] = [];

    // Calculate similarity with all documents
    for (const [docId, docEmbedding] of this.vectorIndex) {
      const document = this.searchIndex.get(docId)!;

      // Apply type and category filters early
      if (searchQuery.type && !searchQuery.type.includes(document.type))
        continue;
      if (
        searchQuery.category &&
        !searchQuery.category.includes(document.category)
      )
        continue;

      const similarity = this.cosineSimilarity(
        preparedQueryEmbedding,
        docEmbedding,
      );

      if (similarity >= this.config.semanticThreshold) {
        results.push({
          id: document.id,
          title: document.title,
          url: document.url,
          type: document.type,
          category: document.category,
          score: similarity,
          snippet: this.generateSnippet(document.content, query),
          highlights: this.generateHighlights(document.content, query),
          metadata: document.metadata,
        });
      }
    }

    // Sort by similarity score
    return {
      results: results.sort((a, b) => b.score - a.score),
      queryEmbedding: preparedQueryEmbedding,
    };
  }

  private async performKeywordSearch(
    query: string,
    searchQuery: SearchQuery,
  ): Promise<SearchResult[]> {
    const keywords = query.split(/\s+/);
    const results: SearchResult[] = [];

    for (const [docId, document] of this.searchIndex) {
      // Apply filters
      if (searchQuery.type && !searchQuery.type.includes(document.type))
        continue;
      if (
        searchQuery.category &&
        !searchQuery.category.includes(document.category)
      )
        continue;

      let score = 0;
      const searchText = `${document.title} ${document.content}`.toLowerCase();

      // Calculate keyword matching score
      for (const keyword of keywords) {
        const titleMatches = (
          document.title.toLowerCase().match(new RegExp(keyword, 'g')) || []
        ).length;
        const contentMatches = (
          document.content.toLowerCase().match(new RegExp(keyword, 'g')) || []
        ).length;

        // Weight title matches more heavily
        score += titleMatches * 2 + contentMatches;
      }

      if (score > 0) {
        results.push({
          id: document.id,
          title: document.title,
          url: document.url,
          type: document.type,
          category: document.category,
          score,
          snippet: this.generateSnippet(document.content, query),
          highlights: this.generateHighlights(document.content, query),
          metadata: document.metadata,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private async combineAndRankResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    query: SearchQuery,
    queryEmbedding: number[],
  ): Promise<SearchResult[]> {
    const combined = new Map<string, SearchResult>();

    const intent = this.detectQueryIntent(query);
    const semanticWeight = this.getSemanticWeight(intent);
    const keywordWeight = 1 - semanticWeight;

    // Combine results, giving priority to semantic search
    for (const result of semanticResults) {
      const weightedScore = result.score * semanticWeight;
      combined.set(result.id, { ...result, score: weightedScore });
    }

    for (const result of keywordResults) {
      const existing = combined.get(result.id);
      if (existing) {
        // Combine scores
        existing.score = existing.score + result.score * keywordWeight;
      } else {
        const weightedScore = result.score * keywordWeight; // Weight keyword results
        combined.set(result.id, { ...result, score: weightedScore });
      }
    }

    // Convert to array and sort by combined score
    const finalResults = Array.from(combined.values()).sort(
      (a, b) => b.score - a.score,
    );

    // Apply priority boost from document metadata
    for (const result of finalResults) {
      const doc = this.searchIndex.get(result.id)!;
      result.score *= doc.priority || 1.0;
      result.score *= this.computeRecencyBoost(doc.lastModified);
    }

    const reranked = this.rerankWithMMR(
      finalResults.sort((a, b) => b.score - a.score),
      queryEmbedding,
      query.limit || this.config.maxResults,
    );

    return reranked;
  }

  private applyFilters(
    results: SearchResult[],
    query: SearchQuery,
  ): SearchResult[] {
    let filtered = results;

    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((result) => {
        const doc = this.searchIndex.get(result.id)!;
        return query.tags!.some((tag) => doc.tags.includes(tag));
      });
    }

    if (query.filters) {
      filtered = filtered.filter((result) => {
        const doc = this.searchIndex.get(result.id)!;
        return Object.entries(query.filters!).every(([key, value]) => {
          return doc.metadata[key] === value;
        });
      });
    }

    return filtered;
  }

  private generateFacets(
    results: SearchResult[],
    requestedFacets: string[],
  ): { [facet: string]: FacetResult[] } {
    const facets: { [facet: string]: FacetResult[] } = {};

    for (const facetName of requestedFacets) {
      const facetCounts = new Map<string, number>();

      for (const result of results) {
        const doc = this.searchIndex.get(result.id)!;
        let value: string | undefined;

        switch (facetName) {
          case 'type':
            value = doc.type;
            break;
          case 'category':
            value = doc.category;
            break;
          case 'language':
            value = doc.language;
            break;
          default:
            value = doc.metadata[facetName];
        }

        if (value) {
          facetCounts.set(value, (facetCounts.get(value) || 0) + 1);
        }
      }

      facets[facetName] = Array.from(facetCounts.entries())
        .map(([value, count]) => ({ value, count, selected: false }))
        .sort((a, b) => b.count - a.count);
    }

    return facets;
  }

  private async generateSuggestions(
    query: string,
    language?: string,
  ): Promise<string[]> {
    // Implementation for query suggestions
    return [];
  }

  private async getQueryCorrection(
    query: string,
    language?: string,
  ): Promise<string | undefined> {
    // Implementation for spell correction
    return undefined;
  }

  private async personalizeResults(
    results: SearchResult[],
    userId: string,
  ): Promise<SearchResult[]> {
    const userProfile = this.userProfiles.get(userId);
    if (!userProfile) return results;

    // Apply personalization based on user profile
    return results
      .map((result) => {
        const doc = this.searchIndex.get(result.id)!;
        let personalizedScore = result.score;

        // Boost based on user preferences
        if (userProfile.preferredTypes.includes(doc.type)) {
          personalizedScore *= 1.2;
        }

        if (userProfile.preferredCategories.includes(doc.category)) {
          personalizedScore *= 1.1;
        }

        // Boost based on user history
        if (userProfile.clickedDocuments.includes(doc.id)) {
          personalizedScore *= 1.15;
        }

        return { ...result, score: personalizedScore };
      })
      .sort((a, b) => b.score - a.score);
  }

  private paginateResults(
    results: SearchResult[],
    page: number,
    limit: number,
  ): {
    results: SearchResult[];
    pagination: SearchResponse['pagination'];
  } {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);
    const totalPages = Math.ceil(results.length / limit);

    return {
      results: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  private generateSnippet(content: string, query: string): string {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const words = content.split(/\s+/);
    const windowSize =
      this.config.snippetWindowSize || this.defaults.snippetWindowSize;

    let bestSnippet = '';
    let bestScore = 0;

    for (let i = 0; i < words.length; i++) {
      const windowWords = words.slice(i, i + windowSize);
      const windowText = windowWords.join(' ');
      const matches = queryWords.reduce((score, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return score + (windowText.match(regex)?.length || 0);
      }, 0);

      const density = matches / Math.max(windowWords.length, 1);
      const windowScore = matches + density;

      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestSnippet = windowText;
      }
    }

    if (bestSnippet) return bestSnippet;

    return words.slice(0, windowSize).join(' ');
  }

  private generateHighlights(content: string, query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const highlights: string[] = [];

    for (const word of queryWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches);
      }
    }

    return [...new Set(highlights)]; // Remove duplicates
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify(query);
  }

  private setupAutoReindexing(): void {
    setInterval(() => {
      this.rebuildIndex();
    }, this.config.rebuildInterval);
  }

  private async loadUserProfiles(): Promise<void> {
    // Implementation would load user profiles from storage
  }

  private trackSearchQuery(query: SearchQuery, response: SearchResponse): void {
    this.emit('search_performed', {
      query: query.query,
      resultsCount: response.totalResults,
      queryTime: response.queryTime,
      userId: query.userId,
      sessionId: query.sessionId,
    });
  }

  private async applyStemming(text: string, language: string): Promise<string> {
    // Minimal stemming/lemmatization to improve recall without external deps
    if (language !== 'en') return text;

    return text
      .split(/\s+/)
      .map((word) =>
        word
          .replace(/(ing|ed|ly|es|s)$/i, '')
          .replace(/(ment|ness|tion)$/i, ''),
      )
      .join(' ');
  }

  private async generateAutoCompleteSuggestions(
    partialQuery: string,
    language?: string,
  ): Promise<string[]> {
    // Implementation for auto-complete suggestions
    return [];
  }

  private async generateCompletions(
    partialQuery: string,
    language?: string,
  ): Promise<
    Array<{
      text: string;
      type: 'query' | 'document' | 'category';
      score: number;
    }>
  > {
    return [];
  }

  private async getPopularQueries(language?: string): Promise<string[]> {
    return [];
  }

  private async getRelatedQueries(query: string): Promise<string[]> {
    return [];
  }

  private convertDocumentsToCSV(documents: SearchDocument[]): string {
    // CSV conversion implementation
    return '';
  }

  private detectQueryIntent(query: SearchQuery): QueryIntent {
    const normalized = query.query.toLowerCase();
    const actionKeywords = ['how to', 'deploy', 'configure', 'fix', 'install'];
    const navigationalKeywords = ['login', 'dashboard', 'api reference', 'home'];

    if (actionKeywords.some((kw) => normalized.includes(kw))) {
      return 'actionable';
    }

    if (navigationalKeywords.some((kw) => normalized.includes(kw))) {
      return 'navigational';
    }

    if (query.tags && query.tags.includes('investigation')) {
      return 'investigative';
    }

    return 'informational';
  }

  private getSemanticWeight(intent: QueryIntent): number {
    switch (intent) {
      case 'navigational':
        return 0.55;
      case 'actionable':
        return 0.68;
      case 'investigative':
        return 0.72;
      default:
        return 0.7;
    }
  }

  private computeRecencyBoost(lastModified: Date): number {
    const halfLifeDays =
      this.config.recencyHalfLifeDays || this.defaults.recencyHalfLifeDays;
    if (!lastModified) return 1;
    const daysSinceUpdate =
      (Date.now() - new Date(lastModified).getTime()) /
      (1000 * 60 * 60 * 24);

    if (Number.isNaN(daysSinceUpdate)) return 1;

    if (daysSinceUpdate <= 0) return 1.1;

    const decay = Math.exp((-Math.log(2) * daysSinceUpdate) / halfLifeDays);

    // Keep boost within a reasonable band
    return 0.85 + Math.min(decay, 0.4);
  }

  private rerankWithMMR(
    results: SearchResult[],
    queryEmbedding: number[],
    limit: number,
  ): SearchResult[] {
    if (!results.length) return results;

    const lambda = this.config.diversityLambda ?? this.defaults.diversityLambda;
    const selected: SearchResult[] = [];
    const candidates = [...results];

    // Seed with the highest scoring result
    selected.push(candidates.shift()!);

    while (candidates.length && selected.length < limit) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const candidateEmbedding = this.vectorIndex.get(candidate.id);

        const semanticScore = candidateEmbedding
          ? this.cosineSimilarity(queryEmbedding, candidateEmbedding)
          : candidate.score;

        const similarityToSelected = selected.reduce((max, chosen) => {
          const chosenEmbedding = this.vectorIndex.get(chosen.id);
          if (!chosenEmbedding || !candidateEmbedding) return max;
          return Math.max(
            max,
            this.cosineSimilarity(candidateEmbedding, chosenEmbedding),
          );
        }, 0);

        const mmrScore =
          lambda * (0.6 * candidate.score + 0.4 * semanticScore) -
          (1 - lambda) * similarityToSelected;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(candidates.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  private normalizeEmbedding(values: number[]): number[] {
    const magnitude = Math.sqrt(
      values.reduce((sum, value) => sum + value * value, 0),
    );
    if (magnitude === 0) return values;
    return values.map((value) => value / magnitude);
  }

  private mulberry32(seed: number): () => number {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private hashToSeed(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 1;
  }
}

// Supporting interfaces
interface UserSearchProfile {
  userId: string;
  preferredTypes: string[];
  preferredCategories: string[];
  preferredLanguages: string[];
  clickedDocuments: string[];
  searchHistory: string[];
  lastUpdated: Date;
}

interface SearchAnalytics {
  totalQueries: number;
  uniqueQueries: number;
  averageQueryTime: number;
  topQueries: Array<{ query: string; count: number }>;
  noResultQueries: string[];
  clickThroughRate: number;
  searchSuccessRate: number;
  queryRefinementRate: number;
  popularFilters: { [filter: string]: string[] };
  searchTrends: Array<{ date: Date; queries: number; avgTime: number }>;
}

type QueryIntent =
  | 'informational'
  | 'navigational'
  | 'investigative'
  | 'actionable';
