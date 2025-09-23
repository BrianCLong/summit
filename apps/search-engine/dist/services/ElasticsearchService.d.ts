import { SearchQuery, SearchResponse, SearchIndex } from '../types';
export declare class ElasticsearchService {
    private client;
    private logger;
    constructor();
    search(query: SearchQuery): Promise<SearchResponse>;
    private buildElasticsearchQuery;
    private buildQueryClause;
    private buildFullTextQuery;
    private buildSemanticQuery;
    private buildFuzzyQuery;
    private buildAggregations;
    private getSearchIndices;
    private transformHits;
    private transformAggregations;
    private transformSuggestions;
    private getQueryEmbedding;
    createIndex(index: SearchIndex): Promise<void>;
    deleteIndex(indexName: string): Promise<void>;
    indexDocument(indexName: string, id: string, document: any): Promise<void>;
    bulkIndex(operations: any[]): Promise<void>;
    getIndexStats(): Promise<Record<string, any>>;
    healthCheck(): Promise<{
        status: string;
        details: any;
    }>;
}
//# sourceMappingURL=ElasticsearchService.d.ts.map