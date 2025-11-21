/**
 * Digital Twin Service Tests
 */

import { DigitalTwinService } from '../services/DigitalTwinService';
import { AssetType, TwinSyncState, HealthStatus, CreateAssetInput } from '../types/digitalTwin';

describe('DigitalTwinService', () => {
  let service: DigitalTwinService;

  beforeEach(() => {
    service = new DigitalTwinService();
  });

  describe('createAsset', () => {
    it('should create a digital twin asset with valid input', async () => {
      const input: CreateAssetInput = {
        name: 'City Hall',
        type: AssetType.BUILDING,
        geometry: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749],
        },
        tags: ['government', 'historic'],
      };

      const asset = await service.createAsset(input);

      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('City Hall');
      expect(asset.type).toBe(AssetType.BUILDING);
      expect(asset.healthStatus).toBe(HealthStatus.GOOD);
      expect(asset.syncState).toBe(TwinSyncState.SYNCED);
      expect(asset.healthScore).toBe(100);
    });

    it('should link child to parent asset', async () => {
      const parent = await service.createAsset({
        name: 'Power Grid Zone A',
        type: AssetType.POWER_GRID,
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      });

      const child = await service.createAsset({
        name: 'Substation 1',
        type: AssetType.UTILITY,
        geometry: { type: 'Point', coordinates: [0.5, 0.5] },
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
      const updatedParent = await service.getAsset(parent.id);
      expect(updatedParent?.childIds).toContain(child.id);
    });
  });

  describe('getAsset', () => {
    it('should return null for non-existent asset', async () => {
      const result = await service.getAsset('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return asset by id', async () => {
      const created = await service.createAsset({
        name: 'Test Bridge',
        type: AssetType.BRIDGE,
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      });

      const result = await service.getAsset(created.id);
      expect(result?.name).toBe('Test Bridge');
    });
  });

  describe('updateAsset', () => {
    it('should update asset properties', async () => {
      const asset = await service.createAsset({
        name: 'Original Name',
        type: AssetType.ROAD,
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      });

      const updated = await service.updateAsset(asset.id, {
        name: 'Updated Name',
        tags: ['highway'],
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.tags).toContain('highway');
    });

    it('should throw for non-existent asset', async () => {
      await expect(service.updateAsset('fake-id', { name: 'Test' }))
        .rejects.toThrow('Asset not found');
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset and return true', async () => {
      const asset = await service.createAsset({
        name: 'To Delete',
        type: AssetType.UTILITY,
        geometry: { type: 'Point', coordinates: [0, 0] },
      });

      const result = await service.deleteAsset(asset.id);
      expect(result).toBe(true);

      const check = await service.getAsset(asset.id);
      expect(check).toBeNull();
    });

    it('should return false for non-existent asset', async () => {
      const result = await service.deleteAsset('fake-id');
      expect(result).toBe(false);
    });
  });

  describe('queryAssets', () => {
    beforeEach(async () => {
      await service.createAsset({
        name: 'Building A',
        type: AssetType.BUILDING,
        geometry: { type: 'Point', coordinates: [0, 0] },
        tags: ['commercial'],
      });
      await service.createAsset({
        name: 'Bridge B',
        type: AssetType.BRIDGE,
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        tags: ['critical'],
      });
      await service.createAsset({
        name: 'Building C',
        type: AssetType.BUILDING,
        geometry: { type: 'Point', coordinates: [1, 1] },
        tags: ['residential'],
      });
    });

    it('should filter by asset type', async () => {
      const results = await service.queryAssets({ types: [AssetType.BUILDING] });
      expect(results).toHaveLength(2);
      expect(results.every(a => a.type === AssetType.BUILDING)).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await service.queryAssets({ tags: ['critical'] });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bridge B');
    });
  });

  describe('ingestSensorData', () => {
    it('should buffer sensor readings', async () => {
      const asset = await service.createAsset({
        name: 'Monitored Asset',
        type: AssetType.UTILITY,
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
      expect(updated?.syncState).toBe(TwinSyncState.SYNCED);
    });
  });

  describe('exportToGeoJSON', () => {
    it('should export assets as GeoJSON FeatureCollection', async () => {
      await service.createAsset({
        name: 'Export Test',
        type: AssetType.BUILDING,
        geometry: { type: 'Point', coordinates: [10, 20] },
      });

      const geojson = await service.exportToGeoJSON();

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(1);
      expect(geojson.features[0].properties.name).toBe('Export Test');
    });
  });
});
