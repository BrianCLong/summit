/**
 * ETL Connectors
 * Export all available connectors
 */

export * from './base.js';
export * from './rest-api.js';
export * from './rss-feed.js';
export * from './file.js';
export * from './web-scraper.js';
export * from './email-imap.js';
export * from './osint-sources.js';

import { ConnectorFactory } from './base.js';
import { RestApiConnector } from './rest-api.js';
import { RssFeedConnector } from './rss-feed.js';
import { FileConnector } from './file.js';
import { WebScraperConnector } from './web-scraper.js';
import { EmailImapConnector } from './email-imap.js';
import {
  NewsApiConnector,
  GdeltConnector,
  RedditConnector,
  WhoisConnector,
  DnsConnector,
  MispConnector
} from './osint-sources.js';

/**
 * Register all connectors with the factory
 */
export function registerAllConnectors(): void {
  ConnectorFactory.register('REST_API', RestApiConnector);
  ConnectorFactory.register('RSS_FEED', RssFeedConnector);
  ConnectorFactory.register('CSV_FILE', FileConnector);
  ConnectorFactory.register('JSON_FILE', FileConnector);
  ConnectorFactory.register('XML_FILE', FileConnector);
  ConnectorFactory.register('WEB_SCRAPER', WebScraperConnector);
  ConnectorFactory.register('EMAIL_IMAP', EmailImapConnector);
  ConnectorFactory.register('NEWS_API', NewsApiConnector);
  ConnectorFactory.register('GDELT', GdeltConnector);
  ConnectorFactory.register('REDDIT', RedditConnector);
  ConnectorFactory.register('WHOIS', WhoisConnector);
  ConnectorFactory.register('DNS', DnsConnector);
  ConnectorFactory.register('MISP', MispConnector);
}

// Auto-register connectors on import
registerAllConnectors();
