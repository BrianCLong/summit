"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterPoints = void 0;
const distance_js_1 = require("../utils/distance.js");
const clusterPoints = (points, options = {}) => {
    const eps = options.epsilonMeters ?? 500;
    const minPts = options.minPoints ?? 3;
    const visited = new Set();
    const clusters = [];
    const neighbors = (idx) => points.reduce((acc, point, candidateIdx) => {
        if (idx === candidateIdx)
            return acc;
        if ((0, distance_js_1.haversineDistance)(points[idx], point) <= eps) {
            acc.push(candidateIdx);
        }
        return acc;
    }, []);
    const expandCluster = (idx, clusterId, clusterPointsIdx) => {
        const queue = [idx];
        while (queue.length) {
            const current = queue.pop();
            if (current === undefined || visited.has(current))
                continue;
            visited.add(current);
            clusterPointsIdx.push(current);
            const currentNeighbors = neighbors(current);
            if (currentNeighbors.length >= minPts) {
                queue.push(...currentNeighbors);
            }
        }
    };
    points.forEach((_, idx) => {
        if (visited.has(idx))
            return;
        const neighborPts = neighbors(idx);
        if (neighborPts.length + 1 < minPts) {
            visited.add(idx);
            return;
        }
        const clusterIndices = [];
        expandCluster(idx, clusters.length, clusterIndices);
        const clusterPointsList = clusterIndices.map((i) => points[i]);
        const centroid = calculateCentroid(clusterPointsList);
        const radius = Math.max(...clusterPointsList.map((p) => (0, distance_js_1.haversineDistance)(p, centroid)), 0);
        clusters.push({
            id: clusters.length,
            points: clusterPointsList,
            centroid,
            radius,
            density: clusterPointsList.length / (Math.PI * Math.max(radius, 1) ** 2),
        });
    });
    return clusters;
};
exports.clusterPoints = clusterPoints;
const calculateCentroid = (points) => {
    const sum = points.reduce((acc, point) => {
        acc.lat += point.latitude;
        acc.lon += point.longitude;
        return acc;
    }, { lat: 0, lon: 0 });
    return {
        latitude: sum.lat / Math.max(points.length, 1),
        longitude: sum.lon / Math.max(points.length, 1),
    };
};
