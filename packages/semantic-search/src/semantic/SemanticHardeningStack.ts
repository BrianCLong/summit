import { FilterOperator, SearchFilter, SearchRequest } from '@intelgraph/data-catalog';

export interface SemanticInnovation {
  id: string;
  name: string;
  summary: string;
  enabledByDefault: boolean;
}

export interface SemanticHardeningConfig {
  ontologyExpansions?: Record<string, string[]>;
  riskyPatterns?: RegExp[];
  maxEvidenceBudget?: number;
  allowListFacetFields?: string[];
  diversityFields?: string[];
}

export interface HardenedSearchRequest {
  request: SearchRequest;
  warnings: string[];
  confidence: number;
  evidenceBudget: number;
}

export class SemanticHardeningStack {
  private readonly innovations: SemanticInnovation[] = [
    {
      id: 'ssi-001',
      name: 'Intent-Locked Query Canonicalization',
      summary: 'Normalizes lexical variants into deterministic canonical intent signatures.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-002',
      name: 'Governed Prompt-Injection Sentinel',
      summary: 'Pre-query heuristic detector for prompt-injection and tool-abuse phrasing.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-003',
      name: 'Evidence-Budgeted Retrieval Envelope',
      summary: 'Bounds retrieval breadth by confidence-aware evidence budget controls.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-004',
      name: 'Ontology-Lifted Query Expansion',
      summary: 'Expands key terms to governed ontology aliases for higher semantic recall.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-005',
      name: 'Facet-Contract Enforcement',
      summary: 'Constrains filters to an approved allow-list to prevent semantic drift.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-006',
      name: 'Risk-Weighted Confidence Attenuation',
      summary: 'Reduces confidence score when adversarial patterns are detected.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-007',
      name: 'Deterministic Filter Canonical Ordering',
      summary: 'Sorts filters for stable cache keys and reproducible retrieval behavior.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-008',
      name: 'Semantic Diversity Railguard',
      summary: 'Injects multi-domain balancing hints to prevent mono-domain overfitting.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-009',
      name: 'Low-Entropy Query Guard',
      summary: 'Detects vague or low-information queries and requests semantic specificity.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-010',
      name: 'Governed Exception Trace Tags',
      summary: 'Tags constrained requests with auditable governance classification markers.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-011',
      name: 'Reciprocal Expansion Deduplicator',
      summary: 'Removes cyclical or duplicate expansions to preserve retrieval precision.',
      enabledByDefault: true,
    },
    {
      id: 'ssi-012',
      name: 'Search Surface Reduction Mode',
      summary: 'Auto-constrains facet count and limit under elevated risk conditions.',
      enabledByDefault: true,
    },
  ];

  constructor(private readonly config: SemanticHardeningConfig = {}) {}

  getInnovations(): SemanticInnovation[] {
    return this.innovations;
  }

  harden(request: SearchRequest): HardenedSearchRequest {
    const warnings: string[] = [];
    const canonicalQuery = this.canonicalizeQuery(request.query);
    let confidence = this.estimateConfidence(canonicalQuery);

    if (this.detectPromptInjection(canonicalQuery)) {
      warnings.push('Governed Exception: risky phrasing detected, search surface constrained.');
      confidence *= 0.7;
    }

    const expandedQuery = this.expandQuery(canonicalQuery);
    const filteredFilters = this.enforceFacetContracts(request.filters, warnings);
    const orderedFilters = this.canonicalizeFilterOrder(filteredFilters);
    const evidenceBudget = this.deriveEvidenceBudget(request.limit, confidence);
    const constrainedLimit = Math.min(request.limit, evidenceBudget);
    const constrainedFacets = this.constrainFacets(request.facets, warnings);

    if (this.isLowEntropyQuery(canonicalQuery)) {
      warnings.push('Query has low semantic entropy. Consider adding entity, domain, or timeframe.');
      confidence *= 0.85;
    }

    const requestWithDiversity = this.applyDiversityRailguard({
      ...request,
      query: expandedQuery,
      filters: orderedFilters,
      limit: constrainedLimit,
      facets: constrainedFacets,
    });

    return {
      request: requestWithDiversity,
      warnings,
      confidence: Number(confidence.toFixed(3)),
      evidenceBudget,
    };
  }

  private canonicalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private detectPromptInjection(query: string): boolean {
    const patterns = this.config.riskyPatterns ?? [
      /ignore\s+previous\s+instructions/i,
      /bypass\s+policy/i,
      /exfiltrate/i,
      /system\s+prompt/i,
    ];

    return patterns.some((pattern) => pattern.test(query));
  }

  private expandQuery(query: string): string {
    const expansions = this.config.ontologyExpansions ?? {};
    const tokens = query.split(' ');
    const expandedTokens = new Set<string>(tokens);

    for (const token of tokens) {
      const synonyms = expansions[token] ?? [];
      for (const synonym of synonyms) {
        expandedTokens.add(synonym.toLowerCase());
      }
    }

    return Array.from(expandedTokens).join(' ');
  }

  private enforceFacetContracts(filters: SearchFilter[], warnings: string[]): SearchFilter[] {
    const allowList = this.config.allowListFacetFields;
    if (!allowList || allowList.length === 0) {
      return filters;
    }

    const approved = new Set(allowList);
    const acceptedFilters = filters.filter((filter) => approved.has(filter.field));

    if (acceptedFilters.length !== filters.length) {
      warnings.push('Governed Exception: unapproved filter fields were removed.');
    }

    return acceptedFilters;
  }

  private canonicalizeFilterOrder(filters: SearchFilter[]): SearchFilter[] {
    return [...filters].sort((a, b) => {
      const fieldOrder = a.field.localeCompare(b.field);
      if (fieldOrder !== 0) {
        return fieldOrder;
      }

      const opOrder = a.operator.localeCompare(b.operator);
      if (opOrder !== 0) {
        return opOrder;
      }

      return JSON.stringify(a.value).localeCompare(JSON.stringify(b.value));
    });
  }

  private deriveEvidenceBudget(limit: number, confidence: number): number {
    const configuredMax = this.config.maxEvidenceBudget ?? 50;
    const confidenceWeight = Math.max(0.4, Math.min(1, confidence));
    return Math.max(5, Math.min(Math.round(limit * confidenceWeight), configuredMax));
  }

  private constrainFacets(facets: string[], warnings: string[]): string[] {
    if (facets.length <= 6) {
      return facets;
    }

    warnings.push('Search surface reduction mode applied to facets.');
    return facets.slice(0, 6);
  }

  private isLowEntropyQuery(query: string): boolean {
    const uniqueTokens = new Set(query.split(' ').filter((token) => token.length > 1));
    return uniqueTokens.size < 2;
  }

  private applyDiversityRailguard(request: SearchRequest): SearchRequest {
    const diversityFields = this.config.diversityFields ?? [];
    if (diversityFields.length === 0) {
      return request;
    }

    const diversityFilters: SearchFilter[] = diversityFields.map((field) => ({
      field,
      operator: FilterOperator.NOT_EQUALS,
      value: 'UNKNOWN',
    }));

    return {
      ...request,
      filters: [...request.filters, ...diversityFilters],
    };
  }

  private estimateConfidence(query: string): number {
    const tokenCount = query.split(' ').filter((token) => token.length > 0).length;
    if (tokenCount >= 6) {
      return 0.95;
    }
    if (tokenCount >= 3) {
      return 0.82;
    }
    return 0.66;
  }
}
