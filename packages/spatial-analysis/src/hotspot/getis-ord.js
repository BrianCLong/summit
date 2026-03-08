"use strict";
/**
 * Getis-Ord Gi* hotspot analysis
 * Identifies statistically significant spatial clusters of high and low values
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetisOrdAnalysis = void 0;
exports.detectHotspots = detectHotspots;
exports.detectHighValueHotspots = detectHighValueHotspots;
exports.detectLowValueHotspots = detectLowValueHotspots;
exports.kernelDensityEstimation = kernelDensityEstimation;
const geospatial_1 = require("@intelgraph/geospatial");
/**
 * Calculate Getis-Ord Gi* statistic for hotspot detection
 */
class GetisOrdAnalysis {
    distanceThreshold;
    significanceLevel;
    constructor(config) {
        this.distanceThreshold = config.distanceThreshold;
        this.significanceLevel = config.significanceLevel || 0.05;
    }
    /**
     * Perform Getis-Ord Gi* analysis
     */
    analyze(points) {
        if (points.length === 0) {
            return [];
        }
        const hotspots = [];
        // Calculate global statistics
        const globalMean = this.calculateMean(points);
        const globalStdDev = this.calculateStdDev(points, globalMean);
        // Calculate Gi* for each point
        points.forEach((point, i) => {
            const neighbors = this.getNeighbors(point, points);
            const giStar = this.calculateGiStar(point, neighbors, globalMean, globalStdDev);
            const pValue = this.getPValue(giStar.zScore);
            const significance = this.getSignificance(giStar.zScore, pValue);
            if (significance !== 'none') {
                hotspots.push({
                    location: {
                        latitude: point.latitude,
                        longitude: point.longitude,
                    },
                    zScore: giStar.zScore,
                    pValue,
                    significance,
                    count: neighbors.length,
                    radius: this.distanceThreshold,
                });
            }
        });
        return hotspots.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    }
    /**
     * Get neighbors within distance threshold
     */
    getNeighbors(target, points) {
        return points.filter((point) => {
            const distance = (0, geospatial_1.haversineDistance)(target, point);
            return distance <= this.distanceThreshold;
        });
    }
    /**
     * Calculate Gi* statistic
     */
    calculateGiStar(point, neighbors, globalMean, globalStdDev) {
        const n = neighbors.length;
        const sum = neighbors.reduce((acc, p) => acc + p.value, 0);
        // Gi* = (sum - mean * n) / (stddev * sqrt((N - n) / (N - 1)))
        const numerator = sum - globalMean * n;
        const denominator = globalStdDev * Math.sqrt((neighbors.length - n) / (neighbors.length - 1));
        const giStar = denominator !== 0 ? numerator / denominator : 0;
        const zScore = giStar;
        return { zScore, giStar };
    }
    /**
     * Calculate mean value
     */
    calculateMean(points) {
        const sum = points.reduce((acc, p) => acc + p.value, 0);
        return sum / points.length;
    }
    /**
     * Calculate standard deviation
     */
    calculateStdDev(points, mean) {
        const squaredDiffs = points.map((p) => Math.pow(p.value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / points.length;
        return Math.sqrt(avgSquaredDiff);
    }
    /**
     * Get p-value from z-score using standard normal distribution
     */
    getPValue(zScore) {
        // Two-tailed p-value approximation
        const absZ = Math.abs(zScore);
        // Using standard normal cumulative distribution approximation
        const t = 1 / (1 + 0.2316419 * absZ);
        const d = 0.3989423 * Math.exp((-zScore * zScore) / 2);
        const p = d *
            t *
            (0.3193815 +
                t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return 2 * p; // Two-tailed
    }
    /**
     * Determine significance level from z-score and p-value
     */
    getSignificance(zScore, pValue) {
        if (pValue > this.significanceLevel) {
            return 'none';
        }
        const absZ = Math.abs(zScore);
        if (absZ >= 2.58) {
            return 'high'; // 99% confidence
        }
        else if (absZ >= 1.96) {
            return 'high'; // 95% confidence
        }
        else if (absZ >= 1.65) {
            return 'medium'; // 90% confidence
        }
        else {
            return 'low';
        }
    }
}
exports.GetisOrdAnalysis = GetisOrdAnalysis;
/**
 * Convenience function to perform hotspot analysis
 */
function detectHotspots(points, distanceThreshold, significanceLevel = 0.05) {
    const analysis = new GetisOrdAnalysis({ distanceThreshold, significanceLevel });
    return analysis.analyze(points);
}
/**
 * Identify hot spots (high value clusters) only
 */
function detectHighValueHotspots(points, distanceThreshold, significanceLevel = 0.05) {
    const allHotspots = detectHotspots(points, distanceThreshold, significanceLevel);
    return allHotspots.filter((h) => h.zScore > 0);
}
/**
 * Identify cold spots (low value clusters) only
 */
function detectLowValueHotspots(points, distanceThreshold, significanceLevel = 0.05) {
    const allHotspots = detectHotspots(points, distanceThreshold, significanceLevel);
    return allHotspots.filter((h) => h.zScore < 0);
}
/**
 * Kernel density estimation for hotspot visualization
 */
function kernelDensityEstimation(points, gridResolution, bandwidth) {
    if (points.length === 0) {
        return [];
    }
    // Calculate bounds
    const minLat = Math.min(...points.map((p) => p.latitude));
    const maxLat = Math.max(...points.map((p) => p.latitude));
    const minLon = Math.min(...points.map((p) => p.longitude));
    const maxLon = Math.max(...points.map((p) => p.longitude));
    const densityGrid = [];
    // Create grid
    for (let lat = minLat; lat <= maxLat; lat += gridResolution) {
        for (let lon = minLon; lon <= maxLon; lon += gridResolution) {
            const gridPoint = { latitude: lat, longitude: lon };
            let density = 0;
            // Calculate density at this grid point
            points.forEach((point) => {
                const distance = (0, geospatial_1.haversineDistance)(gridPoint, point);
                // Gaussian kernel
                const kernel = Math.exp(-0.5 * Math.pow(distance / bandwidth, 2));
                density += kernel * (point.value || 1);
            });
            if (density > 0) {
                densityGrid.push({ latitude: lat, longitude: lon, density });
            }
        }
    }
    return densityGrid;
}
