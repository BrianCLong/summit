"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulationFeedMonitor = void 0;
const axios_1 = __importDefault(require("axios"));
const fast_xml_parser_1 = require("fast-xml-parser");
const events_1 = require("events");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createAgentLogger)('RegulationFeedMonitor');
/**
 * RegulationFeedMonitor - Autonomous agent that continuously monitors
 * regulatory sources (RSS feeds, APIs, webhooks) for new regulations,
 * policies, and legal updates across multiple jurisdictions.
 */
class RegulationFeedMonitor extends events_1.EventEmitter {
    sources = new Map();
    pollingIntervals = new Map();
    seenRegulations = new Set();
    xmlParser;
    constructor() {
        super();
        this.xmlParser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });
    }
    /**
     * Register a regulatory source to monitor
     */
    registerSource(source) {
        this.sources.set(source.id, source);
        logger.info({ sourceId: source.id, name: source.name }, 'Registered regulation source');
    }
    /**
     * Start monitoring all registered sources
     */
    startMonitoring() {
        logger.info({ sourceCount: this.sources.size }, 'Starting regulatory feed monitoring');
        for (const [id, source] of this.sources) {
            if (!source.enabled) {
                continue;
            }
            // Initial fetch
            this.fetchSource(source).catch(err => logger.error({ sourceId: id, error: err.message }, 'Initial fetch failed'));
            // Set up polling interval
            const interval = setInterval(() => this.fetchSource(source).catch(err => logger.error({ sourceId: id, error: err.message }, 'Polling fetch failed')), source.pollingIntervalMinutes * 60 * 1000);
            this.pollingIntervals.set(id, interval);
        }
    }
    /**
     * Stop monitoring all sources
     */
    stopMonitoring() {
        for (const [id, interval] of this.pollingIntervals) {
            clearInterval(interval);
            logger.info({ sourceId: id }, 'Stopped monitoring source');
        }
        this.pollingIntervals.clear();
    }
    /**
     * Fetch and parse regulations from a source
     */
    async fetchSource(source) {
        logger.debug({ sourceId: source.id, type: source.type }, 'Fetching source');
        try {
            switch (source.type) {
                case 'rss':
                    await this.fetchRSSFeed(source);
                    break;
                case 'api':
                    await this.fetchAPIEndpoint(source);
                    break;
                default:
                    logger.warn({ type: source.type }, 'Unsupported source type');
            }
            // Update last checked timestamp
            source.lastChecked = new Date();
        }
        catch (error) {
            logger.error({ sourceId: source.id, error }, 'Failed to fetch source');
            throw error;
        }
    }
    /**
     * Fetch and parse RSS feed
     */
    async fetchRSSFeed(source) {
        const response = await axios_1.default.get(source.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'IntelGraph-Compliance-Monitor/1.0',
                Accept: 'application/rss+xml, application/xml, text/xml',
            },
        });
        const parsed = this.xmlParser.parse(response.data);
        const items = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
        for (const item of Array.isArray(items) ? items : [items]) {
            await this.processRSSItem(source, item);
        }
        logger.info({ sourceId: source.id, itemCount: items.length }, 'Processed RSS feed');
    }
    /**
     * Process a single RSS item
     */
    async processRSSItem(source, item) {
        const externalId = item.guid || item.link || item.title;
        const dedupeKey = `${source.id}:${externalId}`;
        if (this.seenRegulations.has(dedupeKey)) {
            return;
        }
        this.seenRegulations.add(dedupeKey);
        const regulation = {
            id: (0, uuid_1.v4)(),
            sourceId: source.id,
            externalId,
            title: item.title || 'Untitled Regulation',
            summary: item.description,
            jurisdiction: source.jurisdiction,
            regulatoryBody: source.name,
            categories: this.extractCategories(item, source),
            publishedDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            status: 'proposed',
            url: item.link || source.url,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.emitRegulationDetected(regulation);
    }
    /**
     * Fetch from API endpoint (EUR-Lex, etc.)
     */
    async fetchAPIEndpoint(source) {
        const response = await axios_1.default.get(source.url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'IntelGraph-Compliance-Monitor/1.0',
                Accept: 'application/json',
                ...source.credentials,
            },
            params: {
                // Default params for regulatory APIs
                pageSize: 50,
                sortBy: 'publishedDate',
                sortOrder: 'desc',
            },
        });
        const items = response.data?.results || response.data?.items || response.data || [];
        for (const item of items) {
            await this.processAPIItem(source, item);
        }
        logger.info({ sourceId: source.id, itemCount: items.length }, 'Processed API endpoint');
    }
    /**
     * Process API response item
     */
    async processAPIItem(source, item) {
        const externalId = String(item.id || item.celex || item.documentId || item.uri);
        const dedupeKey = `${source.id}:${externalId}`;
        if (this.seenRegulations.has(dedupeKey)) {
            return;
        }
        this.seenRegulations.add(dedupeKey);
        const regulation = {
            id: (0, uuid_1.v4)(),
            sourceId: source.id,
            externalId,
            title: String(item.title || item.name || 'Untitled'),
            summary: String(item.summary || item.abstract || item.description || ''),
            jurisdiction: source.jurisdiction,
            regulatoryBody: String(item.author || item.institution || source.name),
            categories: source.categories,
            publishedDate: item.publishedDate ? new Date(String(item.publishedDate)) : new Date(),
            effectiveDate: item.effectiveDate ? new Date(String(item.effectiveDate)) : undefined,
            status: this.mapStatus(String(item.status || 'proposed')),
            url: String(item.url || item.uri || source.url),
            metadata: item,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.emitRegulationDetected(regulation);
    }
    /**
     * Extract categories from feed item
     */
    extractCategories(item, source) {
        const categories = new Set(source.categories);
        if (item.category) {
            const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
            itemCategories.forEach(c => categories.add(String(c).toLowerCase()));
        }
        return Array.from(categories);
    }
    /**
     * Map external status to internal status
     */
    mapStatus(status) {
        const statusMap = {
            draft: 'draft',
            proposed: 'proposed',
            final: 'final',
            effective: 'effective',
            superseded: 'superseded',
            in_force: 'effective',
            adopted: 'final',
        };
        return statusMap[status.toLowerCase()] || 'proposed';
    }
    /**
     * Emit regulation detected event
     */
    emitRegulationDetected(regulation) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: 'regulation_detected',
            payload: regulation,
            timestamp: new Date(),
            agentId: 'RegulationFeedMonitor',
        };
        logger.info({ regulationId: regulation.id, title: regulation.title, jurisdiction: regulation.jurisdiction }, 'New regulation detected');
        this.emit('regulation_detected', event);
    }
    /**
     * Get monitoring statistics
     */
    getStats() {
        return {
            sourcesRegistered: this.sources.size,
            sourcesActive: this.pollingIntervals.size,
            regulationsDetected: this.seenRegulations.size,
        };
    }
}
exports.RegulationFeedMonitor = RegulationFeedMonitor;
