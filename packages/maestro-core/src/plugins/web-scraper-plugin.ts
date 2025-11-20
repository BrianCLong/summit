/**
 * Web Scraper Step Plugin
 * Provides compliant web scraping with rate limiting, robots.txt compliance, and proxy rotation
 */

import axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import { parse as parseRobotsTxt } from 'robots-txt-parser';
import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '../engine';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';

export interface WebScraperConfig {
  userAgent?: string;
  defaultDelay?: number; // ms between requests
  maxConcurrentRequests?: number;
  respectRobotsTxt?: boolean;
  enableProxyRotation?: boolean;
  proxies?: string[];
  timeout?: number;
  maxRetries?: number;
}

export interface WebScraperStepConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  data?: any;
  extract?: {
    type: 'text' | 'html' | 'json' | 'custom';
    selector?: string; // CSS selector for HTML extraction
    attribute?: string; // HTML attribute to extract
    regex?: string; // Regex pattern for text extraction
    jsonPath?: string; // JSON path for JSON extraction
    multiple?: boolean; // Extract all matches vs first match
  };
  processing?: {
    convertToMarkdown?: boolean;
    removeScripts?: boolean;
    removeStyles?: boolean;
    cleanWhitespace?: boolean;
    maxLength?: number;
  };
  rateLimiting?: {
    delay?: number; // Override default delay
    respectRetryAfter?: boolean;
  };
  validation?: {
    expectedStatusCodes?: number[];
    requiredContent?: string[];
    forbiddenContent?: string[];
  };
  caching?: {
    enabled?: boolean;
    ttlSeconds?: number;
    key?: string; // Custom cache key
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
  etag?: string;
}

export class WebScraperPlugin implements StepPlugin {
  name = 'web_scraper';
  private client: AxiosInstance;
  private config: WebScraperConfig;
  private robotsCache = new Map<string, any>();
  private cache = new Map<string, CacheEntry>();
  private requestQueue: Array<() => Promise<void>> = [];
  private activeRequests = 0;
  private lastRequestTime = 0;

  constructor(config: WebScraperConfig = {}) {
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

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
      },
      validateStatus: () => true, // Handle all status codes manually
    });
  }

  validate(config: any): void {
    const stepConfig = config as WebScraperStepConfig;

    if (!stepConfig.url) {
      throw new Error('Web scraper step requires url configuration');
    }

    // Validate URL format
    try {
      new URL(stepConfig.url);
    } catch (error) {
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
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${extract.regex}`);
        }
      }
    }

    // Validate rate limiting
    if (stepConfig.rateLimiting?.delay && stepConfig.rateLimiting.delay < 100) {
      console.warn('Rate limiting delay < 100ms may be too aggressive');
    }
  }

  async execute(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<{
    output?: any;
    cost_usd?: number;
    metadata?: Record<string, any>;
  }> {
    const stepConfig = step.config as WebScraperStepConfig;
    const url = new URL(stepConfig.url);

    try {
      // Check robots.txt compliance
      if (this.config.respectRobotsTxt) {
        const allowed = await this.checkRobotsAllowed(
          url,
          this.config.userAgent!,
        );
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
      const extractedData = await this.extractData(
        response.data,
        stepConfig,
        response.headers['content-type'],
      );

      // Cache the result if enabled
      if (stepConfig.caching?.enabled) {
        await this.updateCache(
          stepConfig,
          extractedData,
          response.headers.etag,
        );
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
    } catch (error) {
      throw new Error(`Web scraping failed: ${(error as Error).message}`);
    }
  }

  async compensate(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<void> {
    // Web scraping compensation might involve:
    // 1. Clearing cached data if it was corrupted
    // 2. Logging the compensation for audit trails
    // 3. Potentially notifying the target site (in extreme cases)

    const stepConfig = step.config as WebScraperStepConfig;

    if (stepConfig.caching?.enabled) {
      const cacheKey = this.getCacheKey(stepConfig);
      this.cache.delete(cacheKey);
    }

    console.log(`Web scraper compensation completed for ${stepConfig.url}`);
  }

  private async checkRobotsAllowed(
    url: URL,
    userAgent: string,
  ): Promise<boolean> {
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
        const robots = parseRobotsTxt(response.data);
        this.robotsCache.set(url.host, robots);

        // Cache for 1 hour
        setTimeout(() => this.robotsCache.delete(url.host), 3600000);

        return robots.isAllowed(userAgent, url.pathname);
      }

      // If robots.txt doesn't exist, assume allowed
      return true;
    } catch (error) {
      // If we can't fetch robots.txt, assume allowed but log warning
      console.warn(`Could not fetch robots.txt for ${url.host}:`, error);
      return true;
    }
  }

  private async applyRateLimiting(
    stepConfig: WebScraperStepConfig,
  ): Promise<void> {
    const delay = stepConfig.rateLimiting?.delay || this.config.defaultDelay!;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async makeRequest(stepConfig: WebScraperStepConfig): Promise<any> {
    const requestConfig: any = {
      method: stepConfig.method || 'GET',
      url: stepConfig.url,
      headers: {
        ...stepConfig.headers,
        Accept:
          'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
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
    if (
      this.config.enableProxyRotation &&
      this.config.proxies &&
      this.config.proxies.length > 0
    ) {
      const proxy = this.selectProxy();
      if (proxy) {
        requestConfig.proxy = proxy;
      }
    }

    let lastError;
    for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
      try {
        return await this.client(requestConfig);
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }

        // Handle rate limiting
        if (
          error.response?.status === 429 &&
          stepConfig.rateLimiting?.respectRetryAfter
        ) {
          const retryAfter = parseInt(
            error.response.headers['retry-after'] || '60',
          );
          console.log(`Rate limited, waiting ${retryAfter} seconds`);
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000),
          );
          continue;
        }

        // Exponential backoff for retries
        if (attempt < this.config.maxRetries!) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private validateResponse(
    response: any,
    stepConfig: WebScraperStepConfig,
  ): void {
    const expectedCodes = stepConfig.validation?.expectedStatusCodes || [200];

    if (!expectedCodes.includes(response.status)) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    // Check for required content
    if (stepConfig.validation?.requiredContent) {
      const content =
        typeof response.data === 'string'
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
      const content =
        typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

      for (const forbidden of stepConfig.validation.forbiddenContent) {
        if (content.includes(forbidden)) {
          throw new Error(`Forbidden content found: ${forbidden}`);
        }
      }
    }
  }

  private async extractData(
    data: any,
    stepConfig: WebScraperStepConfig,
    contentType?: string,
  ): Promise<any> {
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

  private extractText(data: string, extract: any): any {
    if (extract.regex) {
      const regex = new RegExp(extract.regex, 'g');
      const matches = [];
      let match;

      while ((match = regex.exec(data)) !== null) {
        matches.push(match[1] || match[0]);
        if (!extract.multiple) break;
      }

      return extract.multiple ? matches : matches[0];
    }

    return data;
  }

  private extractHtml(data: string, extract: any): any {
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
      } else {
        const element = elements.first();
        if (extract.attribute) {
          return element.attr(extract.attribute);
        }
        return element.text().trim();
      }
    }

    return $.text();
  }

  private extractJson(data: any, extract: any): any {
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;

    if (extract.jsonPath) {
      // Simple JSON path implementation
      const path = extract.jsonPath.split('.');
      let result = jsonData;

      for (const key of path) {
        if (result && typeof result === 'object') {
          result = result[key];
        } else {
          return undefined;
        }
      }

      return result;
    }

    return jsonData;
  }

  private extractCustom(data: string, extract: any): any {
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

  private processContent(content: any, stepConfig: WebScraperStepConfig): any {
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

  private convertToMarkdown(html: string): string {
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

  private checkCache(stepConfig: WebScraperStepConfig): any | null {
    const cacheKey = this.getCacheKey(stepConfig);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    const ttl = (stepConfig.caching?.ttlSeconds || 3600) * 1000;
    const expired = Date.now() - entry.timestamp > ttl;

    if (expired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  private updateCache(
    stepConfig: WebScraperStepConfig,
    data: any,
    etag?: string,
  ): void {
    const cacheKey = this.getCacheKey(stepConfig);

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  private getCacheKey(stepConfig: WebScraperStepConfig): string {
    if (stepConfig.caching?.key) {
      return stepConfig.caching.key;
    }

    const hash = createHash('sha256');
    hash.update(stepConfig.url);
    hash.update(JSON.stringify(stepConfig.extract || {}));
    hash.update(JSON.stringify(stepConfig.processing || {}));

    return hash.digest('hex').substring(0, 16);
  }

  private selectProxy(): any | null {
    if (!this.config.proxies || this.config.proxies.length === 0) {
      return null;
    }

    const proxy =
      this.config.proxies[
        Math.floor(Math.random() * this.config.proxies.length)
      ];
    const [host, port] = proxy.split(':');

    return {
      host,
      port: parseInt(port),
      protocol: 'http',
    };
  }

  private calculateCost(dataSize: number, durationMs: number): number {
    // Estimate cost based on bandwidth and processing time
    const bandwidthCost = (dataSize / (1024 * 1024)) * 0.001; // $0.001 per MB
    const processingCost = (durationMs / 1000) * 0.0001; // $0.0001 per second

    return bandwidthCost + processingCost;
  }

  private isPrivateUrl(url: URL): boolean {
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
      if (a === 10) return true;

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;
    }

    // Check for internal/private domains
    if (hostname.includes('.local') || hostname.includes('.internal')) {
      return true;
    }

    return false;
  }
}
