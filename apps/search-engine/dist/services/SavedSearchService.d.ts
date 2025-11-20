import { SavedSearch, SearchQuery, SearchTemplate } from '../types';
export declare class SavedSearchService {
    private db;
    private logger;
    constructor();
    createSavedSearch(name: string, description: string | undefined, query: SearchQuery, userId: string, isPublic?: boolean, tags?: string[]): Promise<SavedSearch>;
    getSavedSearch(id: string, userId: string): Promise<SavedSearch | null>;
    updateSavedSearch(id: string, updates: Partial<Pick<SavedSearch, 'name' | 'description' | 'query' | 'tags' | 'isPublic'>>, userId: string): Promise<SavedSearch | null>;
    deleteSavedSearch(id: string, userId: string): Promise<boolean>;
    listSavedSearches(userId: string, options?: {
        includePublic?: boolean;
        tags?: string[];
        limit?: number;
        offset?: number;
    }): Promise<{
        searches: SavedSearch[];
        total: number;
    }>;
    executeSavedSearch(id: string, userId: string): Promise<SavedSearch | null>;
    createSearchTemplate(name: string, description: string | undefined, template: string, params: Record<string, any>, userId: string, category: string, isPublic?: boolean): Promise<SearchTemplate>;
    getSearchTemplate(id: string, userId: string): Promise<SearchTemplate | null>;
    listSearchTemplates(userId: string, options?: {
        category?: string;
        includePublic?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        templates: SearchTemplate[];
        total: number;
    }>;
    renderTemplate(templateId: string, params: Record<string, any>, userId: string): Promise<string>;
    private mapRowToSavedSearch;
    private mapRowToSearchTemplate;
    getPopularSearches(userId: string, limit?: number): Promise<SavedSearch[]>;
    getRecentSearches(userId: string, limit?: number): Promise<SavedSearch[]>;
    searchSavedSearches(userId: string, searchTerm: string): Promise<SavedSearch[]>;
}
