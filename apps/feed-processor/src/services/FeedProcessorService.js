"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedProcessorService = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const xml2js = __importStar(require("xml2js"));
const stream_1 = require("stream");
const util_1 = require("util");
const pipelineAsync = (0, util_1.promisify)(stream_1.pipeline);
class FeedProcessorService extends events_1.EventEmitter {
    pgPool;
    neo4jDriver;
    redisClient;
    activePollIntervals = new Map();
    processingQueues = new Map();
    isProcessing = false;
    constructor(pgPool, neo4jDriver, redisClient) {
        super();
        this.pgPool = pgPool;
        this.neo4jDriver = neo4jDriver;
        this.redisClient = redisClient;
        this.startProcessingLoop();
    }
    async createFeedSource(source, userId) {
        const client = await this.pgPool.connect();
        try {
            await client.query('BEGIN');
            const sourceId = (0, uuid_1.v4)();
            const now = new Date();
            const feedSource = {
                ...source,
                id: sourceId,
                errorCount: 0,
                totalProcessed: 0,
                createdAt: now,
                updatedAt: now,
            };
            const query = `
        INSERT INTO feed_sources (
          id, name, type, url, configuration, status, error_count, 
          total_processed, created_at, updated_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
            await client.query(query, [
                sourceId,
                source.name,
                source.type,
                source.url,
                JSON.stringify(source.configuration),
                source.status,
                0,
                0,
                now,
                now,
                userId,
            ]);
            await client.query('COMMIT');
            // Start polling if source is active
            if (source.status === 'active') {
                this.startPolling(feedSource);
            }
            logger_1.logger.info(`Feed source created: ${sourceId} (${source.name})`);
            this.emit('feed.source.created', feedSource);
            return feedSource;
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error creating feed source:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async startPolling(source) {
        if (this.activePollIntervals.has(source.id)) {
            this.stopPolling(source.id);
        }
        logger_1.logger.info(`Starting polling for feed source: ${source.name} (${source.id})`);
        // Initial poll
        this.pollFeedSource(source);
        // Set up interval polling
        const interval = setInterval(() => {
            this.pollFeedSource(source);
        }, source.configuration.pollInterval);
        this.activePollIntervals.set(source.id, interval);
    }
    async stopPolling(sourceId) {
        const interval = this.activePollIntervals.get(sourceId);
        if (interval) {
            clearInterval(interval);
            this.activePollIntervals.delete(sourceId);
            logger_1.logger.info(`Stopped polling for feed source: ${sourceId}`);
        }
    }
    async pollFeedSource(source) {
        const startTime = Date.now();
        try {
            logger_1.logger.debug(`Polling feed source: ${source.name}`);
            let data;
            switch (source.type) {
                case 'rss':
                case 'xml':
                    data = await this.fetchXmlFeed(source);
                    break;
                case 'json':
                case 'api':
                    data = await this.fetchJsonFeed(source);
                    break;
                case 'csv':
                    data = await this.fetchCsvFeed(source);
                    break;
                case 'stix':
                case 'taxii':
                    data = await this.fetchStixFeed(source);
                    break;
                default:
                    throw new Error(`Unsupported feed type: ${source.type}`);
            }
            const items = this.parseFeedData(data, source);
            const filteredItems = this.applyFilters(items, source);
            // Queue items for processing
            this.queueItemsForProcessing(filteredItems, source);
            // Update source status
            await this.updateSourceStatus(source.id, {
                lastPoll: new Date(),
                lastSuccess: new Date(),
                totalProcessed: source.totalProcessed + filteredItems.length,
            });
            const processingTime = Date.now() - startTime;
            logger_1.logger.info(`Polled feed source: ${source.name}, ${filteredItems.length} items, ${processingTime}ms`);
            this.emit('feed.poll.completed', {
                sourceId: source.id,
                itemCount: filteredItems.length,
                processingTime,
            });
        }
        catch (error) {
            logger_1.logger.error(`Error polling feed source ${source.name}:`, error);
            const newErrorCount = source.errorCount + 1;
            await this.updateSourceStatus(source.id, {
                lastPoll: new Date(),
                errorCount: newErrorCount,
                status: newErrorCount > 5 ? 'error' : source.status,
            });
            this.emit('feed.poll.error', {
                sourceId: source.id,
                error: error.message,
                errorCount: newErrorCount,
            });
        }
    }
    async fetchXmlFeed(source) {
        const response = await this.makeHttpRequest(source);
        const parser = new xml2js.Parser();
        return parser.parseStringPromise(response.data);
    }
    async fetchJsonFeed(source) {
        const response = await this.makeHttpRequest(source);
        return response.data;
    }
    async fetchCsvFeed(source) {
        const response = await this.makeHttpRequest(source);
        // CSV parsing would be implemented here
        return response.data;
    }
    async fetchStixFeed(source) {
        const response = await this.makeHttpRequest(source);
        return response.data;
    }
    async makeHttpRequest(source) {
        if (!source.url) {
            throw new Error('Feed source URL is required');
        }
        const config = {
            url: source.url,
            method: 'GET',
            timeout: 30000,
            headers: {
                'User-Agent': 'IntelGraph-FeedProcessor/1.0',
            },
        };
        // Add authentication
        const auth = source.configuration.authentication;
        if (auth && auth.type !== 'none') {
            switch (auth.type) {
                case 'basic':
                    config.auth = {
                        username: auth.credentials.username,
                        password: auth.credentials.password,
                    };
                    break;
                case 'bearer':
                    config.headers['Authorization'] = `Bearer ${auth.credentials.token}`;
                    break;
                case 'api_key':
                    if (auth.credentials.header) {
                        config.headers[auth.credentials.header] = auth.credentials.key;
                    }
                    else {
                        config.params = { api_key: auth.credentials.key };
                    }
                    break;
            }
        }
        return (0, axios_1.default)(config);
    }
    parseFeedData(data, source) {
        const items = [];
        const mapping = source.configuration.format.mapping;
        try {
            let feedItems = [];
            switch (source.type) {
                case 'rss':
                    feedItems = data.rss?.channel?.[0]?.item || [];
                    break;
                case 'json':
                    feedItems = Array.isArray(data)
                        ? data
                        : data.items || data.results || [data];
                    break;
                case 'xml':
                    const rootElement = source.configuration.format.rootElement || 'items';
                    feedItems = data[rootElement] || [];
                    break;
                case 'stix':
                    feedItems = data.objects || [];
                    break;
                default:
                    feedItems = [data];
            }
            feedItems.forEach((item, index) => {
                try {
                    const processedItem = {
                        id: (0, uuid_1.v4)(),
                        sourceId: source.id,
                        originalId: this.extractField(item, mapping.id || 'id'),
                        title: this.extractField(item, mapping.title || 'title') ||
                            `Item ${index}`,
                        description: this.extractField(item, mapping.description || 'description'),
                        content: this.extractField(item, mapping.content || 'content'),
                        publishedAt: this.parseDate(this.extractField(item, mapping.publishedAt || 'pubDate')),
                        url: this.extractField(item, mapping.url || 'link'),
                        author: this.extractField(item, mapping.author || 'author'),
                        category: this.extractField(item, mapping.category || 'category'),
                        tags: this.extractTags(item, mapping.tags || 'tags'),
                        rawData: item,
                        processedData: {},
                        processingStatus: 'pending',
                    };
                    items.push(processedItem);
                }
                catch (error) {
                    logger_1.logger.warn(`Error parsing feed item ${index}:`, error);
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error parsing feed data:', error);
            throw error;
        }
        return items;
    }
    extractField(item, path) {
        if (!path || !item)
            return undefined;
        return path.split('.').reduce((current, key) => {
            if (Array.isArray(current) && current.length > 0) {
                current = current[0];
            }
            return current?.[key];
        }, item);
    }
    extractTags(item, path) {
        const value = this.extractField(item, path);
        if (!value)
            return [];
        if (Array.isArray(value)) {
            return value.map((v) => String(v));
        }
        if (typeof value === 'string') {
            return value
                .split(/[,;]/)
                .map((tag) => tag.trim())
                .filter(Boolean);
        }
        return [String(value)];
    }
    parseDate(dateStr) {
        if (!dateStr)
            return new Date();
        if (dateStr instanceof Date)
            return dateStr;
        try {
            return new Date(dateStr);
        }
        catch {
            return new Date();
        }
    }
    applyFilters(items, source) {
        const filters = source.configuration.filters;
        if (!filters)
            return items;
        return items.filter((item) => {
            // Include patterns
            if (filters.includePatterns?.length > 0) {
                const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
                if (!filters.includePatterns.some((pattern) => content.includes(pattern.toLowerCase()))) {
                    return false;
                }
            }
            // Exclude patterns
            if (filters.excludePatterns?.length > 0) {
                const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
                if (filters.excludePatterns.some((pattern) => content.includes(pattern.toLowerCase()))) {
                    return false;
                }
            }
            // Field filters
            if (filters.fieldFilters?.length > 0) {
                return filters.fieldFilters.every((filter) => {
                    const value = this.extractField(item, filter.field);
                    return this.evaluateFilter(value, filter.operator, filter.value);
                });
            }
            return true;
        });
    }
    evaluateFilter(value, operator, filterValue) {
        switch (operator) {
            case 'eq':
                return value === filterValue;
            case 'ne':
                return value !== filterValue;
            case 'gt':
                return value > filterValue;
            case 'gte':
                return value >= filterValue;
            case 'lt':
                return value < filterValue;
            case 'lte':
                return value <= filterValue;
            case 'contains':
                return String(value)
                    .toLowerCase()
                    .includes(String(filterValue).toLowerCase());
            case 'startsWith':
                return String(value)
                    .toLowerCase()
                    .startsWith(String(filterValue).toLowerCase());
            case 'endsWith':
                return String(value)
                    .toLowerCase()
                    .endsWith(String(filterValue).toLowerCase());
            case 'in':
                return Array.isArray(filterValue) && filterValue.includes(value);
            case 'regex':
                return new RegExp(filterValue).test(String(value));
            default:
                return true;
        }
    }
    queueItemsForProcessing(items, source) {
        if (!this.processingQueues.has(source.id)) {
            this.processingQueues.set(source.id, []);
        }
        const queue = this.processingQueues.get(source.id);
        queue.push(...items);
        logger_1.logger.debug(`Queued ${items.length} items for processing from ${source.name}`);
        this.emit('items.queued', { sourceId: source.id, count: items.length });
    }
    async startProcessingLoop() {
        setInterval(async () => {
            if (this.isProcessing)
                return;
            this.isProcessing = true;
            try {
                for (const [sourceId, queue] of this.processingQueues) {
                    if (queue.length === 0)
                        continue;
                    const batchSize = 10; // Process in batches
                    const batch = queue.splice(0, batchSize);
                    await this.processBatch(batch);
                }
            }
            catch (error) {
                logger_1.logger.error('Error in processing loop:', error);
            }
            finally {
                this.isProcessing = false;
            }
        }, 1000); // Process every second
    }
    async processBatch(items) {
        const promises = items.map((item) => this.processItem(item));
        await Promise.allSettled(promises);
    }
    async processItem(item) {
        const startTime = Date.now();
        try {
            logger_1.logger.debug(`Processing item: ${item.title}`);
            // Get source configuration for enrichment
            const source = await this.getFeedSource(item.sourceId);
            if (!source) {
                throw new Error('Feed source not found');
            }
            const enrichment = source.configuration.enrichment;
            // Entity extraction
            if (enrichment?.entityExtraction) {
                item.processedData.entities = await this.extractEntities(item);
            }
            // Geolocation
            if (enrichment?.geoLocation) {
                item.processedData.geolocation = await this.extractGeolocation(item);
            }
            // Sentiment analysis
            if (enrichment?.sentiment) {
                item.processedData.sentiment = await this.analyzeSentiment(item);
            }
            // Threat intelligence
            if (enrichment?.threatIntelligence) {
                item.processedData.threatIndicators =
                    await this.extractThreatIndicators(item);
            }
            // Calculate relevance score
            item.processedData.relevanceScore = this.calculateRelevanceScore(item);
            // Store processed item
            await this.storeProcessedItem(item);
            item.processingStatus = 'stored';
            item.processedAt = new Date();
            const processingTime = Date.now() - startTime;
            logger_1.logger.debug(`Processed item: ${item.title} in ${processingTime}ms`);
            this.emit('item.processed', {
                itemId: item.id,
                sourceId: item.sourceId,
                processingTime,
            });
        }
        catch (error) {
            logger_1.logger.error(`Error processing item ${item.id}:`, error);
            item.processingStatus = 'error';
            item.processingErrors = [error.message];
            item.processedAt = new Date();
            this.emit('item.error', {
                itemId: item.id,
                sourceId: item.sourceId,
                error: error.message,
            });
        }
    }
    async extractEntities(item) {
        // Placeholder for entity extraction using NLP
        const content = `${item.title} ${item.description} ${item.content}`.toLowerCase();
        const entities = [];
        // Simple pattern-based entity extraction (in production, use NLP libraries)
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
            domain: /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g,
            cve: /CVE-\d{4}-\d{4,7}/gi,
        };
        Object.entries(patterns).forEach(([type, pattern]) => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                entities.push({
                    type: type,
                    text: match[0],
                    confidence: 0.8,
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                });
            }
        });
        return entities;
    }
    async extractGeolocation(item) {
        // Placeholder for geolocation extraction
        return { locations: [] };
    }
    async analyzeSentiment(item) {
        // Placeholder for sentiment analysis
        const content = `${item.title} ${item.description}`.toLowerCase();
        // Simple keyword-based sentiment (in production, use ML models)
        const positiveWords = ['good', 'great', 'excellent', 'positive', 'success'];
        const negativeWords = [
            'bad',
            'terrible',
            'negative',
            'failure',
            'attack',
            'breach',
        ];
        const positiveCount = positiveWords.filter((word) => content.includes(word)).length;
        const negativeCount = negativeWords.filter((word) => content.includes(word)).length;
        let score = 0;
        let label = 'neutral';
        if (positiveCount > negativeCount) {
            score = 0.5;
            label = 'positive';
        }
        else if (negativeCount > positiveCount) {
            score = -0.5;
            label = 'negative';
        }
        return {
            score,
            magnitude: Math.abs(score),
            label,
            confidence: 0.6,
        };
    }
    async extractThreatIndicators(item) {
        const indicators = [];
        const content = `${item.title} ${item.description} ${item.content}`;
        // Extract IOCs from entities
        if (item.processedData.entities) {
            item.processedData.entities.forEach((entity) => {
                let type = null;
                switch (entity.type) {
                    case 'email':
                        type = 'email';
                        break;
                    case 'ip':
                        type = 'ip';
                        break;
                    case 'domain':
                        type = 'domain';
                        break;
                }
                if (type) {
                    indicators.push({
                        type,
                        value: entity.text,
                        confidence: entity.confidence,
                        malicious: false, // Would check against threat intel feeds
                        source: item.sourceId,
                        context: item.title,
                    });
                }
            });
        }
        return indicators;
    }
    calculateRelevanceScore(item) {
        let score = 0.5; // Base score
        // Boost based on number of entities found
        if (item.processedData.entities) {
            score += Math.min(item.processedData.entities.length * 0.1, 0.3);
        }
        // Boost based on threat indicators
        if (item.processedData.threatIndicators) {
            score += Math.min(item.processedData.threatIndicators.length * 0.2, 0.4);
        }
        // Adjust based on sentiment (negative content might be more relevant for security)
        if (item.processedData.sentiment?.label === 'negative') {
            score += 0.1;
        }
        // Recency boost (newer items are more relevant)
        const ageInDays = (Date.now() - item.publishedAt.getTime()) / (24 * 60 * 60 * 1000);
        if (ageInDays < 1) {
            score += 0.2;
        }
        else if (ageInDays < 7) {
            score += 0.1;
        }
        return Math.min(Math.max(score, 0), 1);
    }
    async storeProcessedItem(item) {
        const client = await this.pgPool.connect();
        try {
            await client.query('BEGIN');
            // Store feed item
            const insertItemQuery = `
        INSERT INTO feed_items (
          id, source_id, original_id, title, description, content, published_at,
          url, author, category, tags, raw_data, processed_data, 
          processing_status, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
            await client.query(insertItemQuery, [
                item.id,
                item.sourceId,
                item.originalId,
                item.title,
                item.description,
                item.content,
                item.publishedAt,
                item.url,
                item.author,
                item.category,
                JSON.stringify(item.tags),
                JSON.stringify(item.rawData),
                JSON.stringify(item.processedData),
                item.processingStatus,
                item.processedAt,
            ]);
            // Create entities in graph if extracted
            if (item.processedData.entities &&
                item.processedData.entities.length > 0) {
                await this.createGraphEntities(item);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error storing processed item:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async createGraphEntities(item) {
        const session = this.neo4jDriver.session();
        try {
            // Create feed item node
            await session.run(`
        CREATE (item:FeedItem {
          id: $id,
          title: $title,
          source: $source,
          publishedAt: datetime($publishedAt),
          url: $url,
          relevanceScore: $relevanceScore
        })
      `, {
                id: item.id,
                title: item.title,
                source: item.sourceId,
                publishedAt: item.publishedAt.toISOString(),
                url: item.url,
                relevanceScore: item.processedData.relevanceScore || 0,
            });
            // Create entity nodes and relationships
            for (const entity of item.processedData.entities || []) {
                await session.run(`
          MERGE (e:Entity {value: $value, type: $type})
          ON CREATE SET 
            e.id = randomUUID(),
            e.confidence = $confidence,
            e.createdAt = datetime()
          WITH e
          MATCH (item:FeedItem {id: $itemId})
          CREATE (item)-[:MENTIONS {
            confidence: $confidence,
            startIndex: $startIndex,
            endIndex: $endIndex
          }]->(e)
        `, {
                    value: entity.text,
                    type: entity.type,
                    confidence: entity.confidence,
                    itemId: item.id,
                    startIndex: entity.startIndex,
                    endIndex: entity.endIndex,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error creating graph entities:', error);
            throw error;
        }
        finally {
            await session.close();
        }
    }
    async updateSourceStatus(sourceId, updates) {
        const setClause = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            const columnName = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClause.push(`${columnName} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        });
        if (setClause.length === 0)
            return;
        const query = `
      UPDATE feed_sources 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
    `;
        values.push(sourceId);
        await this.pgPool.query(query, values);
    }
    async getFeedSource(sourceId) {
        const query = 'SELECT * FROM feed_sources WHERE id = $1';
        const result = await this.pgPool.query(query, [sourceId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            url: row.url,
            configuration: row.configuration,
            status: row.status,
            lastPoll: row.last_poll,
            lastSuccess: row.last_success,
            errorCount: row.error_count,
            totalProcessed: row.total_processed,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async getFeedStats(sourceId) {
        let query = `
      SELECT 
        fs.id as source_id,
        fs.name as source_name,
        COUNT(fi.id) as total_items,
        COUNT(CASE WHEN fi.processing_status = 'stored' THEN 1 END) as processed_items,
        COUNT(CASE WHEN fi.processing_status = 'error' THEN 1 END) as error_items,
        AVG(EXTRACT(EPOCH FROM (fi.processed_at - fi.published_at))) as avg_processing_time,
        COUNT(fi.id) FILTER (WHERE fi.processed_at >= NOW() - INTERVAL '1 minute') as items_last_minute,
        MAX(fi.processed_at) as last_processing_time
      FROM feed_sources fs
      LEFT JOIN feed_items fi ON fs.id = fi.source_id
    `;
        const params = [];
        if (sourceId) {
            query += ' WHERE fs.id = $1';
            params.push(sourceId);
        }
        query += ' GROUP BY fs.id, fs.name ORDER BY fs.name';
        const result = await this.pgPool.query(query, params);
        return result.rows.map((row) => ({
            sourceId: row.source_id,
            totalItems: parseInt(row.total_items),
            processedItems: parseInt(row.processed_items),
            errorItems: parseInt(row.error_items),
            averageProcessingTime: parseFloat(row.avg_processing_time) || 0,
            itemsPerMinute: parseInt(row.items_last_minute),
            lastProcessingTime: row.last_processing_time,
        }));
    }
    async pauseSource(sourceId) {
        await this.updateSourceStatus(sourceId, { status: 'paused' });
        this.stopPolling(sourceId);
        this.emit('feed.source.paused', { sourceId });
        logger_1.logger.info(`Feed source paused: ${sourceId}`);
    }
    async resumeSource(sourceId) {
        const source = await this.getFeedSource(sourceId);
        if (source) {
            await this.updateSourceStatus(sourceId, { status: 'active' });
            await this.startPolling(source);
            this.emit('feed.source.resumed', { sourceId });
            logger_1.logger.info(`Feed source resumed: ${sourceId}`);
        }
    }
    async deleteSource(sourceId) {
        this.stopPolling(sourceId);
        const client = await this.pgPool.connect();
        try {
            await client.query('BEGIN');
            // Delete feed items
            await client.query('DELETE FROM feed_items WHERE source_id = $1', [
                sourceId,
            ]);
            // Delete source
            await client.query('DELETE FROM feed_sources WHERE id = $1', [sourceId]);
            await client.query('COMMIT');
            this.emit('feed.source.deleted', { sourceId });
            logger_1.logger.info(`Feed source deleted: ${sourceId}`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.FeedProcessorService = FeedProcessorService;
