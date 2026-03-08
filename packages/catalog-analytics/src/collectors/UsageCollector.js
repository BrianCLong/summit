"use strict";
/**
 * Usage Collector
 * Collects and stores usage events from the catalog
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageCollector = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class UsageCollector {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Record view event
     */
    async recordView(assetId, userId, sessionId, metadata = {}) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.VIEW,
            assetId,
            userId,
            sessionId,
            metadata,
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record search event
     */
    async recordSearch(query, userId, sessionId, resultCount) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.SEARCH,
            assetId: '', // Search not tied to specific asset
            userId,
            sessionId,
            metadata: { query, resultCount },
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record download event
     */
    async recordDownload(assetId, userId, sessionId) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.DOWNLOAD,
            assetId,
            userId,
            sessionId,
            metadata: {},
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record edit event
     */
    async recordEdit(assetId, userId, sessionId, changes) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.EDIT,
            assetId,
            userId,
            sessionId,
            metadata: { changes },
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record comment event
     */
    async recordComment(assetId, userId, sessionId, commentId) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.COMMENT,
            assetId,
            userId,
            sessionId,
            metadata: { commentId },
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record share event
     */
    async recordShare(assetId, userId, sessionId, sharedWith) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.SHARE,
            assetId,
            userId,
            sessionId,
            metadata: { sharedWith },
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record bookmark event
     */
    async recordBookmark(assetId, userId, sessionId) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.BOOKMARK,
            assetId,
            userId,
            sessionId,
            metadata: {},
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Record rating event
     */
    async recordRating(assetId, userId, sessionId, rating) {
        const event = {
            id: this.generateEventId(),
            eventType: data_catalog_1.UsageEventType.RATE,
            assetId,
            userId,
            sessionId,
            metadata: { rating },
            timestamp: new Date(),
        };
        await this.store.recordEvent(event);
    }
    /**
     * Get asset usage metrics
     */
    async getAssetMetrics(assetId, startDate, endDate) {
        return this.store.getAssetMetrics(assetId, startDate, endDate);
    }
    /**
     * Get usage events
     */
    async getEvents(filters) {
        return this.store.getEvents(filters);
    }
    /**
     * Generate event ID
     */
    generateEventId() {
        return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.UsageCollector = UsageCollector;
