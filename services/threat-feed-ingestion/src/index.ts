/**
 * Threat Feed Ingestion Service
 * Continuously ingests and processes threat intelligence from multiple sources
 */

import express from 'express';
import { createLogger, format, transports } from 'winston';
import { ThreatFeedAggregator, FeedConfig, IOC, EnrichmentService } from '@intelgraph/threat-intelligence';
import { AttackService } from '@intelgraph/mitre-attack';
import { AttributionEngine } from './services/AttributionEngine.js';
import { IOCRepository } from './repositories/IOCRepository.js';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'threat-feed-ingestion.log' }),
  ],
});

class ThreatFeedIngestionService {
  private app: express.Application;
  private feedAggregator: ThreatFeedAggregator;
  private enrichmentService: EnrichmentService;
  private attackService: AttackService;
  private attributionEngine: AttributionEngine;
  private iocRepository: IOCRepository;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3010', 10);

    // Initialize services
    this.feedAggregator = new ThreatFeedAggregator();
    this.enrichmentService = new EnrichmentService({
      virustotal: {
        apiKey: process.env.VIRUSTOTAL_API_KEY || '',
        enabled: !!process.env.VIRUSTOTAL_API_KEY,
      },
      abuseipdb: {
        apiKey: process.env.ABUSEIPDB_API_KEY || '',
        enabled: !!process.env.ABUSEIPDB_API_KEY,
      },
      urlscan: {
        apiKey: process.env.URLSCAN_API_KEY || '',
        enabled: !!process.env.URLSCAN_API_KEY,
      },
      hybridAnalysis: {
        apiKey: process.env.HYBRID_ANALYSIS_API_KEY || '',
        enabled: !!process.env.HYBRID_ANALYSIS_API_KEY,
      },
    });
    this.attackService = new AttackService();
    this.attributionEngine = new AttributionEngine(this.attackService);
    this.iocRepository = new IOCRepository();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Threat Feed Ingestion Service...');

    try {
      // Initialize MITRE ATT&CK data
      await this.attackService.initialize();

      // Register threat feeds
      this.registerFeeds();

      // Start polling feeds
      this.feedAggregator.startPolling(async (iocs: IOC[], feedId: string) => {
        await this.processIoCs(iocs, feedId);
      });

      logger.info('Threat Feed Ingestion Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Register threat intelligence feeds
   */
  private registerFeeds(): void {
    const feeds: FeedConfig[] = [
      {
        id: 'urlhaus',
        name: 'URLhaus',
        type: 'urlhaus',
        enabled: true,
        pollInterval: 3600000, // 1 hour
        priority: 8,
        tags: ['malware', 'url'],
        tlpOverride: 'WHITE',
      },
      {
        id: 'threatfox',
        name: 'ThreatFox',
        type: 'threatfox',
        enabled: true,
        pollInterval: 3600000, // 1 hour
        priority: 8,
        tags: ['c2', 'malware'],
        tlpOverride: 'WHITE',
      },
      {
        id: 'abuseipdb',
        name: 'AbuseIPDB',
        type: 'abuseipdb',
        enabled: !!process.env.ABUSEIPDB_API_KEY,
        apiKey: process.env.ABUSEIPDB_API_KEY,
        pollInterval: 7200000, // 2 hours
        priority: 7,
        tags: ['malicious_ip'],
        tlpOverride: 'AMBER',
      },
      {
        id: 'misp',
        name: 'MISP Instance',
        type: 'misp',
        enabled: !!process.env.MISP_URL && !!process.env.MISP_API_KEY,
        url: process.env.MISP_URL,
        apiKey: process.env.MISP_API_KEY,
        pollInterval: 1800000, // 30 minutes
        priority: 9,
        tags: ['misp'],
        tlpOverride: 'AMBER',
      },
      {
        id: 'otx',
        name: 'AlienVault OTX',
        type: 'otx',
        enabled: !!process.env.OTX_API_KEY,
        apiKey: process.env.OTX_API_KEY,
        pollInterval: 3600000, // 1 hour
        priority: 8,
        tags: ['otx'],
        tlpOverride: 'GREEN',
      },
    ];

    for (const feed of feeds) {
      if (feed.enabled) {
        this.feedAggregator.registerFeed(feed);
        logger.info(`Registered feed: ${feed.name}`);
      }
    }
  }

  /**
   * Process incoming IoCs
   */
  private async processIoCs(iocs: IOC[], feedId: string): Promise<void> {
    logger.info(`Processing ${iocs.length} IoCs from feed ${feedId}`);

    for (const ioc of iocs) {
      try {
        // Enrich IoC
        ioc.enrichment = await this.enrichmentService.enrichIoC(ioc);

        // Perform attribution
        ioc.attribution = await this.attributionEngine.attributeIoC(ioc);

        // Map to MITRE ATT&CK if techniques are present
        if (ioc.context.mitreTechniques.length > 0) {
          const ttpFingerprint = this.attackService.generateTTPFingerprint(
            ioc.context.mitreTechniques
          );
          if (ttpFingerprint.groups.length > 0) {
            ioc.attribution.groups = ttpFingerprint.groups.map(g => g.name);
            ioc.attribution.confidence = 'HIGH';
            ioc.attribution.confidenceScore = ttpFingerprint.confidence;
            ioc.attribution.reasoning.push(
              `Matched MITRE ATT&CK TTPs with known threat groups`
            );
          }
        }

        // Store IoC
        await this.iocRepository.upsertIoC(ioc);

        logger.debug(`Processed IoC: ${ioc.type} - ${ioc.value}`);
      } catch (error) {
        logger.error(`Error processing IoC ${ioc.value}:`, error);
      }
    }

    logger.info(`Successfully processed ${iocs.length} IoCs from feed ${feedId}`);
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'threat-feed-ingestion' });
    });

    // Get feed statistics
    this.app.get('/api/feeds/stats', (req, res) => {
      const stats = this.feedAggregator.getStats();
      res.json(stats);
    });

    // Manually trigger feed fetch
    this.app.post('/api/feeds/:feedId/fetch', async (req, res) => {
      const { feedId } = req.params;

      try {
        const iocs = await this.feedAggregator.fetchFeed(feedId);
        await this.processIoCs(iocs, feedId);
        res.json({ success: true, count: iocs.length });
      } catch (error) {
        logger.error(`Error fetching feed ${feedId}:`, error);
        res.status(500).json({ error: 'Failed to fetch feed' });
      }
    });

    // Get IoC statistics
    this.app.get('/api/iocs/stats', async (req, res) => {
      try {
        const stats = await this.iocRepository.getStatistics();
        res.json(stats);
      } catch (error) {
        logger.error('Error getting IoC stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
      }
    });

    // Search IoCs
    this.app.get('/api/iocs/search', async (req, res) => {
      try {
        const { value, type, severity } = req.query;
        const iocs = await this.iocRepository.searchIoCs({
          search: value as string,
          types: type ? [type as any] : undefined,
          severities: severity ? [severity as any] : undefined,
        });
        res.json(iocs);
      } catch (error) {
        logger.error('Error searching IoCs:', error);
        res.status(500).json({ error: 'Search failed' });
      }
    });
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    await this.initialize();

    this.app.listen(this.port, () => {
      logger.info(`Threat Feed Ingestion Service listening on port ${this.port}`);
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Threat Feed Ingestion Service...');
    this.feedAggregator.stopPolling();
    process.exit(0);
  }
}

// Start the service
const service = new ThreatFeedIngestionService();

service.start().catch((error) => {
  logger.error('Failed to start service:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => service.shutdown());
process.on('SIGINT', () => service.shutdown());
