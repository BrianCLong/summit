/**
 * Link Analyzer - Analyzes links and creates relationship maps
 */

import type { Link } from '../types/index.js';

export interface LinkAnalysis {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  uniqueDomains: string[];
  brokenLinks: string[];
  linkGraph: Map<string, string[]>;
}

export class LinkAnalyzer {
  /**
   * Analyze links from a page
   */
  analyze(links: Link[]): LinkAnalysis {
    const analysis: LinkAnalysis = {
      totalLinks: links.length,
      internalLinks: links.filter(l => l.type === 'internal').length,
      externalLinks: links.filter(l => l.type === 'external').length,
      uniqueDomains: [],
      brokenLinks: [],
      linkGraph: new Map()
    };

    // Extract unique domains
    const domains = new Set<string>();
    for (const link of links) {
      try {
        const url = new URL(link.href);
        domains.add(url.hostname);
      } catch (e) {
        // Invalid URL
      }
    }
    analysis.uniqueDomains = Array.from(domains);

    return analysis;
  }

  /**
   * Build link graph for visualization
   */
  buildLinkGraph(url: string, links: Link[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    const sourceUrl = new URL(url);

    graph.set(sourceUrl.hostname, []);

    for (const link of links) {
      try {
        const targetUrl = new URL(link.href);
        const targets = graph.get(sourceUrl.hostname) || [];
        if (!targets.includes(targetUrl.hostname)) {
          targets.push(targetUrl.hostname);
        }
        graph.set(sourceUrl.hostname, targets);
      } catch (e) {
        // Invalid URL
      }
    }

    return graph;
  }

  /**
   * Find suspicious links (potential phishing, malware, etc.)
   */
  findSuspiciousLinks(links: Link[]): Link[] {
    const suspicious: Link[] = [];
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl/i,
      /goo\.gl/i,
      /t\.co/i,
      /\.exe$/i,
      /\.scr$/i,
      /\.bat$/i,
      /\.cmd$/i
    ];

    for (const link of links) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(link.href)) {
          suspicious.push(link);
          break;
        }
      }
    }

    return suspicious;
  }

  /**
   * Extract social media links
   */
  extractSocialMedia(links: Link[]): Record<string, string[]> {
    const socialMedia: Record<string, string[]> = {
      twitter: [],
      facebook: [],
      linkedin: [],
      instagram: [],
      youtube: [],
      github: []
    };

    for (const link of links) {
      const href = link.href.toLowerCase();

      if (href.includes('twitter.com') || href.includes('x.com')) {
        socialMedia.twitter.push(link.href);
      } else if (href.includes('facebook.com')) {
        socialMedia.facebook.push(link.href);
      } else if (href.includes('linkedin.com')) {
        socialMedia.linkedin.push(link.href);
      } else if (href.includes('instagram.com')) {
        socialMedia.instagram.push(link.href);
      } else if (href.includes('youtube.com')) {
        socialMedia.youtube.push(link.href);
      } else if (href.includes('github.com')) {
        socialMedia.github.push(link.href);
      }
    }

    return socialMedia;
  }
}
