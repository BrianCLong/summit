"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHeatmap = void 0;
const geometry_js_1 = require("../utils/geometry.js");
const generateHeatmap = (points, options = {}) => {
    const referenceBbox = options.bbox || (0, geometry_js_1.boundingBoxFromPoints)(points);
    const grid = (0, geometry_js_1.rectangularGrid)(referenceBbox, options.cellSizeKm ?? 5);
    const features = grid.map((cell, idx) => {
        const count = points.filter((p) => (0, geometry_js_1.pointInGeometry)(p, cell)).length;
        const properties = {
            id: `cell-${idx}`,
            count,
            intensity: count / Math.max(points.length, 1),
        };
        return {
            type: 'Feature',
            geometry: cell,
            properties,
        };
    });
    return { type: 'FeatureCollection', features, bbox: referenceBbox };
};
exports.generateHeatmap = generateHeatmap;
