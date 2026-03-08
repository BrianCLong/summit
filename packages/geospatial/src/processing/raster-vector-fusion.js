"use strict";
// @ts-nocheck
/**
 * Raster/Vector Fusion Processor
 * Fuses satellite imagery with vector features for enriched geospatial intelligence
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RasterVectorFusion = void 0;
exports.createFusionProcessor = createFusionProcessor;
const events_1 = require("events");
const turf = __importStar(require("@turf/turf"));
/**
 * Raster/Vector Fusion Processor
 */
class RasterVectorFusion extends events_1.EventEmitter {
    config;
    cache = new Map();
    constructor(config) {
        super();
        this.config = config;
    }
    /**
     * Execute fusion operation
     */
    async fuse(scene, vectorFeatures, rasterData) {
        const startTime = Date.now();
        const fusionId = `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.emit('progress', 0, 'Starting fusion operation');
        let outputFeatures = [];
        const zonalStats = {};
        try {
            switch (this.config.fusionMethod) {
                case 'overlay':
                    outputFeatures = await this.overlayFusion(scene, vectorFeatures, rasterData);
                    break;
                case 'zonal_stats':
                    const { features, stats } = await this.zonalStatsFusion(scene, vectorFeatures, rasterData);
                    outputFeatures = features;
                    Object.assign(zonalStats, stats);
                    break;
                case 'sample_extraction':
                    outputFeatures = await this.sampleExtractionFusion(scene, vectorFeatures, rasterData);
                    break;
                case 'segmentation':
                    outputFeatures = await this.segmentationFusion(scene, vectorFeatures, rasterData);
                    break;
                default:
                    throw new Error(`Unknown fusion method: ${this.config.fusionMethod}`);
            }
            this.emit('progress', 90, 'Computing statistics');
            const statistics = {
                inputFeatureCount: vectorFeatures.features.length,
                outputFeatureCount: outputFeatures.length,
                bandsProcessed: this.config.rasterBands,
                coveragePercent: this.calculateCoverage(outputFeatures, scene.bbox),
                nullValuePercent: this.calculateNullPercent(outputFeatures),
                zonalStats,
            };
            this.emit('progress', 100, 'Fusion complete');
            const result = {
                id: fusionId,
                config: this.config,
                sceneId: scene.id,
                features: outputFeatures,
                statistics,
                processingTimeMs: Date.now() - startTime,
                timestamp: new Date(),
            };
            this.emit('complete', result);
            return result;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Overlay fusion - combine raster values with vector attributes
     */
    async overlayFusion(scene, vectorFeatures, rasterData) {
        const outputFeatures = [];
        const totalFeatures = vectorFeatures.features.length;
        for (let i = 0; i < vectorFeatures.features.length; i++) {
            const feature = vectorFeatures.features[i];
            this.emit('progress', Math.floor((i / totalFeatures) * 80), `Processing feature ${i + 1}/${totalFeatures}`);
            const spectralSignature = [];
            const bandValues = {};
            // Extract raster values at feature location
            for (const band of this.config.rasterBands) {
                const tile = rasterData.get(band);
                if (!tile)
                    continue;
                const value = this.sampleRasterAtFeature(tile, feature);
                if (value !== null) {
                    spectralSignature.push(value);
                    bandValues[band] = value;
                }
            }
            const extractedFeature = {
                ...feature,
                properties: {
                    ...feature.properties,
                    sceneId: scene.id,
                    extractionMethod: 'overlay',
                    detectionConfidence: 1.0,
                    spectralSignature,
                    ...bandValues,
                },
            };
            outputFeatures.push(extractedFeature);
            this.emit('feature', extractedFeature);
        }
        return outputFeatures;
    }
    /**
     * Zonal statistics fusion - compute statistics for polygon features
     */
    async zonalStatsFusion(scene, vectorFeatures, rasterData) {
        const outputFeatures = [];
        const allStats = {};
        const totalFeatures = vectorFeatures.features.length;
        for (let i = 0; i < vectorFeatures.features.length; i++) {
            const feature = vectorFeatures.features[i];
            this.emit('progress', Math.floor((i / totalFeatures) * 80), `Computing zonal stats ${i + 1}/${totalFeatures}`);
            // Only process polygon features
            if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
                continue;
            }
            const featureStats = {};
            const spectralSignature = [];
            for (const band of this.config.rasterBands) {
                const tile = rasterData.get(band);
                if (!tile)
                    continue;
                const stats = this.computeZonalStats(tile, feature.geometry, band);
                featureStats[band] = stats;
                spectralSignature.push(stats.mean);
                // Store in overall stats
                const statsKey = `${feature.properties?.entityId || i}_${band}`;
                allStats[statsKey] = {
                    min: stats.min,
                    max: stats.max,
                    mean: stats.mean,
                    stdDev: stats.stdDev,
                    validPixelCount: stats.count,
                };
            }
            const extractedFeature = {
                ...feature,
                properties: {
                    ...feature.properties,
                    sceneId: scene.id,
                    extractionMethod: 'zonal_stats',
                    detectionConfidence: 1.0,
                    spectralSignature,
                    zonalStats: featureStats,
                },
            };
            outputFeatures.push(extractedFeature);
            this.emit('feature', extractedFeature);
        }
        return { features: outputFeatures, stats: allStats };
    }
    /**
     * Sample extraction fusion - extract raster values at point locations
     */
    async sampleExtractionFusion(scene, vectorFeatures, rasterData) {
        const outputFeatures = [];
        const totalFeatures = vectorFeatures.features.length;
        for (let i = 0; i < vectorFeatures.features.length; i++) {
            const feature = vectorFeatures.features[i];
            this.emit('progress', Math.floor((i / totalFeatures) * 80), `Extracting samples ${i + 1}/${totalFeatures}`);
            // Get sample points based on geometry type
            const samplePoints = this.getSamplePoints(feature);
            const samples = [];
            for (const point of samplePoints) {
                const values = {};
                for (const band of this.config.rasterBands) {
                    const tile = rasterData.get(band);
                    if (!tile)
                        continue;
                    const value = this.sampleRasterAtPoint(tile, point);
                    if (value !== null) {
                        values[band] = value;
                    }
                }
                if (Object.keys(values).length > 0) {
                    samples.push({
                        point,
                        values,
                        timestamp: scene.acquisitionDate,
                        sceneId: scene.id,
                    });
                }
            }
            // Aggregate samples for feature
            const spectralSignature = this.aggregateSamples(samples, this.config.aggregationMethod || 'mean');
            const extractedFeature = {
                ...feature,
                properties: {
                    ...feature.properties,
                    sceneId: scene.id,
                    extractionMethod: 'sample_extraction',
                    detectionConfidence: samples.length > 0 ? 1.0 : 0.0,
                    spectralSignature,
                    sampleCount: samples.length,
                },
            };
            outputFeatures.push(extractedFeature);
            this.emit('feature', extractedFeature);
        }
        return outputFeatures;
    }
    /**
     * Segmentation fusion - segment raster based on vector boundaries
     */
    async segmentationFusion(scene, vectorFeatures, rasterData) {
        const outputFeatures = [];
        const totalFeatures = vectorFeatures.features.length;
        for (let i = 0; i < vectorFeatures.features.length; i++) {
            const feature = vectorFeatures.features[i];
            this.emit('progress', Math.floor((i / totalFeatures) * 80), `Segmenting ${i + 1}/${totalFeatures}`);
            // Buffer feature if configured
            let processingGeometry = feature.geometry;
            if (this.config.bufferMeters && this.config.bufferMeters > 0) {
                const buffered = turf.buffer(feature, this.config.bufferMeters, { units: 'meters' });
                if (buffered) {
                    processingGeometry = buffered.geometry;
                }
            }
            // Compute segment statistics
            const segmentStats = {};
            const spectralSignature = [];
            for (const band of this.config.rasterBands) {
                const tile = rasterData.get(band);
                if (!tile)
                    continue;
                if (processingGeometry.type === 'Polygon' || processingGeometry.type === 'MultiPolygon') {
                    const stats = this.computeZonalStats(tile, processingGeometry, band);
                    segmentStats[`${band}_mean`] = stats.mean;
                    segmentStats[`${band}_stddev`] = stats.stdDev;
                    segmentStats[`${band}_min`] = stats.min;
                    segmentStats[`${band}_max`] = stats.max;
                    spectralSignature.push(stats.mean);
                }
            }
            // Compute segment homogeneity
            const homogeneity = this.computeSegmentHomogeneity(segmentStats);
            const extractedFeature = {
                ...feature,
                properties: {
                    ...feature.properties,
                    sceneId: scene.id,
                    extractionMethod: 'segmentation',
                    detectionConfidence: homogeneity,
                    spectralSignature,
                    segmentStats,
                    homogeneity,
                },
            };
            outputFeatures.push(extractedFeature);
            this.emit('feature', extractedFeature);
        }
        return outputFeatures;
    }
    /**
     * Sample raster value at feature centroid or geometry
     */
    sampleRasterAtFeature(tile, feature) {
        const centroid = turf.centroid(feature);
        const point = {
            longitude: centroid.geometry.coordinates[0],
            latitude: centroid.geometry.coordinates[1],
        };
        return this.sampleRasterAtPoint(tile, point);
    }
    /**
     * Sample raster value at a specific point
     */
    sampleRasterAtPoint(tile, point) {
        // Check if point is within tile bounds
        if (point.longitude < tile.bbox.minLon ||
            point.longitude > tile.bbox.maxLon ||
            point.latitude < tile.bbox.minLat ||
            point.latitude > tile.bbox.maxLat) {
            return null;
        }
        // Calculate pixel coordinates
        const xRatio = (point.longitude - tile.bbox.minLon) / (tile.bbox.maxLon - tile.bbox.minLon);
        const yRatio = 1 - (point.latitude - tile.bbox.minLat) / (tile.bbox.maxLat - tile.bbox.minLat);
        const pixelX = Math.floor(xRatio * tile.width);
        const pixelY = Math.floor(yRatio * tile.height);
        if (pixelX < 0 || pixelX >= tile.width || pixelY < 0 || pixelY >= tile.height) {
            return null;
        }
        const index = pixelY * tile.width + pixelX;
        const value = tile.data[index];
        // Check for nodata
        if (tile.noDataValue !== undefined && value === tile.noDataValue) {
            return null;
        }
        return value;
    }
    /**
     * Compute zonal statistics for a polygon
     */
    computeZonalStats(tile, geometry, band) {
        const values = [];
        // Get bounding box of geometry
        const geomBbox = turf.bbox(geometry);
        // Iterate over pixels within geometry bounds
        const xMin = Math.max(0, Math.floor(((geomBbox[0] - tile.bbox.minLon) / (tile.bbox.maxLon - tile.bbox.minLon)) * tile.width));
        const xMax = Math.min(tile.width - 1, Math.ceil(((geomBbox[2] - tile.bbox.minLon) / (tile.bbox.maxLon - tile.bbox.minLon)) * tile.width));
        const yMin = Math.max(0, Math.floor((1 - (geomBbox[3] - tile.bbox.minLat) / (tile.bbox.maxLat - tile.bbox.minLat)) * tile.height));
        const yMax = Math.min(tile.height - 1, Math.ceil((1 - (geomBbox[1] - tile.bbox.minLat) / (tile.bbox.maxLat - tile.bbox.minLat)) * tile.height));
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                // Convert pixel to coordinate
                const lon = tile.bbox.minLon + (x / tile.width) * (tile.bbox.maxLon - tile.bbox.minLon);
                const lat = tile.bbox.maxLat - (y / tile.height) * (tile.bbox.maxLat - tile.bbox.minLat);
                // Check if point is within polygon
                const point = turf.point([lon, lat]);
                if (turf.booleanPointInPolygon(point, geometry)) {
                    const index = y * tile.width + x;
                    const value = tile.data[index];
                    if (tile.noDataValue === undefined || value !== tile.noDataValue) {
                        values.push(value);
                    }
                }
            }
        }
        if (values.length === 0) {
            return {
                featureId: '',
                band,
                count: 0,
                min: 0,
                max: 0,
                mean: 0,
                stdDev: 0,
                sum: 0,
            };
        }
        // Compute statistics
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        // Compute median
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        return {
            featureId: '',
            band,
            count: values.length,
            min,
            max,
            mean,
            stdDev,
            sum,
            median,
        };
    }
    /**
     * Get sample points from a feature
     */
    getSamplePoints(feature) {
        const points = [];
        switch (feature.geometry.type) {
            case 'Point':
                points.push({
                    longitude: feature.geometry.coordinates[0],
                    latitude: feature.geometry.coordinates[1],
                });
                break;
            case 'MultiPoint':
                for (const coord of feature.geometry.coordinates) {
                    points.push({ longitude: coord[0], latitude: coord[1] });
                }
                break;
            case 'LineString':
                // Sample along line
                const line = turf.lineString(feature.geometry.coordinates);
                const length = turf.length(line, { units: 'meters' });
                const sampleInterval = Math.max(10, length / 100); // At least 10m or 100 samples
                for (let d = 0; d <= length; d += sampleInterval) {
                    const point = turf.along(line, d, { units: 'meters' });
                    points.push({
                        longitude: point.geometry.coordinates[0],
                        latitude: point.geometry.coordinates[1],
                    });
                }
                break;
            case 'Polygon':
            case 'MultiPolygon':
                // Use centroid and grid sampling
                const centroid = turf.centroid(feature);
                points.push({
                    longitude: centroid.geometry.coordinates[0],
                    latitude: centroid.geometry.coordinates[1],
                });
                // Add points on regular grid within polygon
                const bbox = turf.bbox(feature);
                const cellSize = Math.max((bbox[2] - bbox[0]) / 10, (bbox[3] - bbox[1]) / 10);
                const grid = turf.pointGrid(bbox, cellSize, { units: 'degrees' });
                for (const gridPoint of grid.features) {
                    if (turf.booleanPointInPolygon(gridPoint, feature)) {
                        points.push({
                            longitude: gridPoint.geometry.coordinates[0],
                            latitude: gridPoint.geometry.coordinates[1],
                        });
                    }
                }
                break;
        }
        return points;
    }
    /**
     * Aggregate multiple samples using specified method
     */
    aggregateSamples(samples, method) {
        if (samples.length === 0)
            return [];
        const bands = Object.keys(samples[0].values);
        const result = [];
        for (const band of bands) {
            const values = samples
                .map((s) => s.values[band])
                .filter((v) => v !== undefined);
            if (values.length === 0) {
                result.push(0);
                continue;
            }
            let aggregated;
            switch (method) {
                case 'mean':
                    aggregated = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'median':
                    const sorted = [...values].sort((a, b) => a - b);
                    aggregated = sorted.length % 2 === 0
                        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                        : sorted[Math.floor(sorted.length / 2)];
                    break;
                case 'max':
                    aggregated = Math.max(...values);
                    break;
                case 'min':
                    aggregated = Math.min(...values);
                    break;
                case 'sum':
                    aggregated = values.reduce((a, b) => a + b, 0);
                    break;
                default:
                    aggregated = values.reduce((a, b) => a + b, 0) / values.length;
            }
            result.push(aggregated);
        }
        return result;
    }
    /**
     * Compute segment homogeneity from statistics
     */
    computeSegmentHomogeneity(stats) {
        const stddevKeys = Object.keys(stats).filter((k) => k.endsWith('_stddev'));
        if (stddevKeys.length === 0)
            return 1.0;
        // Lower stddev = higher homogeneity
        const avgStddev = stddevKeys.reduce((sum, k) => sum + stats[k], 0) / stddevKeys.length;
        // Normalize to 0-1 range (assuming max stddev of 100)
        return Math.max(0, 1 - avgStddev / 100);
    }
    /**
     * Calculate coverage percentage
     */
    calculateCoverage(features, bbox) {
        if (features.length === 0)
            return 0;
        const bboxArea = (bbox.maxLon - bbox.minLon) * (bbox.maxLat - bbox.minLat);
        let totalArea = 0;
        for (const feature of features) {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                totalArea += turf.area(feature);
            }
        }
        // Convert bbox to approximate m²
        const bboxAreaM2 = bboxArea * 111000 * 111000 * Math.cos((bbox.minLat + bbox.maxLat) / 2 * Math.PI / 180);
        return Math.min(100, (totalArea / bboxAreaM2) * 100);
    }
    /**
     * Calculate null value percentage
     */
    calculateNullPercent(features) {
        if (features.length === 0)
            return 100;
        const nullCount = features.filter((f) => !f.properties.spectralSignature || f.properties.spectralSignature.length === 0).length;
        return (nullCount / features.length) * 100;
    }
}
exports.RasterVectorFusion = RasterVectorFusion;
/**
 * Factory for creating fusion processors
 */
function createFusionProcessor(config) {
    return new RasterVectorFusion(config);
}
