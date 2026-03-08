"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldGenerator = void 0;
const UncertaintyField_js_1 = require("../models/UncertaintyField.js");
/**
 * Generate uncertainty fields from sparse prediction points
 */
class FieldGenerator {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate complete uncertainty field from predictions
     */
    async generate(investigationId, predictions) {
        const startTime = Date.now();
        // 1. Extract measured points from predictions
        const measuredPoints = this.extractMeasuredPoints(predictions);
        // 2. Create interpolation grid
        const grid = this.createGrid();
        // 3. Interpolate uncertainty at grid points
        const interpolatedPoints = this.interpolateGrid(grid, measuredPoints);
        // 4. Combine measured and interpolated points
        const allPoints = [...measuredPoints, ...interpolatedPoints];
        // 5. Apply adaptive refinement if enabled
        let refinedPoints = allPoints;
        if (this.config.resolution.adaptiveRefinement) {
            refinedPoints = this.applyAdaptiveRefinement(allPoints, measuredPoints);
        }
        // 6. Create field
        const field = new UncertaintyField_js_1.UncertaintyField({
            investigationId,
            dimensions: this.config.dimensions,
            points: refinedPoints,
            resolution: this.config.resolution,
            generatedAt: new Date(),
        });
        // Update generation time in metadata
        field.metadata.generationTimeMs = Date.now() - startTime;
        return field;
    }
    /**
     * Extract measured points from predictions
     */
    extractMeasuredPoints(predictions) {
        return predictions.map(prediction => ({
            coordinates: this.extractCoordinates(prediction),
            uncertainty: this.calculateUncertainty(prediction),
            source: 'measured',
            confidence: prediction.confidence,
            contributors: [prediction.id],
        }));
    }
    /**
     * Extract coordinates from prediction based on configured dimensions
     */
    extractCoordinates(prediction) {
        const coordinates = {};
        for (const dimension of this.config.dimensions) {
            if (prediction.values[dimension.name] !== undefined) {
                coordinates[dimension.name] = prediction.values[dimension.name];
            }
            else {
                // Use default center value if not present
                coordinates[dimension.name] = this.getDimensionCenter(dimension);
            }
        }
        return coordinates;
    }
    /**
     * Calculate uncertainty from prediction
     */
    calculateUncertainty(prediction) {
        // If prediction has explicit uncertainty, use it
        if (prediction.uncertainty !== undefined) {
            return Math.max(0, Math.min(1, prediction.uncertainty));
        }
        // Otherwise calculate from confidence
        return 1 - prediction.confidence;
    }
    /**
     * Get center value for dimension
     */
    getDimensionCenter(dimension) {
        if (dimension.range.min !== undefined && dimension.range.max !== undefined) {
            return (dimension.range.min + dimension.range.max) / 2;
        }
        return 0;
    }
    /**
     * Create interpolation grid
     */
    createGrid() {
        const grid = [];
        const gridPoints = [];
        // Generate grid points for each dimension
        for (const dimension of this.config.dimensions) {
            const points = this.generateDimensionPoints(dimension, this.config.resolution.gridSize);
            gridPoints.push(points);
        }
        // Create all combinations
        this.cartesianProduct(gridPoints, 0, {}, grid);
        return grid;
    }
    /**
     * Generate points along a dimension
     */
    generateDimensionPoints(dimension, count) {
        const points = [];
        if (dimension.type === 'categorical') {
            // For categorical, use category indices
            const categoryCount = dimension.range.categories?.length || 1;
            for (let i = 0; i < Math.min(count, categoryCount); i++) {
                points.push(i);
            }
        }
        else if (dimension.range.min !== undefined && dimension.range.max !== undefined) {
            // For continuous, create evenly spaced points
            const min = dimension.range.min;
            const max = dimension.range.max;
            const step = (max - min) / (count - 1);
            for (let i = 0; i < count; i++) {
                points.push(min + i * step);
            }
        }
        return points;
    }
    /**
     * Generate cartesian product for grid creation
     */
    cartesianProduct(arrays, index, current, result) {
        if (index === arrays.length) {
            result.push({ ...current });
            return;
        }
        const dimension = this.config.dimensions[index];
        for (const value of arrays[index]) {
            current[dimension.name] = value;
            this.cartesianProduct(arrays, index + 1, current, result);
        }
    }
    /**
     * Interpolate uncertainty at grid points
     */
    interpolateGrid(grid, measuredPoints) {
        const method = this.config.interpolationMethod || 'rbf_gaussian';
        return grid.map(coordinates => {
            const uncertainty = this.interpolatePoint(coordinates, measuredPoints, method);
            const confidence = this.calculateInterpolationConfidence(coordinates, measuredPoints);
            return {
                coordinates,
                uncertainty,
                source: 'interpolated',
                confidence,
                contributors: this.findContributingPoints(coordinates, measuredPoints, 5),
            };
        });
    }
    /**
     * Interpolate uncertainty at a single point
     */
    interpolatePoint(coordinates, measuredPoints, method) {
        switch (method) {
            case 'rbf_gaussian':
                return this.rbfGaussian(coordinates, measuredPoints);
            case 'rbf_multiquadric':
                return this.rbfMultiquadric(coordinates, measuredPoints);
            case 'nearest_neighbor':
                return this.nearestNeighbor(coordinates, measuredPoints);
            default:
                return this.rbfGaussian(coordinates, measuredPoints);
        }
    }
    /**
     * RBF interpolation with Gaussian kernel
     */
    rbfGaussian(coordinates, measuredPoints) {
        const epsilon = 0.5; // Shape parameter
        let numerator = 0;
        let denominator = 0;
        for (const point of measuredPoints) {
            const distance = this.calculateDistance(coordinates, point.coordinates);
            const weight = Math.exp(-epsilon * distance * distance);
            numerator += weight * point.uncertainty;
            denominator += weight;
        }
        return denominator > 0 ? numerator / denominator : 0;
    }
    /**
     * RBF interpolation with multiquadric kernel
     */
    rbfMultiquadric(coordinates, measuredPoints) {
        const epsilon = 0.5;
        let numerator = 0;
        let denominator = 0;
        for (const point of measuredPoints) {
            const distance = this.calculateDistance(coordinates, point.coordinates);
            const weight = Math.sqrt(1 + (epsilon * distance) ** 2);
            numerator += point.uncertainty / weight;
            denominator += 1 / weight;
        }
        return denominator > 0 ? numerator / denominator : 0;
    }
    /**
     * Nearest neighbor interpolation
     */
    nearestNeighbor(coordinates, measuredPoints) {
        let minDistance = Infinity;
        let nearestUncertainty = 0;
        for (const point of measuredPoints) {
            const distance = this.calculateDistance(coordinates, point.coordinates);
            if (distance < minDistance) {
                minDistance = distance;
                nearestUncertainty = point.uncertainty;
            }
        }
        return nearestUncertainty;
    }
    /**
     * Calculate Euclidean distance between coordinates
     */
    calculateDistance(coord1, coord2) {
        let sumSquares = 0;
        for (const dimension of this.config.dimensions) {
            const name = dimension.name;
            if (coord1[name] !== undefined && coord2[name] !== undefined) {
                // Normalize by dimension range
                const range = (dimension.range.max || 1) - (dimension.range.min || 0);
                const normalizedDiff = (coord1[name] - coord2[name]) / range;
                sumSquares += normalizedDiff * normalizedDiff;
            }
        }
        return Math.sqrt(sumSquares);
    }
    /**
     * Calculate confidence in interpolation
     */
    calculateInterpolationConfidence(coordinates, measuredPoints) {
        // Confidence decreases with distance from measured points
        const distances = measuredPoints.map(p => this.calculateDistance(coordinates, p.coordinates));
        const minDistance = Math.min(...distances);
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        // Exponential decay with distance
        return Math.exp(-minDistance) * Math.exp(-avgDistance / 2);
    }
    /**
     * Find contributing measured points (k-nearest)
     */
    findContributingPoints(coordinates, measuredPoints, k) {
        const withDistances = measuredPoints.map(point => ({
            point,
            distance: this.calculateDistance(coordinates, point.coordinates),
        }));
        withDistances.sort((a, b) => a.distance - b.distance);
        return withDistances
            .slice(0, k)
            .flatMap(({ point }) => point.contributors);
    }
    /**
     * Apply adaptive refinement to increase resolution in high-uncertainty areas
     */
    applyAdaptiveRefinement(points, measuredPoints) {
        const refinedPoints = [...points];
        const threshold = 0.7; // High uncertainty threshold
        // Find high-uncertainty points
        const highUncertaintyPoints = points.filter(p => p.uncertainty > threshold);
        // Add additional points around high-uncertainty areas
        for (const point of highUncertaintyPoints) {
            const neighbors = this.generateNeighborPoints(point.coordinates, 0.1);
            for (const neighborCoords of neighbors) {
                const uncertainty = this.interpolatePoint(neighborCoords, measuredPoints, this.config.interpolationMethod || 'rbf_gaussian');
                refinedPoints.push({
                    coordinates: neighborCoords,
                    uncertainty,
                    source: 'interpolated',
                    confidence: this.calculateInterpolationConfidence(neighborCoords, measuredPoints),
                    contributors: this.findContributingPoints(neighborCoords, measuredPoints, 5),
                });
            }
        }
        return refinedPoints;
    }
    /**
     * Generate neighbor points around a coordinate
     */
    generateNeighborPoints(coordinates, offset) {
        const neighbors = [];
        // Generate points with small offsets in each dimension
        const offsets = [-offset, offset];
        for (const dimension of this.config.dimensions) {
            for (const delta of offsets) {
                const neighbor = { ...coordinates };
                neighbor[dimension.name] += delta;
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }
}
exports.FieldGenerator = FieldGenerator;
