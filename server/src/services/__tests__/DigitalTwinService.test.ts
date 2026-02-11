import { describe, it, expect, beforeEach } from '@jest/globals';
import { DigitalTwinService } from '../DigitalTwinService.js';
import { AssetType, HealthStatus, TwinSyncState, SensorReading } from '../../types/digitalTwin.js';

describe('DigitalTwinService', () => {
  let service: DigitalTwinService;

  beforeEach(() => {
    service = new DigitalTwinService();
  });

  describe('Asset Management', () => {
    it('should create an asset', async () => {
      const input = {
        name: 'Test Building',
        type: AssetType.BUILDING,
        geometry: {
          type: 'Point',
          coordinates: [0, 0]
        },
        metadata: { owner: 'Test Corp' }
      };

      const asset = await service.createAsset(input);

      expect(asset.id).toBeDefined();
      expect(asset.name).toBe(input.name);
      expect(asset.type).toBe(input.type);
      expect(asset.syncState).toBe(TwinSyncState.SYNCED);
      expect(asset.healthStatus).toBe(HealthStatus.GOOD);
    });

    it('should get an asset', async () => {
      const created = await service.createAsset({
        name: 'Test Asset',
        type: AssetType.UTILITY,
        geometry: { type: 'Point', coordinates: [1, 1] }
      });

      const fetched = await service.getAsset(created.id);
      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(created.id);
    });

    it('should update an asset', async () => {
      const created = await service.createAsset({
        name: 'Original Name',
        type: AssetType.ROAD,
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
      });

      const updated = await service.updateAsset(created.id, {
        name: 'New Name'
      });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe(AssetType.ROAD); // Should persist
    });

    it('should delete an asset', async () => {
      const created = await service.createAsset({
        name: 'To Delete',
        type: AssetType.GREEN_SPACE,
        geometry: { type: 'Point', coordinates: [0, 0] }
      });

      const result = await service.deleteAsset(created.id);
      expect(result).toBe(true);

      const fetched = await service.getAsset(created.id);
      expect(fetched).toBeNull();
    });
  });

  describe('Sensor Integration', () => {
    it('should ingest sensor data and update buffer', async () => {
      const asset = await service.createAsset({
        name: 'Sensor Asset',
        type: AssetType.POWER_GRID,
        geometry: { type: 'Point', coordinates: [0, 0] },
        sensorBindings: [{
          sensorId: 'sensor-1',
          sensorType: 'voltage',
          dataPath: 'v',
          updateInterval: 1000
        }]
      });

      const reading: SensorReading = {
        sensorId: 'sensor-1',
        timestamp: new Date(),
        value: 120,
        quality: 'HIGH'
      };

      await service.ingestSensorData(asset.id, reading);

      // Verify update (implementation detail check via public method if possible,
      // otherwise rely on syncAssetState to use it)
      const synced = await service.syncAssetState(asset.id);
      expect(synced.lastSync).toBeDefined();
    });

    it('should calculate health score based on sensor data', async () => {
        const asset = await service.createAsset({
          name: 'Health Asset',
          type: AssetType.BRIDGE,
          geometry: { type: 'Point', coordinates: [0, 0] },
          sensorBindings: [{
            sensorId: 's1',
            sensorType: 'strain',
            dataPath: 'val',
            updateInterval: 1000
          }]
        });

        // Ingest high quality data
        await service.ingestSensorData(asset.id, {
          sensorId: 's1',
          timestamp: new Date(),
          value: 50,
          quality: 'HIGH'
        });

        const synced = await service.syncAssetState(asset.id);
        expect(synced.healthScore).toBe(100);
        expect(synced.healthStatus).toBe(HealthStatus.EXCELLENT);
    });
  });

  describe('Query and Export', () => {
    it('should query assets by type', async () => {
      await service.createAsset({ name: 'A1', type: AssetType.BUILDING, geometry: { type: 'Point', coordinates: [0, 0] } });
      await service.createAsset({ name: 'A2', type: AssetType.ROAD, geometry: { type: 'Point', coordinates: [0, 0] } });

      const results = await service.queryAssets({ types: [AssetType.BUILDING] });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('A1');
    });

    it('should export to GeoJSON', async () => {
      await service.createAsset({
        name: 'Geo Asset',
        type: AssetType.BUILDING,
        geometry: { type: 'Point', coordinates: [10, 20] }
      });

      const geojson = await service.exportToGeoJSON();
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(1);
      expect(geojson.features[0].geometry.coordinates).toEqual([10, 20]);
    });
  });
});
