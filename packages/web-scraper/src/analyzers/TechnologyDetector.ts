/**
 * Technology Detector - Detects technologies used on websites
 */

import type { Technology } from '../types/index.js';

export class TechnologyDetector {
  /**
   * Detect technologies from HTML and headers
   */
  detect(html: string, headers: Record<string, string> = {}): Technology[] {
    const technologies: Technology[] = [];

    // Detect from HTML
    technologies.push(...this.detectFromHTML(html));

    // Detect from headers
    technologies.push(...this.detectFromHeaders(headers));

    return technologies;
  }

  /**
   * Detect technologies from HTML content
   */
  private detectFromHTML(html: string): Technology[] {
    const technologies: Technology[] = [];

    // React
    if (html.includes('react') || html.includes('__REACT') || html.includes('data-reactroot')) {
      technologies.push({
        name: 'React',
        category: 'JavaScript Framework',
        confidence: 0.9,
        website: 'https://reactjs.org'
      });
    }

    // Vue.js
    if (html.includes('vue') || html.includes('data-v-') || html.includes('__VUE')) {
      technologies.push({
        name: 'Vue.js',
        category: 'JavaScript Framework',
        confidence: 0.9,
        website: 'https://vuejs.org'
      });
    }

    // Angular
    if (html.includes('ng-') || html.includes('_ngcontent') || html.includes('angular')) {
      technologies.push({
        name: 'Angular',
        category: 'JavaScript Framework',
        confidence: 0.9,
        website: 'https://angular.io'
      });
    }

    // jQuery
    if (html.includes('jquery')) {
      technologies.push({
        name: 'jQuery',
        category: 'JavaScript Library',
        confidence: 0.8,
        website: 'https://jquery.com'
      });
    }

    // WordPress
    if (html.includes('wp-content') || html.includes('wordpress')) {
      technologies.push({
        name: 'WordPress',
        category: 'CMS',
        confidence: 0.95,
        website: 'https://wordpress.org'
      });
    }

    // Bootstrap
    if (html.includes('bootstrap')) {
      technologies.push({
        name: 'Bootstrap',
        category: 'CSS Framework',
        confidence: 0.85,
        website: 'https://getbootstrap.com'
      });
    }

    // Google Analytics
    if (html.includes('google-analytics.com') || html.includes('gtag') || html.includes('ga(')) {
      technologies.push({
        name: 'Google Analytics',
        category: 'Analytics',
        confidence: 0.95,
        website: 'https://analytics.google.com'
      });
    }

    // Cloudflare
    if (html.includes('__cf_bm') || html.includes('cloudflare')) {
      technologies.push({
        name: 'Cloudflare',
        category: 'CDN',
        confidence: 0.9,
        website: 'https://cloudflare.com'
      });
    }

    return technologies;
  }

  /**
   * Detect technologies from HTTP headers
   */
  private detectFromHeaders(headers: Record<string, string>): Technology[] {
    const technologies: Technology[] = [];

    // Server
    const server = headers['server'] || headers['Server'];
    if (server) {
      if (server.toLowerCase().includes('nginx')) {
        technologies.push({
          name: 'Nginx',
          category: 'Web Server',
          confidence: 0.95,
          website: 'https://nginx.org'
        });
      } else if (server.toLowerCase().includes('apache')) {
        technologies.push({
          name: 'Apache',
          category: 'Web Server',
          confidence: 0.95,
          website: 'https://apache.org'
        });
      }
    }

    // X-Powered-By
    const poweredBy = headers['x-powered-by'] || headers['X-Powered-By'];
    if (poweredBy) {
      if (poweredBy.toLowerCase().includes('php')) {
        technologies.push({
          name: 'PHP',
          category: 'Programming Language',
          confidence: 0.95,
          website: 'https://php.net'
        });
      } else if (poweredBy.toLowerCase().includes('express')) {
        technologies.push({
          name: 'Express',
          category: 'Web Framework',
          confidence: 0.95,
          website: 'https://expressjs.com'
        });
      }
    }

    return technologies;
  }
}
