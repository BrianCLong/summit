"use strict";
/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * clustering algorithm for geospatial data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBSCAN = void 0;
exports.dbscan = dbscan;
exports.findOptimalEpsilon = findOptimalEpsilon;
const geospatial_1 = require("@intelgraph/geospatial");
var PointLabel;
(function (PointLabel) {
    PointLabel[PointLabel["UNVISITED"] = 0] = "UNVISITED";
    PointLabel[PointLabel["NOISE"] = -1] = "NOISE";
})(PointLabel || (PointLabel = {}));
/**
 * DBSCAN clustering implementation
 */
class DBSCAN {
    epsilon;
    minPoints;
    constructor(config) {
        this.epsilon = config.epsilon;
        this.minPoints = config.minPoints;
    }
    /**
     * Perform DBSCAN clustering on a set of points
     */
    cluster(points) {
        if (points.length === 0) {
            return [];
        }
        const labels = new Array(points.length).fill(PointLabel.UNVISITED);
        let clusterId = 0;
        for (let i = 0; i < points.length; i++) {
            if (labels[i] !== PointLabel.UNVISITED) {
                continue;
            }
            const neighbors = this.regionQuery(points, i);
            if (neighbors.length < this.minPoints) {
                labels[i] = PointLabel.NOISE;
            }
            else {
                this.expandCluster(points, labels, i, neighbors, clusterId);
                clusterId++;
            }
        }
        return this.createClusters(points, labels, clusterId);
    }
    /**
     * Find all neighbors within epsilon distance
     */
    regionQuery(points, pointIndex) {
        const neighbors = [];
        const point = points[pointIndex];
        for (let i = 0; i < points.length; i++) {
            if ((0, geospatial_1.haversineDistance)(point, points[i]) <= this.epsilon) {
                neighbors.push(i);
            }
        }
        return neighbors;
    }
    /**
     * Expand a cluster from a core point
     */
    expandCluster(points, labels, pointIndex, neighbors, clusterId) {
        labels[pointIndex] = clusterId;
        let i = 0;
        while (i < neighbors.length) {
            const neighborIndex = neighbors[i];
            if (labels[neighborIndex] === PointLabel.NOISE) {
                labels[neighborIndex] = clusterId;
            }
            if (labels[neighborIndex] !== PointLabel.UNVISITED) {
                i++;
                continue;
            }
            labels[neighborIndex] = clusterId;
            const neighborNeighbors = this.regionQuery(points, neighborIndex);
            if (neighborNeighbors.length >= this.minPoints) {
                // Add new neighbors to the search
                neighborNeighbors.forEach((nn) => {
                    if (!neighbors.includes(nn)) {
                        neighbors.push(nn);
                    }
                });
            }
            i++;
        }
    }
    /**
     * Create cluster objects from labels
     */
    createClusters(points, labels, numClusters) {
        const clusters = [];
        // Create clusters
        for (let clusterId = 0; clusterId < numClusters; clusterId++) {
            const clusterPoints = points.filter((_, index) => labels[index] === clusterId);
            if (clusterPoints.length === 0) {
                continue;
            }
            const clusterCentroid = (0, geospatial_1.centroid)(clusterPoints);
            const radius = this.calculateClusterRadius(clusterPoints, clusterCentroid);
            const density = clusterPoints.length / (Math.PI * radius * radius);
            clusters.push({
                id: clusterId,
                points: clusterPoints,
                centroid: clusterCentroid,
                radius,
                density,
                noise: false,
            });
        }
        // Add noise cluster
        const noisePoints = points.filter((_, index) => labels[index] === PointLabel.NOISE);
        if (noisePoints.length > 0) {
            clusters.push({
                id: -1,
                points: noisePoints,
                centroid: (0, geospatial_1.centroid)(noisePoints),
                radius: 0,
                density: 0,
                noise: true,
                label: 'Noise',
            });
        }
        return clusters;
    }
    /**
     * Calculate the radius of a cluster (maximum distance from centroid)
     */
    calculateClusterRadius(points, clusterCentroid) {
        return Math.max(...points.map((point) => (0, geospatial_1.haversineDistance)(clusterCentroid, point)));
    }
}
exports.DBSCAN = DBSCAN;
/**
 * Convenience function to perform DBSCAN clustering
 */
function dbscan(points, epsilon, minPoints) {
    const clusterer = new DBSCAN({ epsilon, minPoints });
    return clusterer.cluster(points);
}
/**
 * Find optimal epsilon using k-distance graph
 */
function findOptimalEpsilon(points, k = 4) {
    const distances = [];
    for (let i = 0; i < points.length; i++) {
        const pointDistances = [];
        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                pointDistances.push((0, geospatial_1.haversineDistance)(points[i], points[j]));
            }
        }
        // Sort and get k-th nearest neighbor distance
        pointDistances.sort((a, b) => a - b);
        if (pointDistances.length >= k) {
            distances.push(pointDistances[k - 1]);
        }
    }
    // Find the elbow point (simplified approach)
    distances.sort((a, b) => a - b);
    const medianIndex = Math.floor(distances.length / 2);
    return distances[medianIndex];
}
