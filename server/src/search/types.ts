export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  searchType?: 'fulltext' | 'semantic' | 'hybrid' | 'fuzzy';
  boost?: BoostConfig;
  facets?: string[];
  highlight?: HighlightConfig;
}

export interface SearchFilters {
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  entityTypes?: string[];
  sources?: string[];
  tags?: string[];
  confidence?: {
    min?: number;
    max?: number;
  };
  custom?: Record<string, any>;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
  mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
}

export interface PaginationOptions {
  page: number;
  size: number;
  scroll?: string;
}

export interface BoostConfig {
  fields?: Record<string, number>;
  functions?: BoostFunction[];
}

export interface BoostFunction {
  type: 'field_value_factor' | 'decay' | 'script_score';
  field?: string;
  factor?: number;
  modifier?:
    | 'none'
    | 'log'
    | 'log1p'
    | 'log2p'
    | 'ln'
    | 'ln1p'
    | 'ln2p'
    | 'square'
    | 'sqrt'
    | 'reciprocal';
  missing?: number;
}

export interface HighlightConfig {
  fields: string[];
  fragmentSize?: number;
  numberOfFragments?: number;
  preTags?: string[];
  postTags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'entity' | 'case' | 'document' | 'comment' | 'event';
  score: number;
  source: any;
  highlight?: Record<string, string[]>;
  explanation?: SearchExplanation;
}

export interface SearchExplanation {
  value: number;
  description: string;
  details: SearchExplanation[];
}

export interface SearchResponse {
  query: SearchQuery;
  results: SearchResult[];
  total: {
    value: number;
    relation: 'eq' | 'gte';
  };
  took: number;
  timedOut: boolean;
  facets?: Record<string, FacetResult>;
  suggestions?: SearchSuggestion[];
  scrollId?: string;
}

export interface FacetResult {
  buckets: FacetBucket[];
  docCountErrorUpperBound: number;
  sumOtherDocCount: number;
}

export interface FacetBucket {
  key: string;
  docCount: number;
  subAggregations?: Record<string, FacetResult>;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  freq: number;
}

export interface SearchIndex {
  name: string;
  mappings: Record<string, any>;
  settings: Record<string, any>;
  aliases: string[];
  documentCount: number;
  sizeInBytes: number;
  status: 'green' | 'yellow' | 'red';
  createdAt: Date;
  updatedAt: Date;
}
