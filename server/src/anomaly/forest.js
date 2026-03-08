"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isolationForest = void 0;
exports.features = features;
exports.score = score;
const anomaly_js_1 = require("../anomaly.js");
const MODEL_VERSION = 'isolation-forest-lite-v1';
const DEFAULT_CONTAMINATION = 0.15;
function quantile(values, q) {
    if (!values.length)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
}
function medianAbsoluteDeviation(values, med) {
    if (!values.length)
        return 0;
    const deviations = values.map((value) => Math.abs(value - med));
    return (0, anomaly_js_1.median)(deviations);
}
function robustZ(value, med, mad) {
    return mad ? Math.abs(value - med) / (1.4826 * mad) : 0;
}
function features(graph) {
    const adjacency = new Map();
    graph.nodes.forEach((node) => adjacency.set(node.id, []));
    for (const edge of graph.edges) {
        if (adjacency.has(edge.source)) {
            adjacency.get(edge.source).push(edge);
        }
        if (adjacency.has(edge.target)) {
            adjacency.get(edge.target).push(edge);
        }
    }
    const degrees = {};
    for (const [nodeId, edges] of adjacency.entries()) {
        degrees[nodeId] = edges.length;
    }
    const maxDegree = Math.max(...Object.values(degrees), 1);
    return graph.nodes.map((node) => {
        const nodeEdges = adjacency.get(node.id) ?? [];
        const neighborIds = nodeEdges.reduce((acc, edge) => {
            if (edge.source !== node.id)
                acc.push(edge.source);
            if (edge.target !== node.id)
                acc.push(edge.target);
            return acc;
        }, []);
        const neighborDegreeValues = neighborIds.map((id) => degrees[id] ?? 0);
        const neighborDegree = neighborDegreeValues.length
            ? neighborDegreeValues.reduce((a, b) => a + b, 0) / neighborDegreeValues.length
            : 0;
        const typeDiversity = new Set(nodeEdges.map((edge) => edge.type ?? 'UNKNOWN')).size;
        const tags = node.tags ?? (Array.isArray(node.properties?.tags) ? node.properties.tags : []);
        return {
            nodeId: node.id,
            degree: nodeEdges.length,
            typeDiversity,
            tagCount: tags.length,
            neighborDegree,
            normalizedDegree: nodeEdges.length / maxDegree,
            labels: node.labels ?? [],
        };
    });
}
const isolationForest = {
    fit_transform(input, contamination = DEFAULT_CONTAMINATION) {
        if (!input.length) {
            return {
                summary: {
                    totalNodes: 0,
                    totalEdges: 0,
                    anomalyCount: 0,
                    threshold: 0,
                    modelVersion: MODEL_VERSION,
                },
                nodes: [],
            };
        }
        const degrees = input.map((item) => item.degree);
        const typeDiversity = input.map((item) => item.typeDiversity);
        const neighborDegrees = input.map((item) => item.neighborDegree);
        const tags = input.map((item) => item.tagCount);
        const degreeMedian = (0, anomaly_js_1.median)(degrees);
        const typeMedian = (0, anomaly_js_1.median)(typeDiversity);
        const neighborMedian = (0, anomaly_js_1.median)(neighborDegrees);
        const tagMedian = (0, anomaly_js_1.median)(tags);
        const degreeMad = medianAbsoluteDeviation(degrees, degreeMedian);
        const typeMad = medianAbsoluteDeviation(typeDiversity, typeMedian);
        const neighborMad = medianAbsoluteDeviation(neighborDegrees, neighborMedian);
        const tagMad = medianAbsoluteDeviation(tags, tagMedian);
        const scores = input.map((item) => {
            const zDegree = robustZ(item.degree, degreeMedian, degreeMad);
            const zType = robustZ(item.typeDiversity, typeMedian, typeMad);
            const zNeighbor = robustZ(item.neighborDegree, neighborMedian, neighborMad);
            const zTags = robustZ(item.tagCount, tagMedian, tagMad);
            return Number(((zDegree + zType + zNeighbor + zTags) / 4).toFixed(6));
        });
        const effectiveContamination = Math.min(Math.max(contamination, 1 / input.length), 0.5);
        const threshold = quantile(scores, 1 - effectiveContamination);
        const nodes = input.map((item, index) => {
            const score = scores[index];
            const isAnomaly = score >= threshold;
            const reasons = [];
            if (robustZ(item.degree, degreeMedian, degreeMad) >= threshold) {
                reasons.push('degree');
            }
            if (robustZ(item.typeDiversity, typeMedian, typeMad) >= threshold) {
                reasons.push('edge-type-diversity');
            }
            if (robustZ(item.neighborDegree, neighborMedian, neighborMad) >= threshold) {
                reasons.push('neighbor-degree');
            }
            if (robustZ(item.tagCount, tagMedian, tagMad) >= threshold) {
                reasons.push('tag-count');
            }
            return {
                id: item.nodeId,
                score,
                isAnomaly,
                metrics: {
                    degree: item.degree,
                    typeDiversity: item.typeDiversity,
                    tagCount: item.tagCount,
                    neighborDegree: Number(item.neighborDegree.toFixed(3)),
                    normalizedDegree: Number(item.normalizedDegree.toFixed(3)),
                },
                labels: item.labels,
                reason: reasons.length ? `High variance in ${reasons.join(', ')}` : 'Within expected range',
            };
        });
        const anomalyCount = nodes.filter((node) => node.isAnomaly).length;
        return {
            summary: {
                totalNodes: input.length,
                totalEdges: input.reduce((acc, item) => acc + item.degree, 0) / 2,
                anomalyCount,
                threshold,
                modelVersion: MODEL_VERSION,
            },
            nodes,
        };
    },
};
exports.isolationForest = isolationForest;
function score(graph) {
    return isolationForest.fit_transform(features(graph));
}
