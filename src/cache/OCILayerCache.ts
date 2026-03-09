#!/usr/bin/env node

/**
 * OCI Layer Remote Cache
 * Cache reusable container layers in an OCI registry with de-duplication
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface OCILayer {
  digest: string;
  mediaType: string;
  size: number;
  urls: string[];
  annotations?: Record<string, string>;
}

export interface OCIManifest {
  schemaVersion: number;
  mediaType: string;
  config: {
    digest: string;
    size: number;
    mediaType: string;
  };
  layers: OCILayer[];
  annotations?: Record<string, string>;
}

export interface ContainerBuildStep {
  id: string;
  instruction: string;
  context: string[];
  baseImage?: string;
  layerDigest?: string;
  cacheable: boolean;
  estimatedSize?: number;
}

export interface CacheResult {
  hit: boolean;
  digest?: string;
  pullTime?: number;
  size?: number;
  source: 'registry' | 'local' | 'miss';
}

export interface OCIRegistryConfig {
  url: string;
  namespace: string;
  username?: string;
  password?: string;
  insecure?: boolean;
  timeout?: number;
}

export interface CacheMetrics {
  totalLayers: number;
  totalSize: number; // bytes
  hitRate: number; // percentage
  pullTime: number; // total ms
  pushTime: number; // total ms
  deduplicationSavings: number; // bytes
  registryEgress: number; // bytes
  registryStorage: number; // bytes
}

export class OCILayerCache extends EventEmitter {
  private registry: OCIRegistryClient;
  private localCache: Map<string, OCILayer> = new Map();
  private layerUsage: Map<string, number> = new Map();
  private metrics: CacheMetrics = {
    totalLayers: 0,
    totalSize: 0,
    hitRate: 0,
    pullTime: 0,
    pushTime: 0,
    deduplicationSavings: 0,
    registryEgress: 0,
    registryStorage: 0,
  };

  private config: {
    maxLocalCacheSize: number;
    layerTTL: number;
    enableDeduplication: boolean;
    compressionLevel: number;
  };

  constructor(
    registryConfig: OCIRegistryConfig,
    cacheConfig: {
      maxLocalCacheSize?: number; // MB
      layerTTL?: number; // seconds
      enableDeduplication?: boolean;
      compressionLevel?: number;
    } = {},
  ) {
    super();

    this.config = {
      maxLocalCacheSize: cacheConfig.maxLocalCacheSize || 1024, // 1GB default
      layerTTL: cacheConfig.layerTTL || 7 * 24 * 60 * 60, // 7 days
      enableDeduplication: cacheConfig.enableDeduplication !== false,
      compressionLevel: cacheConfig.compressionLevel || 6,
    };

    this.registry = new OCIRegistryClient(registryConfig);

    console.log(
      `📦 OCI Layer Cache initialized (registry: ${registryConfig.url}/${registryConfig.namespace})`,
    );
  }

  /**
   * Build a container with layer caching
   */
  async buildWithCache(
    imageName: string,
    buildSteps: ContainerBuildStep[],
    dockerfilePath: string,
  ): Promise<{
    manifest: OCIManifest;
    cacheStats: { hits: number; misses: number; pullTime: number };
  }> {
    console.log(
      `🐳 Building ${imageName} with ${buildSteps.length} steps and layer caching...`,
    );

    const startTime = Date.now();
    const layers: OCILayer[] = [];
    const cacheStats = { hits: 0, misses: 0, pullTime: 0 };

    // Process each build step
    for (let i = 0; i < buildSteps.length; i++) {
      const step = buildSteps[i];
      console.log(`  Step ${i + 1}/${buildSteps.length}: ${step.instruction}`);

      if (step.cacheable) {
        // Try to find cached layer
        const cacheResult = await this.lookupCachedLayer(step);

        if (cacheResult.hit) {
          console.log(`    ✅ Cache hit: ${cacheResult.digest?.slice(0, 12)}`);
          cacheStats.hits++;
          cacheStats.pullTime += cacheResult.pullTime || 0;

          const layer = await this.pullLayer(cacheResult.digest!);
          if (layer) {
            layers.push(layer);
            continue;
          }
        }

        console.log(`    ❌ Cache miss - building layer`);
        cacheStats.misses++;
      }

      // Build the layer
      const layer = await this.buildLayer(
        step,
        i === 0 ? undefined : layers[layers.length - 1],
      );
      layers.push(layer);

      // Cache the layer if cacheable
      if (step.cacheable) {
        await this.pushLayer(layer, step);
      }
    }

    // Build final manifest
    const manifest = await this.buildManifest(
      imageName,
      layers,
      dockerfilePath,
    );

    const totalTime = Date.now() - startTime;
    console.log(
      `🐳 Build completed in ${totalTime}ms (${cacheStats.hits} cache hits, ${cacheStats.misses} misses)`,
    );

    // Update metrics
    this.updateBuildMetrics(cacheStats, layers);

    this.emit('build_completed', {
      imageName,
      manifest,
      cacheStats,
      totalTime,
      layers: layers.length,
    });

    return { manifest, cacheStats };
  }

  /**
   * Lookup a cached layer for a build step
   */
  async lookupCachedLayer(step: ContainerBuildStep): Promise<CacheResult> {
    const cacheKey = await this.generateCacheKey(step);

    // Check local cache first
    const localLayer = this.localCache.get(cacheKey);
    if (localLayer) {
      return {
        hit: true,
        digest: localLayer.digest,
        pullTime: 0,
        size: localLayer.size,
        source: 'local',
      };
    }

    // Check registry
    const registryResult = await this.registry.hasLayer(cacheKey);
    if (registryResult.exists) {
      return {
        hit: true,
        digest: registryResult.digest,
        pullTime: 0,
        size: registryResult.size,
        source: 'registry',
      };
    }

    return { hit: false, source: 'miss' };
  }

  /**
   * Pull a layer from cache
   */
  async pullLayer(digest: string): Promise<OCILayer | null> {
    console.log(`📥 Pulling layer ${digest.slice(0, 12)}...`);

    const startTime = Date.now();

    try {
      // Check local cache first
      const localLayer = Array.from(this.localCache.values()).find(
        (l) => l.digest === digest,
      );
      if (localLayer) {
        this.layerUsage.set(digest, (this.layerUsage.get(digest) || 0) + 1);
        return localLayer;
      }

      // Pull from registry
      const layer = await this.registry.pullLayer(digest);

      if (layer) {
        // Cache locally
        this.cacheLayerLocally(layer);

        const pullTime = Date.now() - startTime;
        this.metrics.pullTime += pullTime;
        this.metrics.registryEgress += layer.size;

        console.log(
          `📥 Pulled layer ${digest.slice(0, 12)} (${this.formatBytes(layer.size)}) in ${pullTime}ms`,
        );

        this.emit('layer_pulled', { digest, size: layer.size, pullTime });
        return layer;
      }
    } catch (error) {
      console.error(`❌ Failed to pull layer ${digest.slice(0, 12)}:`, error);
    }

    return null;
  }

  /**
   * Push a layer to cache
   */
  async pushLayer(layer: OCILayer, step: ContainerBuildStep): Promise<void> {
    console.log(
      `📤 Pushing layer ${layer.digest.slice(0, 12)} (${this.formatBytes(layer.size)})...`,
    );

    const startTime = Date.now();

    try {
      // Check for deduplication opportunity
      if (this.config.enableDeduplication) {
        const existing = await this.findDuplicateLayer(layer);
        if (existing) {
          console.log(
            `🔄 Layer deduplicated (saved ${this.formatBytes(layer.size)})`,
          );
          this.metrics.deduplicationSavings += layer.size;
          return;
        }
      }

      // Push to registry
      await this.registry.pushLayer(layer);

      // Cache locally
      this.cacheLayerLocally(layer);

      const pushTime = Date.now() - startTime;
      this.metrics.pushTime += pushTime;
      this.metrics.registryStorage += layer.size;

      console.log(
        `📤 Pushed layer ${layer.digest.slice(0, 12)} in ${pushTime}ms`,
      );

      this.emit('layer_pushed', {
        digest: layer.digest,
        size: layer.size,
        pushTime,
        step: step.instruction,
      });
    } catch (error) {
      console.error(
        `❌ Failed to push layer ${layer.digest.slice(0, 12)}:`,
        error,
      );
    }
  }

  /**
   * Generate cache key for a build step
   */
  private async generateCacheKey(step: ContainerBuildStep): Promise<string> {
    const contextHash = await this.hashBuildContext(step.context);

    const keyData = {
      instruction: step.instruction,
      contextHash,
      baseImage: step.baseImage || 'scratch',
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Hash the build context for cache key generation
   */
  private async hashBuildContext(context: string[]): Promise<string> {
    const hasher = crypto.createHash('sha256');

    // Sort context files for deterministic hashing
    const sortedContext = [...context].sort();

    for (const file of sortedContext) {
      try {
        const content = await fs.readFile(file);
        hasher.update(file);
        hasher.update(content);
      } catch (error) {
        // File might not exist, hash the filename only
        hasher.update(file);
      }
    }

    return hasher.digest('hex');
  }

  /**
   * Build a single layer (simulated)
   */
  private async buildLayer(
    step: ContainerBuildStep,
    baseLayer?: OCILayer,
  ): Promise<OCILayer> {
    // Simulate layer building
    const layerContent = await this.simulateLayerCreation(step);
    const digest = crypto
      .createHash('sha256')
      .update(layerContent)
      .digest('hex');

    return {
      digest: `sha256:${digest}`,
      mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
      size: layerContent.length,
      urls: [],
      annotations: {
        'build.step': step.instruction,
        'build.timestamp': new Date().toISOString(),
      },
    };
  }

  /**
   * Simulate layer creation for demo purposes
   */
  private async simulateLayerCreation(
    step: ContainerBuildStep,
  ): Promise<Buffer> {
    // Generate realistic layer content based on instruction type
    const instruction = step.instruction.split(' ')[0].toUpperCase();

    let baseSize = 1024; // 1KB base

    switch (instruction) {
      case 'FROM':
        baseSize = 50 * 1024 * 1024; // 50MB for base image
        break;
      case 'RUN':
        baseSize = 10 * 1024 * 1024; // 10MB for run commands
        break;
      case 'COPY':
      case 'ADD':
        baseSize = 5 * 1024 * 1024; // 5MB for file operations
        break;
      case 'ENV':
      case 'WORKDIR':
      case 'EXPOSE':
        baseSize = 1024; // 1KB for metadata
        break;
    }

    // Add some randomness to simulate real content
    const variation = Math.random() * 0.2 - 0.1; // ±10%
    const actualSize = Math.floor(baseSize * (1 + variation));

    // Generate random content with instruction identifier
    const content = Buffer.alloc(actualSize);
    content.write(step.instruction, 0);

    return content;
  }

  /**
   * Build OCI manifest from layers
   */
  private async buildManifest(
    imageName: string,
    layers: OCILayer[],
    dockerfilePath: string,
  ): Promise<OCIManifest> {
    // Create config blob
    const config = {
      architecture: 'amd64',
      os: 'linux',
      config: {
        Env: [
          'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        ],
        Cmd: ['/bin/sh'],
      },
      rootfs: {
        type: 'layers',
        diff_ids: layers.map((l) => l.digest),
      },
      history: layers.map((l) => ({
        created: new Date().toISOString(),
        created_by: l.annotations?.['build.step'] || 'unknown',
      })),
    };

    const configBlob = Buffer.from(JSON.stringify(config));
    const configDigest = crypto
      .createHash('sha256')
      .update(configBlob)
      .digest('hex');

    return {
      schemaVersion: 2,
      mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: {
        digest: `sha256:${configDigest}`,
        size: configBlob.length,
        mediaType: 'application/vnd.oci.image.config.v1+json',
      },
      layers,
      annotations: {
        'org.opencontainers.image.created': new Date().toISOString(),
        'org.opencontainers.image.source': dockerfilePath,
        'build.cache.enabled': 'true',
      },
    };
  }

  /**
   * Cache layer locally with size management
   */
  private cacheLayerLocally(layer: OCILayer): void {
    // Check if we need to evict layers to make space
    this.enforceLocalCacheSize();

    this.localCache.set(layer.digest, layer);
    this.layerUsage.set(
      layer.digest,
      (this.layerUsage.get(layer.digest) || 0) + 1,
    );
    this.metrics.totalLayers++;
    this.metrics.totalSize += layer.size;
  }

  /**
   * Enforce local cache size limits
   */
  private enforceLocalCacheSize(): void {
    const maxSizeBytes = this.config.maxLocalCacheSize * 1024 * 1024;

    if (this.metrics.totalSize > maxSizeBytes) {
      const layersToEvict = Array.from(this.localCache.entries())
        .sort(([, a], [, b]) => {
          const usageA = this.layerUsage.get(a.digest) || 0;
          const usageB = this.layerUsage.get(b.digest) || 0;
          return usageA - usageB; // Least recently used first
        })
        .slice(0, Math.ceil(this.localCache.size * 0.25)); // Evict 25%

      for (const [digest, layer] of layersToEvict) {
        this.localCache.delete(digest);
        this.layerUsage.delete(digest);
        this.metrics.totalSize -= layer.size;
        this.metrics.totalLayers--;
      }

      console.log(`🧹 Evicted ${layersToEvict.length} layers from local cache`);
    }
  }

  /**
   * Find duplicate layer for deduplication
   */
  private async findDuplicateLayer(layer: OCILayer): Promise<OCILayer | null> {
    // Simple content-based deduplication
    for (const [digest, existingLayer] of this.localCache) {
      if (
        existingLayer.size === layer.size &&
        existingLayer.mediaType === layer.mediaType &&
        digest !== layer.digest
      ) {
        // In a real implementation, we'd compare actual content hashes
        return existingLayer;
      }
    }

    return null;
  }

  /**
   * Update build metrics
   */
  private updateBuildMetrics(
    cacheStats: { hits: number; misses: number; pullTime: number },
    layers: OCILayer[],
  ): void {
    const totalLayers = cacheStats.hits + cacheStats.misses;
    this.metrics.hitRate =
      totalLayers > 0 ? (cacheStats.hits / totalLayers) * 100 : 0;

    this.emit('metrics_updated', this.metrics);
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics & {
    localCacheSize: number;
    localCacheLayers: number;
    avgLayerSize: number;
    topLayers: Array<{ digest: string; usage: number; size: number }>;
  } {
    const avgLayerSize =
      this.metrics.totalLayers > 0
        ? this.metrics.totalSize / this.metrics.totalLayers
        : 0;

    const topLayers = Array.from(this.layerUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([digest, usage]) => {
        const layer = this.localCache.get(digest);
        return {
          digest: digest.slice(0, 12),
          usage,
          size: layer?.size || 0,
        };
      });

    return {
      ...this.metrics,
      localCacheSize: this.metrics.totalSize,
      localCacheLayers: this.localCache.size,
      avgLayerSize,
      topLayers,
    };
  }

  /**
   * Clear expired layers
   */
  async clearExpiredLayers(): Promise<number> {
    const now = Date.now();
    const ttlMs = this.config.layerTTL * 1000;
    let clearedCount = 0;

    for (const [digest, layer] of this.localCache) {
      const createdTime = layer.annotations?.['build.timestamp']
        ? new Date(layer.annotations['build.timestamp']).getTime()
        : 0;

      if (now - createdTime > ttlMs) {
        this.localCache.delete(digest);
        this.layerUsage.delete(digest);
        this.metrics.totalSize -= layer.size;
        this.metrics.totalLayers--;
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`🧹 Cleared ${clearedCount} expired layers`);
    }

    return clearedCount;
  }

  /**
   * Prewarm cache with commonly used layers
   */
  async prewarmCache(commonImages: string[]): Promise<void> {
    console.log(
      `🔥 Prewarming cache with ${commonImages.length} common images...`,
    );

    for (const image of commonImages) {
      try {
        const manifest = await this.registry.getManifest(image);

        for (const layer of manifest.layers) {
          if (!this.localCache.has(layer.digest)) {
            await this.pullLayer(layer.digest);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to prewarm ${image}:`, error);
      }
    }

    console.log('🔥 Cache prewarming completed');
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down OCI layer cache...');

    await this.registry.shutdown();
    this.localCache.clear();
    this.layerUsage.clear();

    console.log('✅ OCI layer cache shut down');
  }
}

/**
 * OCI Registry Client (simplified implementation)
 */
class OCIRegistryClient {
  constructor(private config: OCIRegistryConfig) {}

  async hasLayer(
    digest: string,
  ): Promise<{ exists: boolean; digest?: string; size?: number }> {
    // Simulate registry check
    await this.delay(50);

    // 60% chance of cache hit for demo
    const exists = Math.random() > 0.4;

    return {
      exists,
      digest: exists ? `sha256:${digest}` : undefined,
      size: exists ? Math.floor(Math.random() * 10 * 1024 * 1024) : undefined,
    };
  }

  async pullLayer(digest: string): Promise<OCILayer | null> {
    // Simulate layer pull
    await this.delay(200 + Math.random() * 800); // 200-1000ms

    return {
      digest,
      mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
      size: Math.floor(Math.random() * 20 * 1024 * 1024), // Up to 20MB
      urls: [`${this.config.url}/v2/${this.config.namespace}/blobs/${digest}`],
    };
  }

  async pushLayer(layer: OCILayer): Promise<void> {
    // Simulate layer push
    await this.delay(300 + Math.random() * 700); // 300-1000ms
  }

  async getManifest(image: string): Promise<OCIManifest> {
    // Return dummy manifest for prewarming
    return {
      schemaVersion: 2,
      mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: {
        digest: 'sha256:config123',
        size: 1234,
        mediaType: 'application/vnd.oci.image.config.v1+json',
      },
      layers: [
        {
          digest: 'sha256:layer1',
          mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
          size: 5 * 1024 * 1024,
          urls: [],
        },
      ],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async shutdown(): Promise<void> {
    // Cleanup registry client
  }
}

// Factory function
export function createOCILayerCache(
  registryConfig: OCIRegistryConfig,
  cacheConfig?: any,
): OCILayerCache {
  return new OCILayerCache(registryConfig, cacheConfig);
}
