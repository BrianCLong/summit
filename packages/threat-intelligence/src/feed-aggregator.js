"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatFeedAggregator = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Threat Feed Aggregator
 * Collects threat intelligence from multiple sources
 */
class ThreatFeedAggregator {
    feeds = new Map();
    httpClient;
    syncIntervals = new Map();
    constructor() {
        this.httpClient = axios_1.default.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'IntelGraph-ThreatIntel/1.0',
            },
        });
    }
    /**
     * Register a new threat feed
     */
    async registerFeed(feed) {
        this.feeds.set(feed.id, feed);
        if (feed.enabled) {
            await this.startFeedSync(feed.id);
        }
    }
    /**
     * Unregister a threat feed
     */
    unregisterFeed(feedId) {
        this.stopFeedSync(feedId);
        this.feeds.delete(feedId);
    }
    /**
     * Start automatic sync for a feed
     */
    async startFeedSync(feedId) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        // Clear existing interval if any
        this.stopFeedSync(feedId);
        // Initial sync
        await this.syncFeed(feedId);
        // Schedule periodic sync
        const interval = setInterval(async () => {
            await this.syncFeed(feedId);
        }, feed.refreshInterval * 1000);
        this.syncIntervals.set(feedId, interval);
    }
    /**
     * Stop automatic sync for a feed
     */
    stopFeedSync(feedId) {
        const interval = this.syncIntervals.get(feedId);
        if (interval) {
            clearInterval(interval);
            this.syncIntervals.delete(feedId);
        }
    }
    /**
     * Sync a specific feed
     */
    async syncFeed(feedId) {
        const feed = this.feeds.get(feedId);
        if (!feed) {
            throw new Error(`Feed ${feedId} not found`);
        }
        try {
            const threats = await this.fetchFeedData(feed);
            // Update last sync time
            feed.lastSync = new Date().toISOString();
            return threats;
        }
        catch (error) {
            console.error(`Error syncing feed ${feedId}:`, error);
            throw error;
        }
    }
    /**
     * Fetch data from a threat feed
     */
    async fetchFeedData(feed) {
        switch (feed.source) {
            case 'COMMERCIAL':
                return this.fetchCommercialFeed(feed);
            case 'OSINT':
                return this.fetchOsintFeed(feed);
            case 'STIX_TAXII':
                return this.fetchStixTaxiiFeed(feed);
            case 'CVE_NVD':
                return this.fetchCveFeed(feed);
            case 'EXPLOIT_DB':
                return this.fetchExploitDbFeed(feed);
            default:
                console.warn(`Unsupported feed source: ${feed.source}`);
                return [];
        }
    }
    /**
     * Fetch from commercial threat intelligence providers
     */
    async fetchCommercialFeed(feed) {
        if (!feed.url || !feed.apiKey) {
            throw new Error('Commercial feed requires URL and API key');
        }
        const response = await this.httpClient.get(feed.url, {
            headers: {
                'Authorization': `Bearer ${feed.apiKey}`,
            },
        });
        return this.parseCommercialFeed(response.data, feed);
    }
    /**
     * Fetch from open source intelligence feeds
     */
    async fetchOsintFeed(feed) {
        if (!feed.url) {
            throw new Error('OSINT feed requires URL');
        }
        const response = await this.httpClient.get(feed.url);
        return this.parseOsintFeed(response.data, feed);
    }
    /**
     * Fetch from STIX/TAXII servers
     */
    async fetchStixTaxiiFeed(feed) {
        if (!feed.url) {
            throw new Error('STIX/TAXII feed requires URL');
        }
        const headers = {
            'Accept': 'application/taxii+json;version=2.1',
        };
        if (feed.apiKey) {
            headers['Authorization'] = `Bearer ${feed.apiKey}`;
        }
        const response = await this.httpClient.get(feed.url, { headers });
        return this.parseStixFeed(response.data, feed);
    }
    /**
     * Fetch CVE data from NVD
     */
    async fetchCveFeed(feed) {
        const nvdUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
        const params = {};
        if (feed.apiKey) {
            params['apiKey'] = feed.apiKey;
        }
        const response = await this.httpClient.get(nvdUrl, { params });
        return this.parseCveFeed(response.data, feed);
    }
    /**
     * Fetch from Exploit-DB
     */
    async fetchExploitDbFeed(feed) {
        const exploitDbUrl = 'https://www.exploit-db.com/exploits.json';
        const response = await this.httpClient.get(exploitDbUrl);
        return this.parseExploitDbFeed(response.data, feed);
    }
    /**
     * Parse commercial feed data
     */
    parseCommercialFeed(data, feed) {
        // Implementation varies by provider
        // This is a generic example
        const threats = [];
        if (Array.isArray(data.threats)) {
            for (const item of data.threats) {
                threats.push({
                    id: item.id || this.generateId(),
                    feedId: feed.id,
                    title: item.title || 'Unknown Threat',
                    description: item.description || '',
                    severity: item.severity || 'MEDIUM',
                    type: item.type || 'MALWARE',
                    tlp: item.tlp || feed.tlp,
                    iocs: item.iocs || [],
                    tags: item.tags || [],
                    confidence: item.confidence || 50,
                    source: {
                        name: feed.name,
                        url: feed.url,
                        feedId: feed.id,
                    },
                    firstSeen: item.firstSeen || new Date().toISOString(),
                    lastSeen: item.lastSeen || new Date().toISOString(),
                    expiresAt: item.expiresAt,
                    metadata: item.metadata,
                    relatedThreats: item.relatedThreats || [],
                    mitreTactics: item.mitreTactics || [],
                    mitreTechniques: item.mitreTechniques || [],
                    tenantId: 'default',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
        return threats;
    }
    /**
     * Parse OSINT feed data
     */
    parseOsintFeed(data, feed) {
        // OSINT feeds often come in various formats (CSV, JSON, etc.)
        // This is a basic JSON parser
        const threats = [];
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
            threats.push({
                id: this.generateId(),
                feedId: feed.id,
                title: item.title || item.name || 'OSINT Finding',
                description: item.description || item.summary || '',
                severity: this.mapSeverity(item.severity || item.risk),
                type: this.mapThreatType(item.type || item.category),
                tlp: feed.tlp,
                iocs: this.extractIocs(item),
                tags: item.tags || [],
                confidence: parseInt(item.confidence) || 60,
                source: {
                    name: feed.name,
                    url: item.source_url || feed.url,
                    feedId: feed.id,
                },
                firstSeen: item.first_seen || new Date().toISOString(),
                lastSeen: item.last_seen || new Date().toISOString(),
                metadata: item,
                relatedThreats: [],
                mitreTactics: item.mitre_tactics || [],
                mitreTechniques: item.mitre_techniques || [],
                tenantId: 'default',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        return threats;
    }
    /**
     * Parse STIX feed data
     */
    parseStixFeed(data, feed) {
        const threats = [];
        if (data.objects && Array.isArray(data.objects)) {
            for (const obj of data.objects) {
                if (obj.type === 'indicator' || obj.type === 'malware' || obj.type === 'threat-actor') {
                    threats.push({
                        id: obj.id,
                        feedId: feed.id,
                        title: obj.name || 'STIX Object',
                        description: obj.description || '',
                        severity: this.mapSeverity(obj.threat_level),
                        type: this.mapStixType(obj.type),
                        tlp: feed.tlp,
                        iocs: this.extractStixIndicators(obj),
                        tags: obj.labels || [],
                        confidence: obj.confidence || 70,
                        source: {
                            name: feed.name,
                            url: feed.url,
                            feedId: feed.id,
                        },
                        firstSeen: obj.created || new Date().toISOString(),
                        lastSeen: obj.modified || new Date().toISOString(),
                        metadata: obj,
                        relatedThreats: [],
                        mitreTactics: [],
                        mitreTechniques: [],
                        tenantId: 'default',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            }
        }
        return threats;
    }
    /**
     * Parse CVE feed data
     */
    parseCveFeed(data, feed) {
        const threats = [];
        if (data.vulnerabilities && Array.isArray(data.vulnerabilities)) {
            for (const vuln of data.vulnerabilities) {
                const cve = vuln.cve;
                threats.push({
                    id: cve.id,
                    feedId: feed.id,
                    title: cve.id,
                    description: cve.descriptions?.[0]?.value || '',
                    severity: this.mapCvssToSeverity(cve.metrics),
                    type: 'VULNERABILITY',
                    tlp: 'WHITE',
                    iocs: [],
                    tags: cve.references?.map((r) => r.tags || []).flat() || [],
                    confidence: 90,
                    source: {
                        name: 'NVD',
                        url: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
                        feedId: feed.id,
                    },
                    firstSeen: cve.published || new Date().toISOString(),
                    lastSeen: cve.lastModified || new Date().toISOString(),
                    metadata: cve,
                    relatedThreats: [],
                    mitreTactics: [],
                    mitreTechniques: [],
                    tenantId: 'default',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
        return threats;
    }
    /**
     * Parse Exploit-DB feed data
     */
    parseExploitDbFeed(data, feed) {
        const threats = [];
        if (Array.isArray(data)) {
            for (const exploit of data) {
                threats.push({
                    id: `exploit-db-${exploit.id}`,
                    feedId: feed.id,
                    title: exploit.description || 'Exploit',
                    description: exploit.description || '',
                    severity: 'HIGH',
                    type: 'EXPLOIT',
                    tlp: 'WHITE',
                    iocs: [],
                    tags: [exploit.platform, exploit.type].filter(Boolean),
                    confidence: 95,
                    source: {
                        name: 'Exploit-DB',
                        url: `https://www.exploit-db.com/exploits/${exploit.id}`,
                        feedId: feed.id,
                    },
                    firstSeen: exploit.date_published || new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    metadata: exploit,
                    relatedThreats: [],
                    mitreTactics: [],
                    mitreTechniques: [],
                    tenantId: 'default',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
        return threats;
    }
    /**
     * Helper methods
     */
    generateId() {
        return `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    mapSeverity(severity) {
        if (!severity)
            return 'MEDIUM';
        const s = severity.toLowerCase();
        if (s.includes('critical') || s.includes('urgent'))
            return 'CRITICAL';
        if (s.includes('high'))
            return 'HIGH';
        if (s.includes('medium') || s.includes('moderate'))
            return 'MEDIUM';
        if (s.includes('low'))
            return 'LOW';
        return 'INFO';
    }
    mapThreatType(type) {
        if (!type)
            return 'MALWARE';
        const t = type.toLowerCase();
        if (t.includes('phish'))
            return 'PHISHING';
        if (t.includes('ransom'))
            return 'RANSOMWARE';
        if (t.includes('apt') || t.includes('advanced'))
            return 'APT';
        if (t.includes('exploit'))
            return 'EXPLOIT';
        if (t.includes('vuln'))
            return 'VULNERABILITY';
        if (t.includes('botnet'))
            return 'BOTNET';
        if (t.includes('c2') || t.includes('command'))
            return 'C2';
        if (t.includes('leak'))
            return 'DATA_LEAK';
        if (t.includes('cred'))
            return 'CREDENTIAL_DUMP';
        return 'MALWARE';
    }
    mapStixType(type) {
        switch (type) {
            case 'malware': return 'MALWARE';
            case 'threat-actor': return 'THREAT_ACTOR';
            case 'campaign': return 'APT';
            case 'indicator': return 'MALWARE';
            default: return 'MALWARE';
        }
    }
    extractIocs(item) {
        const iocs = [];
        if (item.iocs) {
            if (Array.isArray(item.iocs)) {
                iocs.push(...item.iocs);
            }
        }
        if (item.indicators) {
            if (Array.isArray(item.indicators)) {
                iocs.push(...item.indicators);
            }
        }
        return iocs;
    }
    extractStixIndicators(obj) {
        const iocs = [];
        if (obj.pattern) {
            iocs.push(obj.pattern);
        }
        return iocs;
    }
    mapCvssToSeverity(metrics) {
        const score = metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
            metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ||
            metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore ||
            0;
        if (score >= 9.0)
            return 'CRITICAL';
        if (score >= 7.0)
            return 'HIGH';
        if (score >= 4.0)
            return 'MEDIUM';
        if (score > 0)
            return 'LOW';
        return 'INFO';
    }
    /**
     * Get all registered feeds
     */
    getFeeds() {
        return Array.from(this.feeds.values());
    }
    /**
     * Get a specific feed
     */
    getFeed(feedId) {
        return this.feeds.get(feedId);
    }
    /**
     * Cleanup
     */
    destroy() {
        for (const feedId of this.syncIntervals.keys()) {
            this.stopFeedSync(feedId);
        }
        this.feeds.clear();
    }
}
exports.ThreatFeedAggregator = ThreatFeedAggregator;
