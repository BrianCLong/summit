"use strict";
/**
 * Digital Twin Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DigitalTwinService_js_1 = require("../services/DigitalTwinService.js");
const digitalTwin_js_1 = require("../types/digitalTwin.js");
(0, globals_1.describe)('DigitalTwinService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new DigitalTwinService_js_1.DigitalTwinService();
    });
    (0, globals_1.describe)('createAsset', () => {
        (0, globals_1.it)('should create a digital twin asset with valid input', async () => {
            const input = {
                name: 'City Hall',
                type: digitalTwin_js_1.AssetType.BUILDING,
                geometry: {
                    type: 'Point',
                    coordinates: [-122.4194, 37.7749],
                },
                tags: ['government', 'historic'],
            };
            const asset = await service.createAsset(input);
            (0, globals_1.expect)(asset.id).toBeDefined();
            (0, globals_1.expect)(asset.name).toBe('City Hall');
            (0, globals_1.expect)(asset.type).toBe(digitalTwin_js_1.AssetType.BUILDING);
            (0, globals_1.expect)(asset.healthStatus).toBe(digitalTwin_js_1.HealthStatus.GOOD);
            (0, globals_1.expect)(asset.syncState).toBe(digitalTwin_js_1.TwinSyncState.SYNCED);
            (0, globals_1.expect)(asset.healthScore).toBe(100);
        });
        (0, globals_1.it)('should link child to parent asset', async () => {
            const parent = await service.createAsset({
                name: 'Power Grid Zone A',
                type: digitalTwin_js_1.AssetType.POWER_GRID,
                geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
            });
            const child = await service.createAsset({
                name: 'Substation 1',
                type: digitalTwin_js_1.AssetType.UTILITY,
                geometry: { type: 'Point', coordinates: [0.5, 0.5] },
                parentId: parent.id,
            });
            (0, globals_1.expect)(child.parentId).toBe(parent.id);
            const updatedParent = await service.getAsset(parent.id);
            (0, globals_1.expect)(updatedParent?.childIds).toContain(child.id);
        });
    });
    (0, globals_1.describe)('getAsset', () => {
        (0, globals_1.it)('should return null for non-existent asset', async () => {
            const result = await service.getAsset('non-existent-id');
            (0, globals_1.expect)(result).toBeNull();
        });
        (0, globals_1.it)('should return asset by id', async () => {
            const created = await service.createAsset({
                name: 'Test Bridge',
                type: digitalTwin_js_1.AssetType.BRIDGE,
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            });
            const result = await service.getAsset(created.id);
            (0, globals_1.expect)(result?.name).toBe('Test Bridge');
        });
    });
    (0, globals_1.describe)('updateAsset', () => {
        (0, globals_1.it)('should update asset properties', async () => {
            const asset = await service.createAsset({
                name: 'Original Name',
                type: digitalTwin_js_1.AssetType.ROAD,
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            });
            const updated = await service.updateAsset(asset.id, {
                name: 'Updated Name',
                tags: ['highway'],
            });
            (0, globals_1.expect)(updated.name).toBe('Updated Name');
            (0, globals_1.expect)(updated.tags).toContain('highway');
        });
        (0, globals_1.it)('should throw for non-existent asset', async () => {
            await (0, globals_1.expect)(service.updateAsset('fake-id', { name: 'Test' }))
                .rejects.toThrow('Asset not found');
        });
    });
    (0, globals_1.describe)('deleteAsset', () => {
        (0, globals_1.it)('should delete asset and return true', async () => {
            const asset = await service.createAsset({
                name: 'To Delete',
                type: digitalTwin_js_1.AssetType.UTILITY,
                geometry: { type: 'Point', coordinates: [0, 0] },
            });
            const result = await service.deleteAsset(asset.id);
            (0, globals_1.expect)(result).toBe(true);
            const check = await service.getAsset(asset.id);
            (0, globals_1.expect)(check).toBeNull();
        });
        (0, globals_1.it)('should return false for non-existent asset', async () => {
            const result = await service.deleteAsset('fake-id');
            (0, globals_1.expect)(result).toBe(false);
        });
    });
    (0, globals_1.describe)('queryAssets', () => {
        (0, globals_1.beforeEach)(async () => {
            await service.createAsset({
                name: 'Building A',
                type: digitalTwin_js_1.AssetType.BUILDING,
                geometry: { type: 'Point', coordinates: [0, 0] },
                tags: ['commercial'],
            });
            await service.createAsset({
                name: 'Bridge B',
                type: digitalTwin_js_1.AssetType.BRIDGE,
                geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
                tags: ['critical'],
            });
            await service.createAsset({
                name: 'Building C',
                type: digitalTwin_js_1.AssetType.BUILDING,
                geometry: { type: 'Point', coordinates: [1, 1] },
                tags: ['residential'],
            });
        });
        (0, globals_1.it)('should filter by asset type', async () => {
            const results = await service.queryAssets({ types: [digitalTwin_js_1.AssetType.BUILDING] });
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.every(a => a.type === digitalTwin_js_1.AssetType.BUILDING)).toBe(true);
        });
        (0, globals_1.it)('should filter by tags', async () => {
            const results = await service.queryAssets({ tags: ['critical'] });
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].name).toBe('Bridge B');
        });
    });
    (0, globals_1.describe)('ingestSensorData', () => {
        (0, globals_1.it)('should buffer sensor readings', async () => {
            const asset = await service.createAsset({
                name: 'Monitored Asset',
                type: digitalTwin_js_1.AssetType.UTILITY,
                geometry: { type: 'Point', coordinates: [0, 0] },
                sensorBindings: [{ sensorId: 'sensor-1', sensorType: 'temperature', dataPath: '/temp', updateInterval: 60 }],
            });
            await service.ingestSensorData(asset.id, {
                sensorId: 'sensor-1',
                timestamp: new Date(),
                value: 25.5,
                unit: 'celsius',
                quality: 'HIGH',
            });
            const updated = await service.getAsset(asset.id);
            (0, globals_1.expect)(updated?.syncState).toBe(digitalTwin_js_1.TwinSyncState.SYNCED);
        });
    });
    (0, globals_1.describe)('exportToGeoJSON', () => {
        (0, globals_1.it)('should export assets as GeoJSON FeatureCollection', async () => {
            await service.createAsset({
                name: 'Export Test',
                type: digitalTwin_js_1.AssetType.BUILDING,
                geometry: { type: 'Point', coordinates: [10, 20] },
            });
            const geojson = await service.exportToGeoJSON();
            (0, globals_1.expect)(geojson.type).toBe('FeatureCollection');
            (0, globals_1.expect)(geojson.features).toHaveLength(1);
            (0, globals_1.expect)(geojson.features[0].properties.name).toBe('Export Test');
        });
    });
});
