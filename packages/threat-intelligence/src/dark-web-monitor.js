"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DarkWebMonitorService = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Dark Web Monitoring Service
 * Monitors dark web forums, marketplaces, and paste sites for threat intelligence
 */
class DarkWebMonitorService {
    monitors = new Map();
    httpClient;
    scanIntervals = new Map();
    constructor() {
        this.httpClient = axios_1.default.create({
            timeout: 60000, // Longer timeout for Tor
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
    }
    /**
     * Register a new dark web monitor
     */
    async registerMonitor(monitor) {
        this.monitors.set(monitor.id, monitor);
        if (monitor.enabled) {
            await this.startMonitor(monitor.id);
        }
    }
    /**
     * Unregister a monitor
     */
    unregisterMonitor(monitorId) {
        this.stopMonitor(monitorId);
        this.monitors.delete(monitorId);
    }
    /**
     * Start monitoring
     */
    async startMonitor(monitorId) {
        const monitor = this.monitors.get(monitorId);
        if (!monitor) {
            throw new Error(`Monitor ${monitorId} not found`);
        }
        // Clear existing interval
        this.stopMonitor(monitorId);
        // Initial scan
        await this.scanSource(monitorId);
        // Schedule periodic scans
        const interval = setInterval(async () => {
            await this.scanSource(monitorId);
        }, monitor.scanFrequency * 1000);
        this.scanIntervals.set(monitorId, interval);
    }
    /**
     * Stop monitoring
     */
    stopMonitor(monitorId) {
        const interval = this.scanIntervals.get(monitorId);
        if (interval) {
            clearInterval(interval);
            this.scanIntervals.delete(monitorId);
        }
    }
    /**
     * Scan a dark web source
     */
    async scanSource(monitorId) {
        const monitor = this.monitors.get(monitorId);
        if (!monitor) {
            throw new Error(`Monitor ${monitorId} not found`);
        }
        try {
            const findings = await this.performScan(monitor);
            // Update last scan time
            monitor.lastScan = new Date().toISOString();
            return findings;
        }
        catch (error) {
            console.error(`Error scanning monitor ${monitorId}:`, error);
            throw error;
        }
    }
    /**
     * Perform the actual scan
     */
    async performScan(monitor) {
        switch (monitor.sourceType) {
            case 'FORUM':
                return this.scanForum(monitor);
            case 'MARKETPLACE':
                return this.scanMarketplace(monitor);
            case 'PASTE_SITE':
                return this.scanPasteSite(monitor);
            case 'CHAT':
                return this.scanChat(monitor);
            case 'BLOG':
                return this.scanBlog(monitor);
            case 'LEAK_SITE':
                return this.scanLeakSite(monitor);
            default:
                console.warn(`Unsupported source type: ${monitor.sourceType}`);
                return [];
        }
    }
    /**
     * Scan underground forum
     */
    async scanForum(monitor) {
        const findings = [];
        try {
            const config = {
                method: 'GET',
                url: monitor.url,
            };
            // Configure proxy if enabled
            if (monitor.proxyConfig?.enabled && monitor.proxyConfig.host) {
                config.proxy = {
                    host: monitor.proxyConfig.host,
                    port: monitor.proxyConfig.port || 9050,
                    protocol: monitor.proxyConfig.protocol || 'socks5',
                };
            }
            // Add authentication if provided
            if (monitor.credentials) {
                config.auth = {
                    username: monitor.credentials.username,
                    password: monitor.credentials.password,
                };
            }
            const response = await this.httpClient(config);
            const content = response.data;
            // Search for keywords in content
            const matchedKeywords = monitor.keywords.filter(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
            if (matchedKeywords.length > 0) {
                findings.push({
                    id: this.generateId(),
                    monitorId: monitor.id,
                    title: this.extractTitle(content) || 'Forum Post',
                    content: this.extractRelevantContent(content, monitor.keywords),
                    url: monitor.url,
                    author: this.extractAuthor(content),
                    timestamp: new Date().toISOString(),
                    keywords: matchedKeywords,
                    severity: this.calculateSeverity(matchedKeywords),
                    metadata: {
                        sourceType: 'FORUM',
                        fullContent: content,
                    },
                    analyzed: false,
                    relatedThreats: [],
                    createdAt: new Date().toISOString(),
                });
            }
        }
        catch (error) {
            console.error(`Error scanning forum ${monitor.url}:`, error);
        }
        return findings;
    }
    /**
     * Scan underground marketplace
     */
    async scanMarketplace(monitor) {
        const findings = [];
        try {
            const config = {
                method: 'GET',
                url: monitor.url,
            };
            if (monitor.proxyConfig?.enabled && monitor.proxyConfig.host) {
                config.proxy = {
                    host: monitor.proxyConfig.host,
                    port: monitor.proxyConfig.port || 9050,
                    protocol: monitor.proxyConfig.protocol || 'socks5',
                };
            }
            const response = await this.httpClient(config);
            const listings = this.parseMarketplaceListings(response.data);
            for (const listing of listings) {
                const matchedKeywords = monitor.keywords.filter(keyword => listing.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    listing.description.toLowerCase().includes(keyword.toLowerCase()));
                if (matchedKeywords.length > 0) {
                    findings.push({
                        id: this.generateId(),
                        monitorId: monitor.id,
                        title: listing.title,
                        content: listing.description,
                        url: listing.url,
                        author: listing.vendor,
                        timestamp: listing.posted || new Date().toISOString(),
                        keywords: matchedKeywords,
                        severity: this.calculateMarketplaceSeverity(listing, matchedKeywords),
                        metadata: {
                            sourceType: 'MARKETPLACE',
                            price: listing.price,
                            category: listing.category,
                            vendor: listing.vendor,
                            rating: listing.rating,
                        },
                        analyzed: false,
                        relatedThreats: [],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error scanning marketplace ${monitor.url}:`, error);
        }
        return findings;
    }
    /**
     * Scan paste sites (Pastebin, etc.)
     */
    async scanPasteSite(monitor) {
        const findings = [];
        try {
            const response = await this.httpClient.get(monitor.url);
            const pastes = this.parsePasteSite(response.data);
            for (const paste of pastes) {
                const matchedKeywords = monitor.keywords.filter(keyword => paste.content.toLowerCase().includes(keyword.toLowerCase()));
                if (matchedKeywords.length > 0) {
                    findings.push({
                        id: this.generateId(),
                        monitorId: monitor.id,
                        title: paste.title || 'Paste',
                        content: paste.content,
                        url: paste.url,
                        author: paste.author,
                        timestamp: paste.timestamp || new Date().toISOString(),
                        keywords: matchedKeywords,
                        severity: this.calculatePasteSeverity(paste, matchedKeywords),
                        metadata: {
                            sourceType: 'PASTE_SITE',
                            syntax: paste.syntax,
                            size: paste.content.length,
                        },
                        analyzed: false,
                        relatedThreats: [],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error scanning paste site ${monitor.url}:`, error);
        }
        return findings;
    }
    /**
     * Scan chat platforms (Telegram, Discord, etc.)
     */
    async scanChat(monitor) {
        // Implementation would integrate with chat platform APIs
        // This is a placeholder
        return [];
    }
    /**
     * Scan dark web blogs
     */
    async scanBlog(monitor) {
        const findings = [];
        try {
            const response = await this.httpClient.get(monitor.url);
            const posts = this.parseBlogPosts(response.data);
            for (const post of posts) {
                const matchedKeywords = monitor.keywords.filter(keyword => post.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    post.content.toLowerCase().includes(keyword.toLowerCase()));
                if (matchedKeywords.length > 0) {
                    findings.push({
                        id: this.generateId(),
                        monitorId: monitor.id,
                        title: post.title,
                        content: post.content,
                        url: post.url,
                        author: post.author,
                        timestamp: post.published || new Date().toISOString(),
                        keywords: matchedKeywords,
                        severity: 'MEDIUM',
                        metadata: {
                            sourceType: 'BLOG',
                            tags: post.tags,
                        },
                        analyzed: false,
                        relatedThreats: [],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error scanning blog ${monitor.url}:`, error);
        }
        return findings;
    }
    /**
     * Scan data leak sites
     */
    async scanLeakSite(monitor) {
        const findings = [];
        try {
            const response = await this.httpClient.get(monitor.url);
            const leaks = this.parseLeakSite(response.data);
            for (const leak of leaks) {
                const matchedKeywords = monitor.keywords.filter(keyword => leak.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    leak.description.toLowerCase().includes(keyword.toLowerCase()));
                if (matchedKeywords.length > 0) {
                    findings.push({
                        id: this.generateId(),
                        monitorId: monitor.id,
                        title: leak.title,
                        content: leak.description,
                        url: leak.url,
                        author: leak.group,
                        timestamp: leak.published || new Date().toISOString(),
                        keywords: matchedKeywords,
                        severity: 'CRITICAL',
                        metadata: {
                            sourceType: 'LEAK_SITE',
                            victim: leak.victim,
                            size: leak.size,
                            leaked: leak.leaked,
                        },
                        analyzed: false,
                        relatedThreats: [],
                        createdAt: new Date().toISOString(),
                    });
                }
            }
        }
        catch (error) {
            console.error(`Error scanning leak site ${monitor.url}:`, error);
        }
        return findings;
    }
    /**
     * Helper methods
     */
    generateId() {
        return `darkweb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    extractTitle(content) {
        // Simple title extraction - can be enhanced with proper HTML parsing
        const match = content.match(/<title>(.*?)<\/title>/i);
        return match?.[1];
    }
    extractAuthor(content) {
        // Basic author extraction
        const match = content.match(/by\s+([a-zA-Z0-9_-]+)/i);
        return match?.[1];
    }
    extractRelevantContent(content, keywords) {
        // Extract relevant snippets around keywords
        const snippets = [];
        for (const keyword of keywords) {
            const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                snippets.push(...matches);
            }
        }
        return snippets.join('\n...\n').substring(0, 2000);
    }
    calculateSeverity(keywords) {
        // High-risk keywords trigger higher severity
        const highRisk = ['exploit', 'zero-day', 'ransomware', 'breach', 'leak'];
        const hasHighRisk = keywords.some(k => highRisk.some(hr => k.toLowerCase().includes(hr)));
        return hasHighRisk ? 'CRITICAL' : 'MEDIUM';
    }
    calculateMarketplaceSeverity(listing, keywords) {
        // Data, credentials, and exploits are high severity
        if (listing.category?.toLowerCase().includes('data') ||
            listing.category?.toLowerCase().includes('credential') ||
            listing.category?.toLowerCase().includes('exploit')) {
            return 'HIGH';
        }
        return this.calculateSeverity(keywords);
    }
    calculatePasteSeverity(paste, keywords) {
        // Large pastes with credentials are critical
        if (paste.content.length > 10000 &&
            paste.content.match(/password|credential|token|api_key/gi)) {
            return 'CRITICAL';
        }
        return this.calculateSeverity(keywords);
    }
    parseMarketplaceListings(html) {
        // Placeholder - actual implementation would parse HTML
        return [];
    }
    parsePasteSite(html) {
        // Placeholder - actual implementation would parse paste API or HTML
        return [];
    }
    parseBlogPosts(html) {
        // Placeholder - actual implementation would parse blog HTML/RSS
        return [];
    }
    parseLeakSite(html) {
        // Placeholder - actual implementation would parse leak site data
        return [];
    }
    /**
     * Get all monitors
     */
    getMonitors() {
        return Array.from(this.monitors.values());
    }
    /**
     * Get a specific monitor
     */
    getMonitor(monitorId) {
        return this.monitors.get(monitorId);
    }
    /**
     * Cleanup
     */
    destroy() {
        for (const monitorId of this.scanIntervals.keys()) {
            this.stopMonitor(monitorId);
        }
        this.monitors.clear();
    }
}
exports.DarkWebMonitorService = DarkWebMonitorService;
