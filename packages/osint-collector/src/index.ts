import axios from 'axios';
import { load } from 'cheerio';
import puppeteer from 'puppeteer';
import { OsintSource, OsintCollectionTask, CollectionResult } from './types.js';
import { logger } from '@intelgraph/config/logger.js';
import { metrics } from '@intelgraph/observability/metrics.js';

export class OsintCollector {
  private browserPromise: Promise<any> | null = null;

  /**
   * Collects data from a specified OSINT source based on the collection task
   */
  async collect(task: OsintCollectionTask, source: OsintSource): Promise<CollectionResult> {
    const startTime = Date.now();

    try {
      // Track collection metrics
      (metrics as any).osintCollectionAttempts.inc({ source: source.type, tenant: task.tenantId });

      let content: string;
      
      switch (source.type) {
        case 'social_media':
          content = await this.collectFromSocialMedia(task, source);
          break;
        case 'news':
          content = await this.collectFromNews(task, source);
          break;
        case 'forum':
          content = await this.collectFromForum(task, source);
          break;
        case 'government':
          content = await this.collectFromGovernment(task, source);
          break;
        case 'academic':
          content = await this.collectFromAcademic(task, source);
          break;
        case 'dark_web':
          content = await this.collectFromDarkWeb(task, source);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      const result: CollectionResult = {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId: source.id,
        collectedAt: new Date(),
        content,
        metadata: {
          sourceUrl: source.url,
          query: task.query,
          collectionMethod: source.type,
          wordCount: content.split(/\s+/).length,
          characterCount: content.length,
        },
        entities: [], // Will be populated by downstream processing
        relationships: [], // Will be populated by downstream processing
        tags: source.tags,
        tenantId: task.tenantId,
      };

      // Track successful collection
      (metrics as any).osintCollectionSuccesses.inc({ source: source.type, tenant: task.tenantId });
      (metrics as any).osintCollectionDuration.observe(Date.now() - startTime);

      logger.info('OSINT collection completed', {
        taskId: task.id,
        sourceId: source.id,
        sourceType: source.type,
        contentLength: content.length,
        duration: Date.now() - startTime,
        tenantId: task.tenantId,
      });

      return result;
    } catch (error: any) {
      // Track failed collection
      (metrics as any).osintCollectionFailures.inc({ source: source.type, tenant: task.tenantId });

      logger.error('OSINT collection failed', {
        taskId: task.id,
        sourceId: source.id,
        sourceType: source.type,
        error: error.message,
        stack: error.stack,
        tenantId: task.tenantId,
      });

      throw error;
    }
  }

  private async collectFromSocialMedia(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    // For social media, we might need specialized scrapers/APIs
    // Using Puppeteer for JavaScript-heavy sites
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Apply any custom scraping logic based on the source
      if (source.config?.selector) {
        const content = await page.$eval(source.config.selector, el => el.textContent || el.innerText);
        return content || '';
      } else {
        // Default: get the page content
        const content = await page.content();
        const $ = load(content);
        return $('body').text().trim();
      }
    } finally {
      // Don't close page to reuse browser instance
      // NOTE: Not closing page here since we're reusing browser
    }
  }

  private async collectFromNews(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelGraph OSINT Collector v1.0)'
      }
    });

    const $ = load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, footer, .advertisement, .ads').remove();
    
    // Extract article content - try common selectors
    const selectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '[class*="content"]',
      'main',
      'body'
    ];
    
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
    
    // Fallback to body
    return $('body').text().trim();
  }

  private async collectFromForum(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    const response = await axios.get(source.url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelGraph OSINT Collector v1.0)'
      }
    });

    const $ = load(response.data);
    
    // Remove navigation, ads, and other non-content elements
    $('script, style, nav, header, footer, .advertisement, .ads, .sidebar').remove();
    
    // Forum-specific selectors
    const contentSelectors = [
      '.post-content',
      '.thread-content',
      '.topic-content',
      '.message-body',
      '.content',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
    
    return $('body').text().trim();
  }

  private async collectFromGovernment(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    // Government sites often have specific structures
    const response = await axios.get(source.url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelGraph OSINT Collector v1.0); request for legitimate research purposes'
      }
    });

    const $ = load(response.data);
    
    // Remove navigation, ads, and other non-content elements
    $('script, style, nav, header, footer, .advertisement, .ads, .sidebar').remove();
    
    // Government-specific selectors
    const contentSelectors = [
      '.content-area',
      '.main-content',
      '.document-content',
      '.publication-content',
      '.press-release-content',
      '#content',
      'main',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
    
    return $('body').text().trim();
  }

  private async collectFromAcademic(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    const response = await axios.get(source.url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IntelGraph OSINT Collector v1.0); academic research purposes'
      }
    });

    const $ = load(response.data);
    
    // Remove navigation, ads, and other non-content elements
    $('script, style, nav, header, footer, .advertisement, .ads, .sidebar').remove();
    
    // Academic-specific selectors
    const contentSelectors = [
      '.abstract',
      '.article-content',
      '.paper-content',
      '.research-content',
      '.journal-content',
      '.publication-body',
      '#article',
      '#paper',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text().trim();
      }
    }
    
    return $('body').text().trim();
  }

  private async collectFromDarkWeb(task: OsintCollectionTask, source: OsintSource): Promise<string> {
    // This is a simulation - actual dark web collection would require Tor integration
    logger.warn('Dark web collection is simulated in this implementation', {
      sourceId: source.id,
      sourceUrl: source.url,
      tenantId: task.tenantId,
    });
    
    return `SIMULATED DARK WEB CONTENT FOR: ${source.url}\n\nThis is a placeholder for dark web collection. In production, this would integrate with secure onion routing protocols.`;
  }

  private async getBrowser() {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browserPromise;
  }

  /**
   * Validates if a source is properly configured for collection
   */
  validateSource(source: OsintSource): boolean {
    if (!source.id || !source.name || !source.url) {
      return false;
    }

    if (!['social_media', 'news', 'forum', 'dark_web', 'government', 'academic'].includes(source.type)) {
      return false;
    }

    return true;
  }

  /**
   * Cleans up resources
   */
  async cleanup() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }
}

export const osintCollector = new OsintCollector();