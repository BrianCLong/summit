import { EventEmitter } from 'events';
import { RedisCache } from '../cache/redis';
export class AdvancedSearchService extends EventEmitter {
    constructor() {
        super();
        this.searchHistory = new Map();
        this.savedSearches = new Map();
        this.searchIndices = new Map();
        this.searchSuggestions = new Map();
        this.popularQueries = [];
        this.cache = new RedisCache();
        this.initializeSearchIndices();
        this.buildSearchSuggestions();
    }
    initializeSearchIndices() {
        const indices = [
            {
                name: 'entities',
                fields: [
                    {
                        name: 'id',
                        type: 'keyword',
                        searchable: false,
                        facetable: false,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'name',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: true,
                        weight: 10,
                    },
                    {
                        name: 'type',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 5,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: false,
                        weight: 3,
                    },
                    {
                        name: 'tags',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: false,
                        weight: 2,
                    },
                    {
                        name: 'created_at',
                        type: 'date',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'confidence',
                        type: 'number',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'location',
                        type: 'geo_point',
                        searchable: false,
                        facetable: false,
                        sortable: false,
                        weight: 1,
                    },
                ],
                totalDocuments: 15432,
                lastUpdated: new Date(),
            },
            {
                name: 'investigations',
                fields: [
                    {
                        name: 'id',
                        type: 'keyword',
                        searchable: false,
                        facetable: false,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'title',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: true,
                        weight: 10,
                    },
                    {
                        name: 'status',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 5,
                    },
                    {
                        name: 'priority',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 3,
                    },
                    {
                        name: 'assigned_to',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 2,
                    },
                    {
                        name: 'tags',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: false,
                        weight: 2,
                    },
                    {
                        name: 'created_at',
                        type: 'date',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'updated_at',
                        type: 'date',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                ],
                totalDocuments: 3421,
                lastUpdated: new Date(),
            },
            {
                name: 'evidence',
                fields: [
                    {
                        name: 'id',
                        type: 'keyword',
                        searchable: false,
                        facetable: false,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'title',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: true,
                        weight: 8,
                    },
                    {
                        name: 'content',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: false,
                        weight: 5,
                    },
                    {
                        name: 'type',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 3,
                    },
                    {
                        name: 'source',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 2,
                    },
                    {
                        name: 'hash',
                        type: 'keyword',
                        searchable: true,
                        facetable: false,
                        sortable: false,
                        weight: 1,
                    },
                    {
                        name: 'created_at',
                        type: 'date',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                ],
                totalDocuments: 8765,
                lastUpdated: new Date(),
            },
            {
                name: 'threats',
                fields: [
                    {
                        name: 'id',
                        type: 'keyword',
                        searchable: false,
                        facetable: false,
                        sortable: true,
                        weight: 1,
                    },
                    {
                        name: 'name',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: true,
                        weight: 10,
                    },
                    {
                        name: 'type',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 5,
                    },
                    {
                        name: 'severity',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 8,
                    },
                    {
                        name: 'status',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: true,
                        weight: 3,
                    },
                    {
                        name: 'mitre_tactics',
                        type: 'keyword',
                        searchable: true,
                        facetable: true,
                        sortable: false,
                        weight: 4,
                    },
                    {
                        name: 'indicators',
                        type: 'text',
                        searchable: true,
                        facetable: false,
                        sortable: false,
                        weight: 6,
                    },
                    {
                        name: 'first_seen',
                        type: 'date',
                        searchable: false,
                        facetable: true,
                        sortable: true,
                        weight: 1,
                    },
                ],
                totalDocuments: 12098,
                lastUpdated: new Date(),
            },
        ];
        indices.forEach((index) => {
            this.searchIndices.set(index.name, index);
        });
        console.log('[SEARCH] Initialized search indices:', indices.length);
    }
    buildSearchSuggestions() {
        const suggestions = new Map([
            [
                'entities',
                [
                    'type:person AND confidence:>0.8',
                    'type:organization AND location:exists',
                    'created_at:>2023-01-01 AND tags:suspicious',
                    'name:"John Doe" OR description:contains:suspicious',
                ],
            ],
            [
                'investigations',
                [
                    'status:active AND priority:high',
                    'assigned_to:current_user AND status:in_progress',
                    'created_at:last_30_days AND tags:cybersecurity',
                    'title:contains:breach AND status:!=closed',
                ],
            ],
            [
                'threats',
                [
                    'severity:critical AND status:active',
                    'mitre_tactics:persistence OR mitre_tactics:privilege_escalation',
                    'first_seen:last_7_days AND type:malware',
                    'indicators:contains:domain.com AND severity:>=medium',
                ],
            ],
        ]);
        this.searchSuggestions = suggestions;
    }
    async search(queryData) {
        const startTime = Date.now();
        const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const query = {
            ...queryData,
            id: queryId,
            createdAt: new Date(),
        };
        try {
            // Add to search history
            if (!this.searchHistory.has(query.createdBy)) {
                this.searchHistory.set(query.createdBy, []);
            }
            const userHistory = this.searchHistory.get(query.createdBy);
            userHistory.unshift(query);
            if (userHistory.length > 100) {
                userHistory.splice(100);
            }
            // Execute search based on type
            let results = [];
            const aggregations = {};
            let facets = [];
            switch (query.type) {
                case 'simple':
                    results = await this.executeSimpleSearch(query);
                    break;
                case 'advanced':
                    results = await this.executeAdvancedSearch(query);
                    break;
                case 'semantic':
                    results = await this.executeSemanticSearch(query);
                    break;
                case 'graph':
                    results = await this.executeGraphSearch(query);
                    break;
                case 'temporal':
                    results = await this.executeTemporalSearch(query);
                    break;
                case 'geospatial':
                    results = await this.executeGeospatialSearch(query);
                    break;
            }
            // Apply filters
            results = this.applyFilters(results, query.filters);
            // Apply sorting
            results = this.applySorting(results, query.sort);
            // Generate facets
            facets = this.generateFacets(results, query);
            // Apply pagination
            const totalResults = results.length;
            const startIndex = (query.pagination.page - 1) * query.pagination.limit;
            const endIndex = startIndex + query.pagination.limit;
            results = results.slice(startIndex, endIndex);
            // Generate suggestions
            const suggestions = this.generateSearchSuggestions(query.query);
            const executionTime = Date.now() - startTime;
            query.executionTime = executionTime;
            // Update popularity tracking
            this.updatePopularQueries(query.query);
            // Cache results
            await this.cache.set(`search:${queryId}`, JSON.stringify({
                query,
                totalResults,
                results: results.slice(0, 50), // Cache first 50 results
            }), 3600);
            const response = {
                queryId,
                totalResults,
                results,
                aggregations,
                facets,
                suggestions,
                executionTime,
                hasMore: endIndex < totalResults,
            };
            this.emit('search-executed', { query, response });
            return response;
        }
        catch (error) {
            console.error('[SEARCH] Search execution error:', error);
            throw error;
        }
    }
    async executeSimpleSearch(query) {
        // Mock simple search - would integrate with actual search engine
        const mockResults = [];
        const terms = query.query.toLowerCase().split(' ');
        // Generate mock results based on query terms
        for (let i = 0; i < Math.min(200, Math.random() * 300 + 50); i++) {
            const types = ['entity', 'investigation', 'evidence', 'threat', 'document'];
            const type = types[Math.floor(Math.random() * types.length)];
            mockResults.push({
                id: `${type}_${i}`,
                type,
                score: Math.random() * 10,
                source: 'mock_index',
                data: this.generateMockData(type, terms),
                highlights: this.generateHighlights(terms),
                metadata: {
                    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 30),
                    relevanceScore: Math.random() * 10,
                    matchingFields: this.getMatchingFields(terms),
                    context: {
                        searchTerms: terms,
                        matchType: 'simple',
                    },
                },
            });
        }
        return mockResults.sort((a, b) => b.score - a.score);
    }
    async executeAdvancedSearch(query) {
        // Parse advanced query syntax (field:value, operators, etc.)
        const parsedQuery = this.parseAdvancedQuery(query.query);
        // Mock advanced search results
        const mockResults = [];
        for (let i = 0; i < Math.min(150, Math.random() * 200 + 30); i++) {
            mockResults.push({
                id: `advanced_${i}`,
                type: this.getTypeFromQuery(parsedQuery),
                score: Math.random() * 10 + 5, // Advanced search generally more relevant
                source: 'advanced_index',
                data: this.generateAdvancedMockData(parsedQuery),
                highlights: this.generateAdvancedHighlights(parsedQuery),
                metadata: {
                    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 7),
                    relevanceScore: Math.random() * 10 + 5,
                    matchingFields: Object.keys(parsedQuery),
                    context: {
                        queryType: 'advanced',
                        parsedFields: parsedQuery,
                    },
                },
            });
        }
        return mockResults.sort((a, b) => b.score - a.score);
    }
    async executeSemanticSearch(query) {
        // Mock semantic search using vector similarity
        const mockResults = [];
        for (let i = 0; i < Math.min(100, Math.random() * 150 + 20); i++) {
            mockResults.push({
                id: `semantic_${i}`,
                type: 'entity',
                score: Math.random() * 10 + 7, // Semantic search often very relevant
                source: 'vector_index',
                data: this.generateSemanticMockData(query.query),
                highlights: {},
                metadata: {
                    lastUpdated: new Date(Date.now() - Math.random() * 86400000 * 14),
                    relevanceScore: Math.random() * 10 + 7,
                    matchingFields: ['semantic_vector'],
                    context: {
                        searchType: 'semantic',
                        vectorSimilarity: Math.random() * 0.5 + 0.5,
                    },
                },
            });
        }
        return mockResults.sort((a, b) => b.score - a.score);
    }
    async executeGraphSearch(query) {
        // Mock graph traversal search
        const mockResults = [];
        for (let i = 0; i < Math.min(80, Math.random() * 120 + 15); i++) {
            mockResults.push({
                id: `graph_${i}`,
                type: 'relationship',
                score: Math.random() * 8 + 6,
                source: 'graph_index',
                data: this.generateGraphMockData(),
                highlights: {},
                metadata: {
                    lastUpdated: new Date(),
                    relevanceScore: Math.random() * 8 + 6,
                    matchingFields: ['relationship_path'],
                    context: {
                        searchType: 'graph',
                        pathLength: Math.floor(Math.random() * 5) + 1,
                        traversalDepth: Math.floor(Math.random() * 3) + 1,
                    },
                },
            });
        }
        return mockResults;
    }
    async executeTemporalSearch(query) {
        const mockResults = [];
        if (!query.timeRange)
            return mockResults;
        for (let i = 0; i < Math.min(120, Math.random() * 180 + 25); i++) {
            const timestamp = new Date(query.timeRange.start.getTime() +
                Math.random() * (query.timeRange.end.getTime() - query.timeRange.start.getTime()));
            mockResults.push({
                id: `temporal_${i}`,
                type: 'investigation',
                score: Math.random() * 9 + 4,
                source: 'temporal_index',
                data: {
                    ...this.generateMockData('investigation', []),
                    timestamp,
                    timelinePosition: Math.random(),
                },
                highlights: {},
                metadata: {
                    lastUpdated: timestamp,
                    relevanceScore: Math.random() * 9 + 4,
                    matchingFields: ['timestamp', 'created_at'],
                    context: {
                        searchType: 'temporal',
                        timeRange: query.timeRange,
                        temporalRelevance: Math.random(),
                    },
                },
            });
        }
        return mockResults.sort((a, b) => b.data.timestamp - a.data.timestamp);
    }
    async executeGeospatialSearch(query) {
        const mockResults = [];
        if (!query.geoLocation)
            return mockResults;
        for (let i = 0; i < Math.min(60, Math.random() * 100 + 10); i++) {
            const distance = Math.random() * query.geoLocation.radius;
            const bearing = Math.random() * 360;
            mockResults.push({
                id: `geo_${i}`,
                type: 'entity',
                score: Math.random() * 10 +
                    ((query.geoLocation.radius - distance) / query.geoLocation.radius) * 5,
                source: 'geo_index',
                data: {
                    ...this.generateMockData('entity', []),
                    location: {
                        lat: query.geoLocation.lat + (distance * Math.cos((bearing * Math.PI) / 180)) / 111,
                        lng: query.geoLocation.lng +
                            (distance * Math.sin((bearing * Math.PI) / 180)) /
                                (111 * Math.cos((query.geoLocation.lat * Math.PI) / 180)),
                        distance: distance,
                        bearing: bearing,
                    },
                },
                highlights: {},
                metadata: {
                    lastUpdated: new Date(),
                    relevanceScore: Math.random() * 10,
                    matchingFields: ['location'],
                    context: {
                        searchType: 'geospatial',
                        distance: distance,
                        unit: query.geoLocation.unit,
                    },
                },
            });
        }
        return mockResults.sort((a, b) => a.data.location.distance - b.data.location.distance);
    }
    applyFilters(results, filters) {
        return results.filter((result) => {
            return filters.every((filter) => {
                const fieldValue = this.getFieldValue(result.data, filter.field);
                return this.evaluateFilter(fieldValue, filter);
            });
        });
    }
    applySorting(results, sort) {
        if (sort.length === 0)
            return results;
        return results.sort((a, b) => {
            for (const criteria of sort.sort((x, y) => x.priority - y.priority)) {
                const aValue = this.getFieldValue(a.data, criteria.field);
                const bValue = this.getFieldValue(b.data, criteria.field);
                const comparison = this.compareValues(aValue, bValue);
                if (comparison !== 0) {
                    return criteria.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }
    generateFacets(results, query) {
        const facets = [];
        // Type facet
        const typeCounts = new Map();
        results.forEach((result) => {
            typeCounts.set(result.type, (typeCounts.get(result.type) || 0) + 1);
        });
        facets.push({
            field: 'type',
            type: 'terms',
            buckets: Array.from(typeCounts.entries())
                .map(([key, count]) => ({
                key,
                count,
                selected: false,
            }))
                .sort((a, b) => b.count - a.count),
        });
        // Score range facet
        facets.push({
            field: 'score',
            type: 'range',
            buckets: [
                { key: '9-10', count: results.filter((r) => r.score >= 9).length, selected: false },
                {
                    key: '7-9',
                    count: results.filter((r) => r.score >= 7 && r.score < 9).length,
                    selected: false,
                },
                {
                    key: '5-7',
                    count: results.filter((r) => r.score >= 5 && r.score < 7).length,
                    selected: false,
                },
                { key: '0-5', count: results.filter((r) => r.score < 5).length, selected: false },
            ],
        });
        return facets;
    }
    generateSearchSuggestions(query) {
        const suggestions = [];
        // Add popular queries that are similar
        const popularMatches = this.popularQueries
            .filter((pq) => pq.query.toLowerCase().includes(query.toLowerCase()) && pq.query !== query)
            .slice(0, 3)
            .map((pq) => pq.query);
        suggestions.push(...popularMatches);
        // Add predefined suggestions
        const allSuggestions = Array.from(this.searchSuggestions.values()).flat();
        const relevant = allSuggestions
            .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
        suggestions.push(...relevant);
        return [...new Set(suggestions)].slice(0, 8);
    }
    updatePopularQueries(query) {
        const existing = this.popularQueries.find((pq) => pq.query === query);
        if (existing) {
            existing.count++;
        }
        else {
            this.popularQueries.push({ query, count: 1 });
        }
        // Keep only top 100 popular queries
        this.popularQueries.sort((a, b) => b.count - a.count);
        this.popularQueries = this.popularQueries.slice(0, 100);
    }
    // Helper methods for mock data generation
    generateMockData(type, terms) {
        const baseData = {
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date(Date.now() - Math.random() * 86400000 * 365),
            updated_at: new Date(),
        };
        switch (type) {
            case 'entity':
                return {
                    ...baseData,
                    name: this.generateEntityName(terms),
                    type: ['person', 'organization', 'location', 'event'][Math.floor(Math.random() * 4)],
                    description: this.generateDescription(terms),
                    confidence: Math.random(),
                    tags: this.generateTags(),
                };
            case 'investigation':
                return {
                    ...baseData,
                    title: this.generateInvestigationTitle(terms),
                    status: ['active', 'closed', 'pending', 'suspended'][Math.floor(Math.random() * 4)],
                    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                    assigned_to: `user_${Math.floor(Math.random() * 10) + 1}`,
                };
            default:
                return baseData;
        }
    }
    generateEntityName(terms) {
        if (terms.length > 0 && Math.random() > 0.5) {
            return `Entity containing ${terms[0]}`;
        }
        const names = ['Alpha Corp', 'John Smith', 'Beta Industries', 'Jane Doe', 'Gamma Technologies'];
        return names[Math.floor(Math.random() * names.length)];
    }
    generateDescription(terms) {
        const base = 'This is a relevant entity that matches the search criteria.';
        if (terms.length > 0) {
            return `${base} Contains information about ${terms.join(', ')}.`;
        }
        return base;
    }
    generateTags() {
        const allTags = [
            'suspicious',
            'verified',
            'high-risk',
            'financial',
            'cybersecurity',
            'investigation',
        ];
        const count = Math.floor(Math.random() * 3) + 1;
        const shuffled = [...allTags].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    generateInvestigationTitle(terms) {
        if (terms.length > 0) {
            return `Investigation: ${terms[0]} related case`;
        }
        const titles = [
            'Financial Fraud Case',
            'Cybersecurity Incident',
            'Data Breach Investigation',
            'Compliance Review',
        ];
        return titles[Math.floor(Math.random() * titles.length)];
    }
    parseAdvancedQuery(query) {
        // Simple parser for field:value syntax
        const parsed = {};
        const parts = query.split(' AND ');
        parts.forEach((part) => {
            const [field, value] = part.split(':');
            if (field && value) {
                parsed[field.trim()] = value.trim();
            }
        });
        return parsed;
    }
    getTypeFromQuery(parsedQuery) {
        if (parsedQuery.type) {
            return parsedQuery.type;
        }
        return 'entity';
    }
    generateAdvancedMockData(parsedQuery) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            ...parsedQuery,
            created_at: new Date(),
            advanced_match: true,
        };
    }
    generateAdvancedHighlights(parsedQuery) {
        const highlights = {};
        Object.keys(parsedQuery).forEach((field) => {
            highlights[field] = [`<em>${parsedQuery[field]}</em>`];
        });
        return highlights;
    }
    generateSemanticMockData(query) {
        return {
            id: Math.random().toString(36).substr(2, 9),
            semantic_match: query,
            similarity_score: Math.random() * 0.5 + 0.5,
            vector_space: 'embeddings-v1',
        };
    }
    generateGraphMockData() {
        return {
            id: Math.random().toString(36).substr(2, 9),
            source_node: `node_${Math.floor(Math.random() * 1000)}`,
            target_node: `node_${Math.floor(Math.random() * 1000)}`,
            relationship_type: ['CONNECTED_TO', 'RELATED_TO', 'INVOLVED_IN'][Math.floor(Math.random() * 3)],
            path_length: Math.floor(Math.random() * 5) + 1,
        };
    }
    generateHighlights(terms) {
        const highlights = {};
        if (terms.length > 0) {
            highlights.name = [`Match for <em>${terms[0]}</em>`];
            if (terms.length > 1) {
                highlights.description = [`Contains <em>${terms[1]}</em>`];
            }
        }
        return highlights;
    }
    getMatchingFields(terms) {
        const fields = ['name', 'description', 'tags', 'type'];
        return fields.slice(0, Math.floor(Math.random() * fields.length) + 1);
    }
    getFieldValue(data, field) {
        return field.split('.').reduce((obj, key) => obj?.[key], data);
    }
    evaluateFilter(value, filter) {
        // Simple filter evaluation - would be more comprehensive in real implementation
        switch (filter.operator) {
            case '=':
                return value === filter.value;
            case '!=':
                return value !== filter.value;
            case '>':
                return value > filter.value;
            case '<':
                return value < filter.value;
            case 'contains':
                return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            default:
                return true;
        }
    }
    compareValues(a, b) {
        if (a === b)
            return 0;
        if (a == null)
            return -1;
        if (b == null)
            return 1;
        if (typeof a === 'number' && typeof b === 'number')
            return a - b;
        return String(a).localeCompare(String(b));
    }
    // Public API methods
    async saveSearch(searchData) {
        const savedSearch = {
            ...searchData,
            id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            executionCount: 0,
            avgExecutionTime: 0,
        };
        this.savedSearches.set(savedSearch.id, savedSearch);
        await this.cache.set(`saved_search:${savedSearch.id}`, JSON.stringify(savedSearch), 86400);
        this.emit('search-saved', savedSearch);
        return savedSearch;
    }
    getSavedSearches(userId) {
        return Array.from(this.savedSearches.values())
            .filter((search) => search.createdBy === userId || search.isPublic)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    getSearchHistory(userId, limit = 20) {
        const history = this.searchHistory.get(userId) || [];
        return history.slice(0, limit);
    }
    getSearchIndices() {
        return Array.from(this.searchIndices.values());
    }
    getPopularQueries(limit = 10) {
        return this.popularQueries.slice(0, limit);
    }
    async buildAutoComplete(prefix, index) {
        // Mock autocomplete suggestions
        const suggestions = [
            `${prefix} entity`,
            `${prefix} investigation`,
            `${prefix} type:person`,
            `${prefix} AND status:active`,
            `${prefix} created_at:last_7_days`,
        ];
        return suggestions.filter((s) => s !== prefix).slice(0, 8);
    }
}
//# sourceMappingURL=advancedSearchService.js.map