"use strict";
/**
 * Web Scraper Step Plugin
 * Provides compliant web scraping with rate limiting, robots.txt compliance, and proxy rotation
 */
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
exports.WebScraperPlugin = void 0;
const axios_1 = __importDefault(require("axios"));
const robots_txt_parser_1 = require("robots-txt-parser");
const cheerio = __importStar(require("cheerio"));
const crypto_1 = require("crypto");
class WebScraperPlugin {
    name = 'web_scraper';
    client;
    config;
    robotsCache = new Map();
    cache = new Map();
    requestQueue = [];
    activeRequests = 0;
    lastRequestTime = 0;
    constructor(config = {}) {
        this.config = {
            userAgent: 'Maestro Web Scraper/1.0 (+https://maestro.dev/bot)',
            defaultDelay: 1000,
            maxConcurrentRequests: 3,
            respectRobotsTxt: true,
            enableProxyRotation: false,
            timeout: 30000,
            maxRetries: 3,
            ...config,
        };
        this.client = axios_1.default.create({
            timeout: this.config.timeout,
            headers: {
                'User-Agent': this.config.userAgent,
            },
            validateStatus: () => true, // Handle all status codes manually
        });
    }
    validate(config) {
        const stepConfig = config;
        if (!stepConfig.url) {
            throw new Error('Web scraper step requires url configuration');
        }
        // Validate URL format
        try {
            new URL(stepConfig.url);
        }
        catch (error) {
            throw new Error(`Invalid URL format: ${stepConfig.url}`);
        }
        // Security validations
        const url = new URL(stepConfig.url);
        // Block dangerous protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error(`Unsupported protocol: ${url.protocol}`);
        }
        // Block localhost and private networks for security
        if (this.isPrivateUrl(url)) {
            throw new Error('Cannot scrape private/internal URLs');
        }
        // Validate extraction configuration
        if (stepConfig.extract) {
            const extract = stepConfig.extract;
            if (extract.type === 'custom' && !extract.regex && !extract.selector) {
                throw new Error('Custom extraction requires either regex or selector');
            }
            if (extract.regex) {
                try {
                    new RegExp(extract.regex);
                }
                catch (error) {
                    throw new Error(`Invalid regex pattern: ${extract.regex}`);
                }
            }
        }
        // Validate rate limiting
        if (stepConfig.rateLimiting?.delay && stepConfig.rateLimiting.delay < 100) {
            console.warn('Rate limiting delay < 100ms may be too aggressive');
        }
    }
    async execute(context, step, execution) {
        const stepConfig = step.config;
        const url = new URL(stepConfig.url);
        try {
            // Check robots.txt compliance
            if (this.config.respectRobotsTxt) {
                const allowed = await this.checkRobotsAllowed(url, this.config.userAgent);
                if (!allowed) {
                    throw new Error(`Robots.txt disallows scraping ${stepConfig.url}`);
                }
            }
            // Check cache first
            let data;
            if (stepConfig.caching?.enabled) {
                data = await this.checkCache(stepConfig);
                if (data) {
                    return {
                        output: data,
                        cost_usd: 0,
                        metadata: {
                            cached: true,
                            url: stepConfig.url,
                            timestamp: new Date().toISOString(),
                        },
                    };
                }
            }
            // Apply rate limiting
            await this.applyRateLimiting(stepConfig);
            // Make the HTTP request
            const startTime = Date.now();
            const response = await this.makeRequest(stepConfig);
            const duration = Date.now() - startTime;
            // Validate response
            this.validateResponse(response, stepConfig);
            // Process and extract data
            const extractedData = await this.extractData(response.data, stepConfig, response.headers['content-type']);
            // Cache the result if enabled
            if (stepConfig.caching?.enabled) {
                await this.updateCache(stepConfig, extractedData, response.headers.etag);
            }
            // Calculate cost (bandwidth + processing time)
            const cost_usd = this.calculateCost(response.data.length, duration);
            return {
                output: extractedData,
                cost_usd,
                metadata: {
                    url: stepConfig.url,
                    statusCode: response.status,
                    contentType: response.headers['content-type'],
                    contentLength: response.data.length,
                    duration_ms: duration,
                    cached: false,
                    timestamp: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            throw new Error(`Web scraping failed: ${error.message}`);
        }
    }
    async compensate(context, step, execution) {
        // Web scraping compensation might involve:
        // 1. Clearing cached data if it was corrupted
        // 2. Logging the compensation for audit trails
        // 3. Potentially notifying the target site (in extreme cases)
        const stepConfig = step.config;
        if (stepConfig.caching?.enabled) {
            const cacheKey = this.getCacheKey(stepConfig);
            this.cache.delete(cacheKey);
        }
        console.log(`Web scraper compensation completed for ${stepConfig.url}`);
    }
    async checkRobotsAllowed(url, userAgent) {
        const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
        try {
            // Check cache first
            if (this.robotsCache.has(url.host)) {
                const robots = this.robotsCache.get(url.host);
                return robots.isAllowed(userAgent, url.pathname);
            }
            // Fetch robots.txt
            const response = await this.client.get(robotsUrl, {
                timeout: 5000,
                headers: { 'User-Agent': userAgent },
            });
            if (response.status === 200) {
                const robots = (0, robots_txt_parser_1.parse)(response.data);
                this.robotsCache.set(url.host, robots);
                // Cache for 1 hour
                setTimeout(() => this.robotsCache.delete(url.host), 3600000);
                return robots.isAllowed(userAgent, url.pathname);
            }
            // If robots.txt doesn't exist, assume allowed
            return true;
        }
        catch (error) {
            // If we can't fetch robots.txt, assume allowed but log warning
            console.warn(`Could not fetch robots.txt for ${url.host}:`, error);
            return true;
        }
    }
    async applyRateLimiting(stepConfig) {
        const delay = stepConfig.rateLimiting?.delay || this.config.defaultDelay;
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < delay) {
            const waitTime = delay - timeSinceLastRequest;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();
    }
    async makeRequest(stepConfig) {
        const requestConfig = {
            method: stepConfig.method || 'GET',
            url: stepConfig.url,
            headers: {
                ...stepConfig.headers,
                Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                DNT: '1',
                Connection: 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        };
        if (stepConfig.data) {
            requestConfig.data = stepConfig.data;
        }
        // Add proxy if proxy rotation is enabled
        if (this.config.enableProxyRotation &&
            this.config.proxies &&
            this.config.proxies.length > 0) {
            const proxy = this.selectProxy();
            if (proxy) {
                requestConfig.proxy = proxy;
            }
        }
        let lastError;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await this.client(requestConfig);
            }
            catch (error) {
                lastError = error;
                // Don't retry on client errors (4xx)
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    break;
                }
                // Handle rate limiting
                if (error.response?.status === 429 &&
                    stepConfig.rateLimiting?.respectRetryAfter) {
                    const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
                    console.log(`Rate limited, waiting ${retryAfter} seconds`);
                    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
                // Exponential backoff for retries
                if (attempt < this.config.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
    validateResponse(response, stepConfig) {
        const expectedCodes = stepConfig.validation?.expectedStatusCodes || [200];
        if (!expectedCodes.includes(response.status)) {
            throw new Error(`Unexpected status code: ${response.status}`);
        }
        // Check for required content
        if (stepConfig.validation?.requiredContent) {
            const content = typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data);
            for (const required of stepConfig.validation.requiredContent) {
                if (!content.includes(required)) {
                    throw new Error(`Required content not found: ${required}`);
                }
            }
        }
        // Check for forbidden content
        if (stepConfig.validation?.forbiddenContent) {
            const content = typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data);
            for (const forbidden of stepConfig.validation.forbiddenContent) {
                if (content.includes(forbidden)) {
                    throw new Error(`Forbidden content found: ${forbidden}`);
                }
            }
        }
    }
    async extractData(data, stepConfig, contentType) {
        if (!stepConfig.extract) {
            return this.processContent(data, stepConfig);
        }
        const extract = stepConfig.extract;
        switch (extract.type) {
            case 'text':
                return this.extractText(data, extract);
            case 'html':
                return this.extractHtml(data, extract);
            case 'json':
                return this.extractJson(data, extract);
            case 'custom':
                return this.extractCustom(data, extract);
            default:
                return this.processContent(data, stepConfig);
        }
    }
    extractText(data, extract) {
        if (extract.regex) {
            const regex = new RegExp(extract.regex, 'g');
            const matches = [];
            let match;
            while ((match = regex.exec(data)) !== null) {
                matches.push(match[1] || match[0]);
                if (!extract.multiple)
                    break;
            }
            return extract.multiple ? matches : matches[0];
        }
        return data;
    }
    extractHtml(data, extract) {
        const $ = cheerio.load(data);
        if (extract.selector) {
            const elements = $(extract.selector);
            if (extract.multiple) {
                return elements.toArray().map((el) => {
                    if (extract.attribute) {
                        return $(el).attr(extract.attribute);
                    }
                    return $(el).text().trim();
                });
            }
            else {
                const element = elements.first();
                if (extract.attribute) {
                    return element.attr(extract.attribute);
                }
                return element.text().trim();
            }
        }
        return $.text();
    }
    extractJson(data, extract) {
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        if (extract.jsonPath) {
            // Simple JSON path implementation
            const path = extract.jsonPath.split('.');
            let result = jsonData;
            for (const key of path) {
                if (result && typeof result === 'object') {
                    result = result[key];
                }
                else {
                    return undefined;
                }
            }
            return result;
        }
        return jsonData;
    }
    extractCustom(data, extract) {
        // Combine multiple extraction methods
        let result = data;
        if (extract.selector) {
            result = this.extractHtml(result, extract);
        }
        if (extract.regex) {
            result = this.extractText(result, extract);
        }
        return result;
    }
    processContent(content, stepConfig) {
        if (!stepConfig.processing || typeof content !== 'string') {
            return content;
        }
        let processed = content;
        const processing = stepConfig.processing;
        // Remove scripts and styles
        if (processing.removeScripts || processing.removeStyles) {
            const $ = cheerio.load(processed);
            if (processing.removeScripts) {
                $('script').remove();
            }
            if (processing.removeStyles) {
                $('style, link[rel="stylesheet"]').remove();
            }
            processed = $.html();
        }
        // Convert to markdown
        if (processing.convertToMarkdown) {
            processed = this.convertToMarkdown(processed);
        }
        // Clean whitespace
        if (processing.cleanWhitespace) {
            processed = processed.replace(/\s+/g, ' ').trim();
        }
        // Truncate if needed
        if (processing.maxLength && processed.length > processing.maxLength) {
            processed = processed.substring(0, processing.maxLength) + '...';
        }
        return processed;
    }
    convertToMarkdown(html) {
        // Basic HTML to Markdown conversion
        const $ = cheerio.load(html);
        // Headers
        $('h1').each((_, el) => {
            $(el).replaceWith(`\n# ${$(el).text()}\n`);
        });
        $('h2').each((_, el) => {
            $(el).replaceWith(`\n## ${$(el).text()}\n`);
        });
        $('h3').each((_, el) => {
            $(el).replaceWith(`\n### ${$(el).text()}\n`);
        });
        // Links
        $('a').each((_, el) => {
            const text = $(el).text();
            const href = $(el).attr('href');
            if (href) {
                $(el).replaceWith(`[${text}](${href})`);
            }
        });
        // Bold and italic
        $('strong, b').each((_, el) => {
            $(el).replaceWith(`**${$(el).text()}**`);
        });
        $('em, i').each((_, el) => {
            $(el).replaceWith(`*${$(el).text()}*`);
        });
        // Paragraphs
        $('p').each((_, el) => {
            $(el).replaceWith(`\n${$(el).text()}\n`);
        });
        return $.text();
    }
    checkCache(stepConfig) {
        const cacheKey = this.getCacheKey(stepConfig);
        const entry = this.cache.get(cacheKey);
        if (!entry)
            return null;
        const ttl = (stepConfig.caching?.ttlSeconds || 3600) * 1000;
        const expired = Date.now() - entry.timestamp > ttl;
        if (expired) {
            this.cache.delete(cacheKey);
            return null;
        }
        return entry.data;
    }
    updateCache(stepConfig, data, etag) {
        const cacheKey = this.getCacheKey(stepConfig);
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            etag,
        });
    }
    getCacheKey(stepConfig) {
        if (stepConfig.caching?.key) {
            return stepConfig.caching.key;
        }
        const hash = (0, crypto_1.createHash)('sha256');
        hash.update(stepConfig.url);
        hash.update(JSON.stringify(stepConfig.extract || {}));
        hash.update(JSON.stringify(stepConfig.processing || {}));
        return hash.digest('hex').substring(0, 16);
    }
    selectProxy() {
        if (!this.config.proxies || this.config.proxies.length === 0) {
            return null;
        }
        const proxy = this.config.proxies[Math.floor(Math.random() * this.config.proxies.length)];
        const [host, port] = proxy.split(':');
        return {
            host,
            port: parseInt(port),
            protocol: 'http',
        };
    }
    calculateCost(dataSize, durationMs) {
        // Estimate cost based on bandwidth and processing time
        const bandwidthCost = (dataSize / (1024 * 1024)) * 0.001; // $0.001 per MB
        const processingCost = (durationMs / 1000) * 0.0001; // $0.0001 per second
        return bandwidthCost + processingCost;
    }
    isPrivateUrl(url) {
        const hostname = url.hostname.toLowerCase();
        // Check for localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return true;
        }
        // Check for private IP ranges
        const ip = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ip) {
            const [, a, b, c, d] = ip.map(Number);
            // 10.0.0.0/8
            if (a === 10)
                return true;
            // 172.16.0.0/12
            if (a === 172 && b >= 16 && b <= 31)
                return true;
            // 192.168.0.0/16
            if (a === 192 && b === 168)
                return true;
        }
        // Check for internal/private domains
        if (hostname.includes('.local') || hostname.includes('.internal')) {
            return true;
        }
        return false;
    }
}
exports.WebScraperPlugin = WebScraperPlugin;
