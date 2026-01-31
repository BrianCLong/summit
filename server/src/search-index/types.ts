export interface SearchableItem {
  id: string;
  type: 'Entity' | 'Claim' | 'Evidence';
  caseId?: string; // Corresponds to context.caseId or similar
  content: string; // The full text to index
  tags?: string[];
  source?: string;
  createdAt: string;
  originalObject: unknown;
}

export interface SearchQuery {
  caseId: string;
  q: string;
  filters?: {
    type?: string[];
    timeRange?: { start?: string; end?: string };
    tags?: string[];
    source?: string[];
  };
  limit?: number;
  cursor?: number;
}

export interface SearchResult {
  objectRef: {
    id: string;
    type: string;
  };
  score: number;
  snippet?: string;
  matchedFields?: string[];
  item: SearchableItem;
}
