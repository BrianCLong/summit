/**
 * Type definitions for web scraper
 */

export interface ScrapeTask {
  id: string;
  url: string;
  method: 'static' | 'dynamic' | 'archive';
  options?: ScrapeOptions;
}

export interface ScrapeOptions {
  renderJavaScript?: boolean;
  waitForSelector?: string;
  waitForTimeout?: number;
  screenshot?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  extractMetadata?: boolean;
  respectRobotsTxt?: boolean;
  userAgent?: string;
  headers?: Record<string, string>;
  cookies?: Array<{ name: string; value: string; domain?: string }>;
  proxy?: string;
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface ScrapeResult {
  url: string;
  statusCode: number;
  success: boolean;
  timestamp: Date;
  content: {
    html?: string;
    text?: string;
    markdown?: string;
    title?: string;
    description?: string;
  };
  links?: Link[];
  images?: Image[];
  metadata?: Metadata;
  screenshot?: Buffer;
  technologies?: Technology[];
  performance?: {
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
  };
  error?: string;
}

export interface Link {
  href: string;
  text: string;
  type: 'internal' | 'external';
  rel?: string;
  target?: string;
}

export interface Image {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface Metadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishDate?: Date;
  modifiedDate?: Date;
  language?: string;
  canonical?: string;
  ogTags?: Record<string, string>;
  twitterTags?: Record<string, string>;
  jsonLd?: any[];
}

export interface Technology {
  name: string;
  category: string;
  version?: string;
  confidence: number;
  icon?: string;
  website?: string;
}

export interface ChangeDetection {
  url: string;
  previousChecksum: string;
  currentChecksum: string;
  changed: boolean;
  changedAt: Date;
  diff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

export interface RobotsTxt {
  url: string;
  content: string;
  rules: {
    userAgent: string;
    allow: string[];
    disallow: string[];
    crawlDelay?: number;
    sitemap?: string[];
  }[];
}

export interface Sitemap {
  url: string;
  locations: Array<{
    url: string;
    lastmod?: Date;
    changefreq?: string;
    priority?: number;
  }>;
}
