/**
 * Content Extractor - Extracts clean content from web pages
 */

import { parse } from 'node-html-parser';
import TurndownService from 'turndown';
import type { Metadata } from '../types/index.js';

export class ContentExtractor {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  /**
   * Extract clean text from HTML
   */
  extractText(html: string): string {
    const root = parse(html);

    // Remove script and style elements
    root.querySelectorAll('script, style, noscript').forEach(el => el.remove());

    return root.text.trim();
  }

  /**
   * Convert HTML to Markdown
   */
  extractMarkdown(html: string): string {
    return this.turndown.turndown(html);
  }

  /**
   * Extract article content using readability-like algorithm
   */
  extractArticle(html: string): {
    title?: string;
    content: string;
    excerpt?: string;
  } {
    const root = parse(html);

    // Find main content areas
    const candidates = [
      root.querySelector('article'),
      root.querySelector('[role="main"]'),
      root.querySelector('main'),
      root.querySelector('.content'),
      root.querySelector('#content'),
      root.querySelector('.post'),
      root.querySelector('.article')
    ].filter(Boolean);

    const mainContent = candidates[0] || root;

    // Extract title
    const title =
      mainContent.querySelector('h1')?.text ||
      root.querySelector('title')?.text;

    // Remove unwanted elements
    mainContent
      .querySelectorAll(
        'script, style, nav, header, footer, aside, .sidebar, .advertisement'
      )
      .forEach(el => el.remove());

    const content = mainContent.text.trim();
    const excerpt = content.substring(0, 200);

    return {
      title,
      content,
      excerpt
    };
  }

  /**
   * Extract metadata from HTML
   */
  extractMetadata(html: string, url: string): Metadata {
    const root = parse(html);
    const metadata: Metadata = {};

    // Title
    metadata.title =
      root.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      root.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
      root.querySelector('title')?.text;

    // Description
    metadata.description =
      root.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      root.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
      root.querySelector('meta[name="description"]')?.getAttribute('content');

    // Keywords
    const keywordsStr = root.querySelector('meta[name="keywords"]')?.getAttribute('content');
    if (keywordsStr) {
      metadata.keywords = keywordsStr.split(',').map(k => k.trim());
    }

    // Author
    metadata.author =
      root.querySelector('meta[name="author"]')?.getAttribute('content') ||
      root.querySelector('meta[property="article:author"]')?.getAttribute('content');

    // Dates
    const publishDate = root.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
    if (publishDate) {
      metadata.publishDate = new Date(publishDate);
    }

    const modifiedDate = root.querySelector('meta[property="article:modified_time"]')?.getAttribute('content');
    if (modifiedDate) {
      metadata.modifiedDate = new Date(modifiedDate);
    }

    // Language
    metadata.language =
      root.querySelector('html')?.getAttribute('lang') ||
      root.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content');

    // Canonical URL
    metadata.canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');

    // Open Graph tags
    metadata.ogTags = {};
    root.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const property = meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (property && content) {
        metadata.ogTags![property] = content;
      }
    });

    // Twitter Card tags
    metadata.twitterTags = {};
    root.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) {
        metadata.twitterTags![name] = content;
      }
    });

    // JSON-LD structured data
    metadata.jsonLd = [];
    root.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.text);
        metadata.jsonLd!.push(data);
      } catch (e) {
        // Invalid JSON-LD
      }
    });

    return metadata;
  }

  /**
   * Extract all links from HTML
   */
  extractLinks(html: string, baseUrl: string): Array<{
    href: string;
    text: string;
    type: 'internal' | 'external';
  }> {
    const root = parse(html);
    const links: Array<{ href: string; text: string; type: 'internal' | 'external' }> = [];
    const baseUrlObj = new URL(baseUrl);

    root.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const linkUrlObj = new URL(absoluteUrl);
        const type = linkUrlObj.hostname === baseUrlObj.hostname ? 'internal' : 'external';

        links.push({
          href: absoluteUrl,
          text: anchor.text.trim(),
          type
        });
      } catch (e) {
        // Invalid URL
      }
    });

    return links;
  }

  /**
   * Extract all images from HTML
   */
  extractImages(html: string, baseUrl: string): Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  }> {
    const root = parse(html);
    const images: Array<{ src: string; alt?: string; width?: number; height?: number }> = [];

    root.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (!src) return;

      try {
        const absoluteSrc = new URL(src, baseUrl).toString();
        const alt = img.getAttribute('alt') || undefined;
        const width = img.getAttribute('width') ? parseInt(img.getAttribute('width')!) : undefined;
        const height = img.getAttribute('height') ? parseInt(img.getAttribute('height')!) : undefined;

        images.push({ src: absoluteSrc, alt, width, height });
      } catch (e) {
        // Invalid URL
      }
    });

    return images;
  }
}
