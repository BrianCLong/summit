import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Search algorithm extension point for custom search implementations
 */
export interface SearchExtension extends ExtensionPoint<SearchQuery, SearchResult> {
  type: 'search';
  name: string;
  description: string;
  supportedFeatures: SearchFeature[];
}

export type SearchFeature =
  | 'full-text'
  | 'fuzzy'
  | 'semantic'
  | 'vector'
  | 'faceted'
  | 'geo'
  | 'autocomplete'
  | 'highlighting';

export interface SearchQuery {
  query: string;
  filters?: SearchFilter[];
  facets?: string[];
  sort?: SortOption[];
  pagination?: {
    offset: number;
    limit: number;
  };
  options?: {
    fuzzyDistance?: number;
    semanticThreshold?: number;
    includeHighlights?: boolean;
    vectorSearch?: {
      field: string;
      vector: number[];
      k: number;
    };
  };
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'range';
  value: any;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  facets?: Record<string, FacetResult>;
  suggestions?: string[];
  metadata: {
    searchTimeMs: number;
    indexName: string;
  };
}

export interface SearchHit {
  id: string;
  score: number;
  source: Record<string, any>;
  highlights?: Record<string, string[]>;
}

export interface FacetResult {
  buckets: Array<{
    key: string;
    count: number;
  }>;
}

/**
 * Base class for search extensions
 */
export abstract class BaseSearchExtension implements SearchExtension {
  readonly type = 'search' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly supportedFeatures: SearchFeature[]
  ) {}

  abstract execute(query: SearchQuery): Promise<SearchResult>;

  /**
   * Index documents
   */
  abstract index(documents: IndexDocument[]): Promise<void>;

  /**
   * Delete documents
   */
  abstract delete(ids: string[]): Promise<void>;

  /**
   * Get index stats
   */
  abstract getStats(): Promise<IndexStats>;
}

export interface IndexDocument {
  id: string;
  content: Record<string, any>;
  vectors?: Record<string, number[]>;
}

export interface IndexStats {
  documentCount: number;
  indexSize: number;
  lastUpdated: Date;
}
