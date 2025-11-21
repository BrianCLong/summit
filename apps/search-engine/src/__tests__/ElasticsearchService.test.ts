import { ElasticsearchService } from '../services/ElasticsearchService';
import { SearchQuery } from '../types';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;

  beforeAll(() => {
    service = new ElasticsearchService();
  });

  describe('buildFullTextQuery', () => {
    it('should build a multi-match query with proper boosting', () => {
      const query: SearchQuery = {
        query: 'threat intelligence',
        searchType: 'fulltext',
        pagination: { page: 1, size: 20 },
      };

      // Access private method for testing (via any cast)
      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.must).toHaveLength(1);
      expect(result.bool.must[0]).toHaveProperty('multi_match');
      expect(result.bool.must[0].multi_match.query).toBe('threat intelligence');
      expect(result.bool.must[0].multi_match.fuzziness).toBe('AUTO');
    });
  });

  describe('buildElasticsearchQuery', () => {
    it('should include pagination parameters', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        pagination: { page: 2, size: 50 },
      };

      const buildElasticsearchQuery = (service as any).buildElasticsearchQuery.bind(service);
      const result = buildElasticsearchQuery(query);

      expect(result.size).toBe(50);
      expect(result.from).toBe(50); // page 2, size 50 = offset 50
    });

    it('should include sorting', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        sort: {
          field: 'createdAt',
          order: 'desc',
        },
        pagination: { page: 1, size: 20 },
      };

      const buildElasticsearchQuery = (service as any).buildElasticsearchQuery.bind(service);
      const result = buildElasticsearchQuery(query);

      expect(result.sort).toHaveLength(1);
      expect(result.sort[0].createdAt.order).toBe('desc');
    });

    it('should include highlighting configuration', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        highlight: {
          fields: ['title', 'content'],
          fragmentSize: 200,
          numberOfFragments: 5,
          preTags: ['<mark>'],
          postTags: ['</mark>'],
        },
        pagination: { page: 1, size: 20 },
      };

      const buildElasticsearchQuery = (service as any).buildElasticsearchQuery.bind(service);
      const result = buildElasticsearchQuery(query);

      expect(result.highlight).toBeDefined();
      expect(result.highlight.fields.title).toBeDefined();
      expect(result.highlight.fields.title.fragment_size).toBe(200);
      expect(result.highlight.fields.title.pre_tags).toEqual(['<mark>']);
    });

    it('should include facet aggregations', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        facets: ['entityTypes', 'sources', 'tags'],
        pagination: { page: 1, size: 20 },
      };

      const buildElasticsearchQuery = (service as any).buildElasticsearchQuery.bind(service);
      const result = buildElasticsearchQuery(query);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.entityTypes).toBeDefined();
      expect(result.aggs.sources).toBeDefined();
      expect(result.aggs.tags).toBeDefined();
    });
  });

  describe('filter handling', () => {
    it('should apply entity type filters', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        filters: {
          entityTypes: ['person', 'organization'],
        },
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.filter).toHaveLength(1);
      expect(result.bool.filter[0].terms['entityType.keyword']).toEqual([
        'person',
        'organization',
      ]);
    });

    it('should apply date range filters', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        filters: {
          dateRange: {
            field: 'createdAt',
            from: '2024-01-01',
            to: '2024-12-31',
          },
        },
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.filter).toHaveLength(1);
      expect(result.bool.filter[0].range.createdAt).toEqual({
        gte: '2024-01-01',
        lte: '2024-12-31',
      });
    });

    it('should apply confidence range filters', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        filters: {
          confidence: {
            min: 0.7,
            max: 1.0,
          },
        },
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.filter).toHaveLength(1);
      expect(result.bool.filter[0].range.confidence).toEqual({
        gte: 0.7,
        lte: 1.0,
      });
    });
  });

  describe('search type determination', () => {
    it('should use fulltext search by default', () => {
      const query: SearchQuery = {
        query: 'test',
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.must[0]).toHaveProperty('multi_match');
    });

    it('should use fuzzy search when specified', () => {
      const query: SearchQuery = {
        query: 'organizaton',
        searchType: 'fuzzy',
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.must[0].bool).toBeDefined();
      expect(result.bool.must[0].bool.should[0].fuzzy).toBeDefined();
    });

    it('should use hybrid search when specified', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'hybrid',
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.bool.should).toHaveLength(2);
      expect(result.bool.minimum_should_match).toBe(1);
    });
  });

  describe('boost configuration', () => {
    it('should apply function score boosting', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        boost: {
          functions: [
            {
              type: 'field_value_factor',
              field: 'graphScore',
              factor: 1.5,
              modifier: 'log1p',
            },
          ],
        },
        pagination: { page: 1, size: 20 },
      };

      const buildQueryClause = (service as any).buildQueryClause.bind(service);
      const result = buildQueryClause(query);

      expect(result.function_score).toBeDefined();
      expect(result.function_score.functions).toHaveLength(1);
      expect(result.function_score.functions[0].field_value_factor.field).toBe('graphScore');
      expect(result.function_score.functions[0].field_value_factor.factor).toBe(1.5);
    });
  });

  describe('index selection', () => {
    it('should search across all indices by default', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        pagination: { page: 1, size: 20 },
      };

      const getSearchIndices = (service as any).getSearchIndices.bind(service);
      const indices = getSearchIndices(query);

      expect(indices).toContain('entities');
      expect(indices).toContain('cases');
      expect(indices).toContain('documents');
    });

    it('should filter indices based on entity types', () => {
      const query: SearchQuery = {
        query: 'test',
        searchType: 'fulltext',
        filters: {
          entityTypes: ['person'],
        },
        pagination: { page: 1, size: 20 },
      };

      const getSearchIndices = (service as any).getSearchIndices.bind(service);
      const indices = getSearchIndices(query);

      expect(indices).toEqual(['persons']);
    });
  });

  describe('result transformation', () => {
    it('should transform hits to search results', () => {
      const hits = [
        {
          _id: 'entity_1',
          _index: 'entities',
          _score: 1.5,
          _source: {
            title: 'Test Entity',
            content: 'Test content',
          },
          highlight: {
            title: ['<mark>Test</mark> Entity'],
          },
        },
        {
          _id: 'entity_2',
          _index: 'cases',
          _score: 1.2,
          _source: {
            caseNumber: 'CASE-001',
            title: 'Test Case',
          },
        },
      ];

      const transformHits = (service as any).transformHits.bind(service);
      const results = transformHits(hits);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('entity_1');
      expect(results[0].type).toBe('entity');
      expect(results[0].score).toBe(1.5);
      expect(results[0].source.title).toBe('Test Entity');
      expect(results[0].highlight).toEqual({ title: ['<mark>Test</mark> Entity'] });
      expect(results[1].id).toBe('entity_2');
      expect(results[1].type).toBe('case');
    });
  });

  describe('aggregation transformation', () => {
    it('should transform Elasticsearch aggregations to facets', () => {
      const aggs = {
        entityTypes: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            { key: 'person', doc_count: 42 },
            { key: 'organization', doc_count: 38 },
          ],
        },
        sources: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 5,
          buckets: [
            { key: 'osint', doc_count: 50 },
            { key: 'internal', doc_count: 30 },
          ],
        },
      };

      const transformAggregations = (service as any).transformAggregations.bind(service);
      const facets = transformAggregations(aggs);

      expect(facets.entityTypes).toBeDefined();
      expect(facets.entityTypes.buckets).toHaveLength(2);
      expect(facets.entityTypes.buckets[0].key).toBe('person');
      expect(facets.entityTypes.buckets[0].docCount).toBe(42);
      expect(facets.sources.sumOtherDocCount).toBe(5);
    });
  });
});
