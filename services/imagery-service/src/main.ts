/**
 * Imagery Service
 *
 * REST API service for satellite imagery ingestion, search, and retrieval
 */

import {
  ImageryIngestionService,
  MaxarProvider,
  PlanetProvider,
  AirbusProvider,
  LandsatProvider,
  SentinelProvider
} from '../../../packages/satellite-imagery/src/ingestion';
import {
  ImagePreprocessingPipeline
} from '../../../packages/satellite-imagery/src/preprocessing';
import {
  SatelliteImage,
  ImagerySearchQuery,
  CollectionConfig,
  CollectionPriority,
  TaskingRequest,
  ImagerySource
} from '../../../packages/satellite-imagery/src/types';

/**
 * Imagery Service configuration
 */
interface ImageryServiceConfig {
  port: number;
  collection: CollectionConfig;
  apiKeys: {
    maxar?: string;
    planet?: string;
    airbus?: string;
  };
  storage: {
    bucket: string;
    region: string;
  };
}

/**
 * Imagery Service
 */
export class ImageryService {
  private ingestionService: ImageryIngestionService;
  private preprocessingPipeline: ImagePreprocessingPipeline;
  private config: ImageryServiceConfig;

  constructor(config: ImageryServiceConfig) {
    this.config = config;

    // Initialize ingestion service
    this.ingestionService = new ImageryIngestionService(config.collection);

    // Register providers
    if (config.apiKeys.maxar) {
      this.ingestionService.registerProvider(
        new MaxarProvider(config.apiKeys.maxar)
      );
    }

    if (config.apiKeys.planet) {
      this.ingestionService.registerProvider(
        new PlanetProvider(config.apiKeys.planet)
      );
    }

    if (config.apiKeys.airbus) {
      this.ingestionService.registerProvider(
        new AirbusProvider(config.apiKeys.airbus)
      );
    }

    // Register free providers
    this.ingestionService.registerProvider(new LandsatProvider());
    this.ingestionService.registerProvider(new SentinelProvider());

    // Initialize preprocessing
    this.preprocessingPipeline = new ImagePreprocessingPipeline();
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    console.log(`Starting Imagery Service on port ${this.config.port}...`);

    // In production, would initialize Express/Fastify server here
    // Example routes:
    // POST /api/imagery/search - Search imagery catalog
    // POST /api/imagery/download - Download imagery
    // POST /api/imagery/task - Submit tasking request
    // GET /api/imagery/:id - Get imagery metadata
    // POST /api/imagery/preprocess - Preprocess imagery
    // GET /api/health - Health check

    console.log('Imagery Service started successfully');
  }

  /**
   * Search for imagery
   */
  async search(query: ImagerySearchQuery): Promise<any> {
    return await this.ingestionService.searchAll(query);
  }

  /**
   * Download imagery
   */
  async download(
    source: ImagerySource,
    imageId: string,
    priority: CollectionPriority = CollectionPriority.ROUTINE
  ): Promise<any> {
    return await this.ingestionService.downloadImage(source, imageId, priority);
  }

  /**
   * Submit tasking request
   */
  async submitTasking(request: TaskingRequest): Promise<string> {
    return await this.ingestionService.submitTasking(request);
  }

  /**
   * Preprocess imagery
   */
  async preprocess(image: SatelliteImage, processingParams: any): Promise<any> {
    return await this.preprocessingPipeline.preprocess(image, processingParams);
  }

  /**
   * Get download queue status
   */
  getQueueStatus(): any {
    return this.ingestionService.getDownloadQueueStatus();
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    console.log('Stopping Imagery Service...');
    // Cleanup resources
    console.log('Imagery Service stopped');
  }
}

/**
 * Main entry point
 */
async function main() {
  const config: ImageryServiceConfig = {
    port: parseInt(process.env.PORT || '3000'),
    collection: {
      auto_download: true,
      cloud_threshold: 20,
      quality_threshold: 70,
      processing_level: 'L1C',
      delivery_format: ['geotiff'],
      archive_policy: 'immediate'
    },
    apiKeys: {
      maxar: process.env.MAXAR_API_KEY,
      planet: process.env.PLANET_API_KEY,
      airbus: process.env.AIRBUS_API_KEY
    },
    storage: {
      bucket: process.env.S3_BUCKET || 'geoint-imagery',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  };

  const service = new ImageryService(config);
  await service.start();

  // Handle shutdown
  process.on('SIGTERM', async () => {
    await service.stop();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default ImageryService;
