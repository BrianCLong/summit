import { SearchFilters, QueryBuilder, SearchQuery } from '../types';
export declare class QueryBuilderService {
    private synonyms;
    private fieldMappings;
    constructor();
    private initializeSynonyms;
    private initializeFieldMappings;
    buildQuery(naturalLanguageQuery: string): SearchQuery;
    private analyzeQuery;
    private tokenizeQuery;
    private processTokens;
    private determineSearchType;
    private extractFilters;
    private parseDateExpressions;
    private extractSortCriteria;
    private suggestFacets;
    buildAdvancedQuery(queryBuilder: QueryBuilder): any;
    private convertQueryBuilderToElastic;
    expandQuery(query: string): string;
    suggestCorrections(query: string): string[];
    private levenshteinDistance;
    parseFilterExpression(expression: string): SearchFilters;
    generateSearchTemplates(): Record<string, string>;
}
