"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISPConnector = void 0;
const events_1 = require("events");
class MISPConnector extends events_1.EventEmitter {
    config;
    metrics;
    feeds = new Map();
    enrichmentCache = new Map();
    constructor(config) {
        super();
        this.config = config;
        this.metrics = {
            totalEvents: 0,
            publishedEvents: 0,
            totalAttributes: 0,
            totalObjects: 0,
            totalTags: 0,
            apiCalls: 0,
            enrichmentQueries: 0,
            averageResponseTime: 0,
            errorRate: 0,
        };
    }
    async makeRequest(endpoint, method = 'GET', data) {
        const startTime = Date.now();
        const url = `${this.config.baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: this.config.apiKey,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });
            this.metrics.apiCalls++;
            const responseTime = Date.now() - startTime;
            this.metrics.averageResponseTime =
                (this.metrics.averageResponseTime + responseTime) / 2;
            if (!response.ok) {
                this.metrics.errorRate++;
                throw new Error(`MISP API error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            this.metrics.errorRate++;
            this.emit('api_error', {
                endpoint,
                method,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async createEvent(event) {
        try {
            const response = await this.makeRequest('/events/add', 'POST', {
                Event: event,
            });
            const createdEvent = response.Event;
            this.metrics.totalEvents++;
            if (createdEvent.published) {
                this.metrics.publishedEvents++;
            }
            this.emit('event_created', {
                eventId: createdEvent.id,
                uuid: createdEvent.uuid,
                info: createdEvent.info,
                threatLevel: createdEvent.threat_level_id,
                timestamp: new Date(),
            });
            return createdEvent;
        }
        catch (error) {
            this.emit('event_creation_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                eventInfo: event.info,
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async getEvent(eventId) {
        const response = await this.makeRequest(`/events/view/${eventId}`);
        return response.Event;
    }
    async updateEvent(eventId, updates) {
        const response = await this.makeRequest(`/events/edit/${eventId}`, 'POST', {
            Event: updates,
        });
        this.emit('event_updated', {
            eventId,
            updates,
            timestamp: new Date(),
        });
        return response.Event;
    }
    async publishEvent(eventId) {
        const response = await this.makeRequest(`/events/publish/${eventId}`, 'POST');
        this.metrics.publishedEvents++;
        this.emit('event_published', {
            eventId,
            timestamp: new Date(),
        });
        return response.Event;
    }
    async deleteEvent(eventId) {
        await this.makeRequest(`/events/delete/${eventId}`, 'DELETE');
        this.metrics.totalEvents--;
        this.emit('event_deleted', {
            eventId,
            timestamp: new Date(),
        });
    }
    async addAttribute(eventId, attribute) {
        try {
            const response = await this.makeRequest(`/attributes/add/${eventId}`, 'POST', { Attribute: attribute });
            const createdAttribute = response.Attribute;
            this.metrics.totalAttributes++;
            this.emit('attribute_created', {
                attributeId: createdAttribute.id,
                eventId,
                type: createdAttribute.type,
                value: createdAttribute.value,
                timestamp: new Date(),
            });
            return createdAttribute;
        }
        catch (error) {
            this.emit('attribute_creation_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                eventId,
                attributeType: attribute.type,
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async addObject(eventId, object) {
        try {
            const response = await this.makeRequest(`/objects/add/${eventId}`, 'POST', { Object: object });
            const createdObject = response.Object;
            this.metrics.totalObjects++;
            this.emit('object_created', {
                objectId: createdObject.id,
                eventId,
                name: createdObject.name,
                template: createdObject.template_uuid,
                timestamp: new Date(),
            });
            return createdObject;
        }
        catch (error) {
            this.emit('object_creation_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                eventId,
                objectName: object.name,
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async addTag(eventId, tagName) {
        await this.makeRequest(`/events/addTag/${eventId}/${encodeURIComponent(tagName)}`, 'POST');
        this.emit('tag_added', {
            eventId,
            tagName,
            timestamp: new Date(),
        });
    }
    async removeTag(eventId, tagName) {
        await this.makeRequest(`/events/removeTag/${eventId}/${encodeURIComponent(tagName)}`, 'POST');
        this.emit('tag_removed', {
            eventId,
            tagName,
            timestamp: new Date(),
        });
    }
    async searchEvents(query) {
        const response = await this.makeRequest('/events/restSearch', 'POST', query);
        this.emit('events_searched', {
            query,
            resultCount: response.length,
            timestamp: new Date(),
        });
        return response.response || [];
    }
    async searchAttributes(query) {
        const response = await this.makeRequest('/attributes/restSearch', 'POST', query);
        this.emit('attributes_searched', {
            query,
            resultCount: response.length,
            timestamp: new Date(),
        });
        return response.response || [];
    }
    async enrichIOC(ioc, type) {
        const cacheKey = `${ioc}:${type || 'any'}`;
        const cached = this.enrichmentCache.get(cacheKey);
        if (cached && Date.now() - cached.lastSeen.getTime() < 3600000) {
            // 1 hour cache
            return cached;
        }
        try {
            this.metrics.enrichmentQueries++;
            const searchQuery = {
                attribute: [ioc],
                type: type ? [type] : undefined,
                enforceWarninglist: false,
                metadata: false,
            };
            const events = await this.searchEvents(searchQuery);
            const attributes = await this.searchAttributes(searchQuery);
            const enrichment = {
                ioc,
                type: type || 'unknown',
                events,
                attributes,
                firstSeen: this.getFirstSeen(attributes),
                lastSeen: new Date(),
                threatLevel: this.calculateThreatLevel(events),
                confidence: this.calculateConfidence(events, attributes),
                tags: this.extractTags(events, attributes),
                context: {
                    malwareFamilies: this.extractMalwareFamilies(events),
                    campaigns: this.extractCampaigns(events),
                    threatActors: this.extractThreatActors(events),
                    techniques: this.extractTechniques(events),
                },
            };
            this.enrichmentCache.set(cacheKey, enrichment);
            this.emit('ioc_enriched', {
                ioc,
                type: enrichment.type,
                eventCount: events.length,
                attributeCount: attributes.length,
                threatLevel: enrichment.threatLevel,
                confidence: enrichment.confidence,
                timestamp: new Date(),
            });
            return enrichment;
        }
        catch (error) {
            this.emit('enrichment_failed', {
                ioc,
                type,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            throw error;
        }
    }
    getFirstSeen(attributes) {
        const timestamps = attributes
            .map((attr) => attr.first_seen || attr.timestamp)
            .filter((ts) => ts)
            .map((ts) => typeof ts === 'string' ? new Date(ts) : new Date(ts * 1000));
        return timestamps.length > 0
            ? new Date(Math.min(...timestamps.map((d) => d.getTime())))
            : undefined;
    }
    calculateThreatLevel(events) {
        if (events.length === 0)
            return 1; // Low
        const avgThreatLevel = events.reduce((sum, event) => sum + event.threat_level_id, 0) /
            events.length;
        return Math.round(avgThreatLevel);
    }
    calculateConfidence(events, attributes) {
        const factors = [
            events.length > 0 ? 0.3 : 0,
            attributes.length > 0 ? 0.2 : 0,
            (events.filter((e) => e.published).length / Math.max(events.length, 1)) *
                0.3,
            (attributes.filter((a) => a.to_ids).length /
                Math.max(attributes.length, 1)) *
                0.2,
        ];
        return (Math.min(1, factors.reduce((sum, factor) => sum + factor, 0)) * 100);
    }
    extractTags(events, attributes) {
        const tags = new Set();
        events.forEach((event) => {
            event.tags?.forEach((tag) => tags.add(tag.name));
        });
        attributes.forEach((attr) => {
            attr.tags?.forEach((tag) => tags.add(tag.name));
        });
        return Array.from(tags);
    }
    extractMalwareFamilies(events) {
        const families = new Set();
        events.forEach((event) => {
            event.tags?.forEach((tag) => {
                if (tag.name.includes('malware-family') ||
                    tag.name.includes('misp-galaxy:malware')) {
                    families.add(tag.name.split(':').pop() || tag.name);
                }
            });
        });
        return Array.from(families);
    }
    extractCampaigns(events) {
        const campaigns = new Set();
        events.forEach((event) => {
            event.tags?.forEach((tag) => {
                if (tag.name.includes('campaign') ||
                    tag.name.includes('misp-galaxy:threat-actor')) {
                    campaigns.add(tag.name.split(':').pop() || tag.name);
                }
            });
        });
        return Array.from(campaigns);
    }
    extractThreatActors(events) {
        const actors = new Set();
        events.forEach((event) => {
            event.tags?.forEach((tag) => {
                if (tag.name.includes('threat-actor') || tag.name.includes('apt')) {
                    actors.add(tag.name.split(':').pop() || tag.name);
                }
            });
        });
        return Array.from(actors);
    }
    extractTechniques(events) {
        const techniques = new Set();
        events.forEach((event) => {
            event.tags?.forEach((tag) => {
                if (tag.name.includes('mitre-attack') ||
                    tag.name.includes('technique')) {
                    techniques.add(tag.name.split(':').pop() || tag.name);
                }
            });
        });
        return Array.from(techniques);
    }
    async createThreatFeed(feed) {
        const newFeed = {
            ...feed,
            events: [],
            attributes: [],
        };
        this.feeds.set(feed.id, newFeed);
        if (feed.enabled) {
            await this.updateFeed(feed.id);
        }
        this.emit('feed_created', {
            feedId: feed.id,
            name: feed.name,
            enabled: feed.enabled,
            timestamp: new Date(),
        });
        return newFeed;
    }
    async updateFeed(feedId) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        try {
            // Simulate feed update by searching for recent events
            const query = {
                last: '7d',
                published: true,
                limit: 1000,
            };
            const events = await this.searchEvents(query);
            const attributes = await this.searchAttributes(query);
            feed.events = events;
            feed.attributes = attributes;
            feed.lastUpdated = new Date();
            feed.nextUpdate = new Date(Date.now() + feed.updateInterval * 1000);
            this.emit('feed_updated', {
                feedId,
                eventCount: events.length,
                attributeCount: attributes.length,
                timestamp: feed.lastUpdated,
            });
            return feed;
        }
        catch (error) {
            this.emit('feed_update_failed', {
                feedId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            throw error;
        }
    }
    async exportEvent(eventId, format) {
        const response = await this.makeRequest(`/events/view/${eventId}.${format}`);
        this.emit('event_exported', {
            eventId,
            format,
            timestamp: new Date(),
        });
        return typeof response === 'string' ? response : JSON.stringify(response);
    }
    async bulkImport(events) {
        const results = {
            success: 0,
            failed: 0,
            errors: [],
        };
        for (const event of events) {
            try {
                await this.createEvent(event);
                results.success++;
            }
            catch (error) {
                results.failed++;
                results.errors.push(error instanceof Error ? error.message : 'Unknown error');
            }
        }
        this.emit('bulk_import_completed', {
            totalEvents: events.length,
            successful: results.success,
            failed: results.failed,
            timestamp: new Date(),
        });
        return results;
    }
    getFeed(feedId) {
        return this.feeds.get(feedId);
    }
    listFeeds() {
        return Array.from(this.feeds.values());
    }
    getMetrics() {
        return { ...this.metrics };
    }
    clearCache() {
        this.enrichmentCache.clear();
        this.emit('cache_cleared', {
            timestamp: new Date(),
        });
    }
    async testConnection() {
        try {
            await this.makeRequest('/servers/getVersion');
            this.emit('connection_tested', {
                success: true,
                timestamp: new Date(),
            });
            return true;
        }
        catch (error) {
            this.emit('connection_tested', {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
            return false;
        }
    }
}
exports.MISPConnector = MISPConnector;
