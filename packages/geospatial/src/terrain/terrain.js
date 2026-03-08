"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTerrainMesh = void 0;
const generateTerrainMesh = (elevationGrid, bounds, options = {}) => {
    const rows = elevationGrid.length;
    const cols = elevationGrid[0]?.length || 0;
    const exaggeration = options.verticalExaggeration ?? 1;
    const lonStep = (bounds.maxLon - bounds.minLon) / Math.max(cols - 1, 1);
    const latStep = (bounds.maxLat - bounds.minLat) / Math.max(rows - 1, 1);
    const features = [];
    for (let r = 0; r < rows - 1; r += 1) {
        for (let c = 0; c < cols - 1; c += 1) {
            const lon = bounds.minLon + c * lonStep;
            const lat = bounds.minLat + r * latStep;
            const corners = [
                [lon, lat, elevationGrid[r][c] * exaggeration],
                [lon + lonStep, lat, elevationGrid[r][c + 1] * exaggeration],
                [lon + lonStep, lat + latStep, elevationGrid[r + 1][c + 1] * exaggeration],
                [lon, lat + latStep, elevationGrid[r + 1][c] * exaggeration],
                [lon, lat, elevationGrid[r][c] * exaggeration],
            ];
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [corners],
                },
                properties: {
                    minElevation: Math.min(elevationGrid[r][c], elevationGrid[r][c + 1], elevationGrid[r + 1][c], elevationGrid[r + 1][c + 1]),
                    maxElevation: Math.max(elevationGrid[r][c], elevationGrid[r][c + 1], elevationGrid[r + 1][c], elevationGrid[r + 1][c + 1]),
                },
            });
        }
    }
    return {
        type: 'FeatureCollection',
        features,
    };
};
exports.generateTerrainMesh = generateTerrainMesh;
