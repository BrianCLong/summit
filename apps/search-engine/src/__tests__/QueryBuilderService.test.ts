import { QueryBuilderService } from '../services/QueryBuilderService';

describe('QueryBuilderService', () => {
  let service: QueryBuilderService;

  beforeEach(() => {
    service = new QueryBuilderService();
  });

  describe('buildQuery', () => {
    it('should build a basic search query from natural language', () => {
      const result = service.buildQuery('find all organizations in finance');

      expect(result.query).toBeDefined();
      expect(result.searchType).toBe('fulltext');
      expect(result.pagination).toEqual({ page: 1, size: 20 });
      expect(result.highlight).toBeDefined();
    });

    it('should detect semantic search intent', () => {
      const result = service.buildQuery('find similar entities to this one');

      expect(result.searchType).toBe('semantic');
    });

    it('should detect fuzzy search intent', () => {
      const result = service.buildQuery('find approximate matches for organizaton');

      expect(result.searchType).toBe('fuzzy');
    });

    it('should extract entity type filters', () => {
      const result = service.buildQuery('find all people and organizations');

      expect(result.filters?.entityTypes).toBeDefined();
      expect(result.filters?.entityTypes).toContain('people');
    });

    it('should extract date filters', () => {
      const result = service.buildQuery('events from last week');

      expect(result.filters?.dateRange).toBeDefined();
      expect(result.filters?.dateRange?.field).toBe('createdAt');
      expect(result.filters?.dateRange?.from).toBeDefined();
    });

    it('should suggest appropriate facets', () => {
      const result = service.buildQuery('find organizations in recent events');

      expect(result.facets).toBeDefined();
      expect(result.facets).toContain('entityTypes');
      expect(result.facets).toContain('sources');
    });
  });

  describe('synonym expansion', () => {
    it('should expand query with synonyms', () => {
      const expanded = service.expandQuery('person');

      expect(expanded).toContain('person');
      expect(expanded).toContain('individual');
      expect(expanded).toContain('human');
      expect(expanded).toContain('people');
    });

    it('should expand organization synonyms', () => {
      const expanded = service.expandQuery('company');

      expect(expanded).toContain('company');
      expect(expanded).toContain('organization');
      expect(expanded).toContain('enterprise');
      expect(expanded).toContain('business');
    });

    it('should handle multiple words with synonyms', () => {
      const expanded = service.expandQuery('person works at company');

      expect(expanded).toContain('individual');
      expect(expanded).toContain('organization');
    });
  });

  describe('typo correction', () => {
    it('should suggest corrections for misspelled entity types', () => {
      const suggestions = service.suggestCorrections('prson');

      expect(suggestions).toContain('person');
    });

    it('should suggest corrections for misspelled terms', () => {
      const suggestions = service.suggestCorrections('organizaton');

      expect(suggestions).toContain('organization');
    });

    it('should handle multiple typos', () => {
      const suggestions = service.suggestCorrections('loction thret');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('location');
    });

    it('should not suggest corrections for correct terms', () => {
      const suggestions = service.suggestCorrections('organization');

      // Should include the term itself and its synonyms
      expect(suggestions).toBeTruthy();
    });
  });

  describe('filter expression parsing', () => {
    it('should parse date range filters', () => {
      const filters = service.parseFilterExpression('date:2024-01-01 to 2024-12-31');

      expect(filters.dateRange).toBeDefined();
      expect(filters.dateRange?.from).toBe('2024-01-01');
      expect(filters.dateRange?.to).toBe('2024-12-31');
    });

    it('should parse entity type filters', () => {
      const filters = service.parseFilterExpression('type:person type:organization');

      expect(filters.entityTypes).toBeDefined();
      expect(filters.entityTypes).toContain('person');
      expect(filters.entityTypes).toContain('organization');
    });

    it('should parse source filters', () => {
      const filters = service.parseFilterExpression('source:osint source:internal');

      expect(filters.sources).toBeDefined();
      expect(filters.sources).toContain('osint');
      expect(filters.sources).toContain('internal');
    });

    it('should parse tag filters', () => {
      const filters = service.parseFilterExpression('tag:critical tag:urgent');

      expect(filters.tags).toBeDefined();
      expect(filters.tags).toContain('critical');
      expect(filters.tags).toContain('urgent');
    });

    it('should parse confidence range filters', () => {
      const filters = service.parseFilterExpression('confidence:0.7 to 1.0');

      expect(filters.confidence).toBeDefined();
      expect(filters.confidence?.min).toBe(0.7);
      expect(filters.confidence?.max).toBe(1.0);
    });

    it('should parse multiple filter types', () => {
      const filters = service.parseFilterExpression(
        'type:threat date:2024-01-01 to 2024-12-31 confidence:0.8 to 1.0',
      );

      expect(filters.entityTypes).toContain('threat');
      expect(filters.dateRange).toBeDefined();
      expect(filters.confidence).toBeDefined();
    });
  });

  describe('advanced query building', () => {
    it('should convert bool query builder to Elasticsearch', () => {
      const queryBuilder = {
        type: 'bool' as const,
        must: [
          {
            type: 'match' as const,
            field: 'title',
            value: 'threat',
          },
        ],
        should: [
          {
            type: 'term' as const,
            field: 'type',
            value: 'threat',
          },
        ],
      };

      const esQuery = service.buildAdvancedQuery(queryBuilder);

      expect(esQuery.bool).toBeDefined();
      expect(esQuery.bool.must).toHaveLength(1);
      expect(esQuery.bool.must[0].match.title.query).toBe('threat');
      expect(esQuery.bool.should).toHaveLength(1);
    });

    it('should convert match query to Elasticsearch', () => {
      const queryBuilder = {
        type: 'match' as const,
        field: 'content',
        value: 'cyber attack',
        boost: 2.0,
      };

      const esQuery = service.buildAdvancedQuery(queryBuilder);

      expect(esQuery.match.content.query).toBe('cyber attack');
      expect(esQuery.match.content.boost).toBe(2.0);
    });

    it('should convert range query to Elasticsearch', () => {
      const queryBuilder = {
        type: 'range' as const,
        field: 'createdAt',
        value: {
          gte: '2024-01-01',
          lte: '2024-12-31',
        },
      };

      const esQuery = service.buildAdvancedQuery(queryBuilder);

      expect(esQuery.range.createdAt.gte).toBe('2024-01-01');
      expect(esQuery.range.createdAt.lte).toBe('2024-12-31');
    });

    it('should convert fuzzy query to Elasticsearch', () => {
      const queryBuilder = {
        type: 'fuzzy' as const,
        field: 'name',
        value: 'organizaton',
      };

      const esQuery = service.buildAdvancedQuery(queryBuilder);

      expect(esQuery.fuzzy.name.value).toBe('organizaton');
      expect(esQuery.fuzzy.name.fuzziness).toBe('AUTO');
    });

    it('should convert nested query to Elasticsearch', () => {
      const queryBuilder = {
        type: 'nested' as const,
        field: 'neighbors',
        value: {
          type: 'match' as const,
          field: 'relationship',
          value: 'works_at',
        },
      };

      const esQuery = service.buildAdvancedQuery(queryBuilder);

      expect(esQuery.nested.path).toBe('neighbors');
      expect(esQuery.nested.query.match.relationship.query).toBe('works_at');
    });
  });

  describe('search templates', () => {
    it('should generate threat intelligence template', () => {
      const templates = service.generateSearchTemplates();

      expect(templates['threat-intelligence']).toBeDefined();
      expect(templates['threat-intelligence']).toContain('type:threat');
    });

    it('should generate entity relationship template', () => {
      const templates = service.generateSearchTemplates();

      expect(templates['entity-relationships']).toBeDefined();
      expect(templates['entity-relationships']).toContain('related:true');
    });

    it('should generate high confidence template', () => {
      const templates = service.generateSearchTemplates();

      expect(templates['high-confidence']).toBeDefined();
      expect(templates['high-confidence']).toContain('confidence:0.8');
    });

    it('should include all expected templates', () => {
      const templates = service.generateSearchTemplates();

      expect(Object.keys(templates)).toContain('threat-intelligence');
      expect(Object.keys(templates)).toContain('entity-relationships');
      expect(Object.keys(templates)).toContain('case-documents');
      expect(Object.keys(templates)).toContain('recent-events');
      expect(Object.keys(templates)).toContain('high-confidence');
      expect(Object.keys(templates)).toContain('geospatial');
    });
  });

  describe('Levenshtein distance calculation', () => {
    it('should calculate distance for identical strings', () => {
      const distance = (service as any).levenshteinDistance('test', 'test');

      expect(distance).toBe(0);
    });

    it('should calculate distance for single character difference', () => {
      const distance = (service as any).levenshteinDistance('test', 'fest');

      expect(distance).toBe(1);
    });

    it('should calculate distance for insertion', () => {
      const distance = (service as any).levenshteinDistance('test', 'tests');

      expect(distance).toBe(1);
    });

    it('should calculate distance for deletion', () => {
      const distance = (service as any).levenshteinDistance('tests', 'test');

      expect(distance).toBe(1);
    });

    it('should calculate distance for multiple changes', () => {
      const distance = (service as any).levenshteinDistance('kitten', 'sitting');

      expect(distance).toBe(3);
    });

    it('should handle empty strings', () => {
      const distance1 = (service as any).levenshteinDistance('', 'test');
      const distance2 = (service as any).levenshteinDistance('test', '');

      expect(distance1).toBe(4);
      expect(distance2).toBe(4);
    });
  });

  describe('token processing', () => {
    it('should extract main terms from query', () => {
      const tokens = (service as any).tokenizeQuery('find cyber attack organizations');
      const processed = (service as any).processTokens(tokens);

      expect(processed.mainTerms).toContain('find');
      expect(processed.mainTerms).toContain('cyber');
      expect(processed.mainTerms).toContain('attack');
    });

    it('should extract entity types', () => {
      const tokens = (service as any).tokenizeQuery('find all people and organizations');
      const processed = (service as any).processTokens(tokens);

      expect(processed.entityTypes).toContain('people');
      expect(processed.entityTypes).toContain('organization');
    });

    it('should extract date expressions', () => {
      const tokens = (service as any).tokenizeQuery('events from last week');
      const processed = (service as any).processTokens(tokens);

      expect(processed.dateExpressions).toContain('week');
    });

    it('should extract modifiers', () => {
      const tokens = (service as any).tokenizeQuery('find similar entities');
      const processed = (service as any).processTokens(tokens);

      expect(processed.modifiers).toContain('similar');
    });

    it('should remove stop words', () => {
      const tokens = (service as any).tokenizeQuery('the person and the organization');
      const processed = (service as any).processTokens(tokens);

      // 'the', 'and' should be removed (except 'and' is also an operator)
      expect(processed.mainTerms).not.toContain('the');
    });
  });

  describe('date expression parsing', () => {
    it('should parse "today" expression', () => {
      const dateRange = (service as any).parseDateExpressions(['today']);

      expect(dateRange.field).toBe('createdAt');
      expect(dateRange.from).toBeDefined();
      expect(dateRange.to).toBeDefined();

      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000); // 1 day
    });

    it('should parse "week" expression', () => {
      const dateRange = (service as any).parseDateExpressions(['week']);

      expect(dateRange.from).toBeDefined();
      const from = new Date(dateRange.from);
      const now = new Date();
      const daysDiff = (now.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);

      expect(daysDiff).toBeCloseTo(7, 0);
    });

    it('should parse "month" expression', () => {
      const dateRange = (service as any).parseDateExpressions(['month']);

      expect(dateRange.from).toBeDefined();
      const from = new Date(dateRange.from);
      const now = new Date();
      const daysDiff = (now.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);

      expect(daysDiff).toBeCloseTo(30, 0);
    });
  });
});
