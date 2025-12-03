/**
 * Satellite Imagery Processing Module
 * GDAL pipelines, raster/vector fusion, change detection, and caching
 */

export { GDALPipeline, createGDALPipeline } from './gdal-pipeline.js';
export type { PipelineResult, PipelineEvents } from './gdal-pipeline.js';

export { RasterVectorFusion, createFusionProcessor } from './raster-vector-fusion.js';
export type { FusionEvents } from './raster-vector-fusion.js';

export {
  ChangeDetectionEngine,
  createChangeDetectionEngine,
} from './change-detection.js';
export type {
  ChangeDetectionEvents,
  ChangeDetectionConfig,
} from './change-detection.js';

export { AirgappedCache, createAirgappedCache } from './airgapped-cache.js';
export type { AirgappedCacheConfig, CacheEvents } from './airgapped-cache.js';
