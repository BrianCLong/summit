"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurfaceInterpolator = void 0;
const UncertaintySurface_js_1 = require("../models/UncertaintySurface.js");
/**
 * Generate 2D/3D surface representations from uncertainty fields
 */
class SurfaceInterpolator {
    config;
    constructor(config = { resolution: 100 }) {
        this.config = {
            ...config,
            contourLevels: config.contourLevels || [0.2, 0.4, 0.6, 0.8],
            calculateGradients: config.calculateGradients !== false,
        };
    }
    /**
     * Generate 2D surface from uncertainty field
     */
    async interpolate(field, dimensions) {
        const [xDim, yDim] = dimensions;
        // Validate dimensions exist in field
        if (!field.getDimension(xDim) || !field.getDimension(yDim)) {
            throw new Error(`Dimensions ${xDim} or ${yDim} not found in field`);
        }
        // 1. Project field points onto 2D plane
        const projectedPoints = this.projectToDimensions(field.points, dimensions);
        // 2. Generate surface grid
        const grid = this.generateSurfaceGrid(field, dimensions, projectedPoints);
        // 3. Extract contours
        const contours = this.extractContours(grid);
        // 4. Calculate gradients
        const gradients = this.config.calculateGradients
            ? this.calculateGradients(grid)
            : [];
        return new UncertaintySurface_js_1.UncertaintySurface({
            fieldId: field.id,
            dimensions,
            grid,
            contours,
            gradients,
        });
    }
    /**
     * Project field points onto specified dimensions
     */
    projectToDimensions(points, dimensions) {
        const [xDim, yDim] = dimensions;
        return points
            .filter(p => p.coordinates[xDim] !== undefined && p.coordinates[yDim] !== undefined)
            .map(point => ({
            x: point.coordinates[xDim],
            y: point.coordinates[yDim],
            uncertainty: point.uncertainty,
        }));
    }
    /**
     * Generate surface grid with interpolated values
     */
    generateSurfaceGrid(field, dimensions, projectedPoints) {
        const [xDim, yDim] = dimensions;
        // Get dimension ranges
        const xDimension = field.getDimension(xDim);
        const yDimension = field.getDimension(yDim);
        const xMin = xDimension.range.min || 0;
        const xMax = xDimension.range.max || 1;
        const yMin = yDimension.range.min || 0;
        const yMax = yDimension.range.max || 1;
        // Initialize grid
        const values = [];
        const res = this.config.resolution;
        const xStep = (xMax - xMin) / (res - 1);
        const yStep = (yMax - yMin) / (res - 1);
        // Interpolate at each grid point
        for (let j = 0; j < res; j++) {
            const row = [];
            const y = yMin + j * yStep;
            for (let i = 0; i < res; i++) {
                const x = xMin + i * xStep;
                const uncertainty = this.interpolateAt(x, y, projectedPoints);
                row.push(uncertainty);
            }
            values.push(row);
        }
        return {
            xDimension: xDim,
            yDimension: yDim,
            xResolution: res,
            yResolution: res,
            values,
        };
    }
    /**
     * Interpolate uncertainty at specific (x, y) point using RBF
     */
    interpolateAt(x, y, points) {
        const epsilon = 0.5; // Shape parameter for Gaussian RBF
        let numerator = 0;
        let denominator = 0;
        for (const point of points) {
            const dx = x - point.x;
            const dy = y - point.y;
            const distanceSquared = dx * dx + dy * dy;
            const weight = Math.exp(-epsilon * distanceSquared);
            numerator += weight * point.uncertainty;
            denominator += weight;
        }
        return denominator > 0 ? numerator / denominator : 0;
    }
    /**
     * Extract contour lines at specified levels
     */
    extractContours(grid) {
        const contours = [];
        const levels = this.config.contourLevels || [];
        for (const level of levels) {
            const contour = this.marchingSquares(grid, level);
            if (contour.path.length > 0) {
                contours.push(contour);
            }
        }
        return contours;
    }
    /**
     * Marching squares algorithm for contour extraction
     */
    marchingSquares(grid, level) {
        const path = [];
        const visited = new Set();
        // Find starting point
        for (let j = 0; j < grid.yResolution - 1; j++) {
            for (let i = 0; i < grid.xResolution - 1; i++) {
                const cellKey = `${i},${j}`;
                if (visited.has(cellKey))
                    continue;
                // Check if contour passes through this cell
                const values = [
                    grid.values[j][i],
                    grid.values[j][i + 1],
                    grid.values[j + 1][i + 1],
                    grid.values[j + 1][i],
                ];
                const config = this.getMarchingSquaresConfig(values, level);
                if (config > 0 && config < 15) {
                    // Trace contour from this cell
                    this.traceContour(grid, level, i, j, path, visited);
                }
            }
        }
        // Check if contour is enclosed
        const enclosed = path.length > 2 &&
            Math.abs(path[0].x - path[path.length - 1].x) < 0.01 &&
            Math.abs(path[0].y - path[path.length - 1].y) < 0.01;
        return { value: level, path, enclosed };
    }
    /**
     * Get marching squares configuration for a cell
     */
    getMarchingSquaresConfig(values, level) {
        let config = 0;
        if (values[0] >= level)
            config |= 1;
        if (values[1] >= level)
            config |= 2;
        if (values[2] >= level)
            config |= 4;
        if (values[3] >= level)
            config |= 8;
        return config;
    }
    /**
     * Trace contour line through cells
     */
    traceContour(grid, level, startI, startJ, path, visited) {
        let i = startI;
        let j = startJ;
        let iterations = 0;
        const maxIterations = grid.xResolution * grid.yResolution;
        while (iterations < maxIterations) {
            const cellKey = `${i},${j}`;
            if (visited.has(cellKey))
                break;
            visited.add(cellKey);
            // Get cell configuration
            if (i >= grid.xResolution - 1 || j >= grid.yResolution - 1)
                break;
            const values = [
                grid.values[j][i],
                grid.values[j][i + 1],
                grid.values[j + 1][i + 1],
                grid.values[j + 1][i],
            ];
            const config = this.getMarchingSquaresConfig(values, level);
            // Add interpolated point to path
            const point = this.interpolateContourPoint(i, j, values, level, config);
            if (point) {
                path.push(point);
            }
            // Move to next cell (simplified)
            if (config === 0 || config === 15)
                break;
            // Simple movement logic (can be enhanced)
            if (config & 2)
                i++;
            else if (config & 8)
                i--;
            else if (config & 4)
                j++;
            else if (config & 1)
                j--;
            else
                break;
            iterations++;
        }
    }
    /**
     * Interpolate contour point within cell
     */
    interpolateContourPoint(i, j, values, level, config) {
        // Linear interpolation along cell edges
        // Simplified version - can be enhanced for better accuracy
        if (config === 0 || config === 15)
            return null;
        // Find edge crossing
        let x = i + 0.5;
        let y = j + 0.5;
        // Bottom edge
        if ((values[0] < level && values[1] >= level) || (values[0] >= level && values[1] < level)) {
            const t = (level - values[0]) / (values[1] - values[0]);
            x = i + t;
            y = j;
        }
        // Right edge
        else if ((values[1] < level && values[2] >= level) || (values[1] >= level && values[2] < level)) {
            const t = (level - values[1]) / (values[2] - values[1]);
            x = i + 1;
            y = j + t;
        }
        // Top edge
        else if ((values[2] < level && values[3] >= level) || (values[2] >= level && values[3] < level)) {
            const t = (level - values[3]) / (values[2] - values[3]);
            x = i + t;
            y = j + 1;
        }
        // Left edge
        else if ((values[3] < level && values[0] >= level) || (values[3] >= level && values[0] < level)) {
            const t = (level - values[3]) / (values[0] - values[3]);
            x = i;
            y = j + t;
        }
        return { x, y };
    }
    /**
     * Calculate gradients across surface
     */
    calculateGradients(grid) {
        const gradients = [];
        const sampleRate = Math.floor(grid.xResolution / 20); // Sample 20x20 gradient field
        for (let j = 1; j < grid.yResolution - 1; j += sampleRate) {
            for (let i = 1; i < grid.xResolution - 1; i += sampleRate) {
                const gradient = this.calculateGradientAt(grid, i, j);
                if (gradient) {
                    gradients.push(gradient);
                }
            }
        }
        return gradients;
    }
    /**
     * Calculate gradient at specific grid point
     */
    calculateGradientAt(grid, i, j) {
        if (i <= 0 || i >= grid.xResolution - 1 || j <= 0 || j >= grid.yResolution - 1) {
            return null;
        }
        const center = grid.values[j][i];
        // Central difference approximation
        const dx = (grid.values[j][i + 1] - grid.values[j][i - 1]) / 2;
        const dy = (grid.values[j + 1][i] - grid.values[j - 1][i]) / 2;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const direction = magnitude > 0 ? [dx / magnitude, dy / magnitude] : [0, 0];
        return {
            position: { x: i, y: j },
            magnitude,
            direction,
        };
    }
    /**
     * Smooth surface using Gaussian filter
     */
    smoothSurface(grid, sigma = 1.0) {
        const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
        const kernel = this.generateGaussianKernel(kernelSize, sigma);
        const smoothed = [];
        for (let j = 0; j < grid.yResolution; j++) {
            const row = [];
            for (let i = 0; i < grid.xResolution; i++) {
                let sum = 0;
                let weightSum = 0;
                const halfKernel = Math.floor(kernelSize / 2);
                for (let kj = -halfKernel; kj <= halfKernel; kj++) {
                    for (let ki = -halfKernel; ki <= halfKernel; ki++) {
                        const ni = i + ki;
                        const nj = j + kj;
                        if (ni >= 0 && ni < grid.xResolution && nj >= 0 && nj < grid.yResolution) {
                            const weight = kernel[kj + halfKernel][ki + halfKernel];
                            sum += grid.values[nj][ni] * weight;
                            weightSum += weight;
                        }
                    }
                }
                row.push(weightSum > 0 ? sum / weightSum : grid.values[j][i]);
            }
            smoothed.push(row);
        }
        return {
            ...grid,
            values: smoothed,
        };
    }
    /**
     * Generate Gaussian kernel for smoothing
     */
    generateGaussianKernel(size, sigma) {
        const kernel = [];
        const halfSize = Math.floor(size / 2);
        const factor = 1 / (2 * Math.PI * sigma * sigma);
        for (let j = -halfSize; j <= halfSize; j++) {
            const row = [];
            for (let i = -halfSize; i <= halfSize; i++) {
                const value = factor * Math.exp(-(i * i + j * j) / (2 * sigma * sigma));
                row.push(value);
            }
            kernel.push(row);
        }
        return kernel;
    }
}
exports.SurfaceInterpolator = SurfaceInterpolator;
