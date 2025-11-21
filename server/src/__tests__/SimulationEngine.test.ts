/**
 * Simulation Engine Tests
 */

import { SimulationEngine } from '../simulation/SimulationEngine';
import { ScenarioType, DisasterSubtype, AssetType, HealthStatus, TwinSyncState, DigitalTwinAsset } from '../types/digitalTwin';

describe('SimulationEngine', () => {
  let engine: SimulationEngine;
  let testAssets: DigitalTwinAsset[];

  beforeEach(() => {
    engine = new SimulationEngine({ maxIterations: 100 });
    testAssets = [
      {
        id: 'asset-1',
        name: 'Test Building',
        type: AssetType.BUILDING,
        geometry: { type: 'Point', coordinates: [0, 0] },
        metadata: { constructionDate: new Date('2000-01-01') },
        sensorBindings: [],
        lastSync: new Date(),
        syncState: TwinSyncState.SYNCED,
        healthStatus: HealthStatus.GOOD,
        healthScore: 80,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'asset-2',
        name: 'Test Bridge',
        type: AssetType.BRIDGE,
        geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
        metadata: { constructionDate: new Date('1990-01-01') },
        sensorBindings: [],
        lastSync: new Date(),
        syncState: TwinSyncState.SYNCED,
        healthStatus: HealthStatus.FAIR,
        healthScore: 55,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('createScenario', () => {
    it('should create a disaster simulation scenario', async () => {
      const scenario = await engine.createScenario(
        'Earthquake Test',
        ScenarioType.DISASTER,
        { duration: 3600, timeStep: 60, intensity: 6.5 },
        DisasterSubtype.EARTHQUAKE
      );

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Earthquake Test');
      expect(scenario.type).toBe(ScenarioType.DISASTER);
      expect(scenario.subtype).toBe(DisasterSubtype.EARTHQUAKE);
      expect(scenario.status).toBe('PENDING');
    });

    it('should create an urban planning scenario', async () => {
      const scenario = await engine.createScenario(
        'Density Analysis',
        ScenarioType.URBAN_PLANNING,
        { duration: 86400, timeStep: 3600 }
      );

      expect(scenario.type).toBe(ScenarioType.URBAN_PLANNING);
    });
  });

  describe('runSimulation', () => {
    it('should run a disaster simulation and return results', async () => {
      const scenario = await engine.createScenario(
        'Flood Simulation',
        ScenarioType.DISASTER,
        { duration: 3600, timeStep: 60, intensity: 3 },
        DisasterSubtype.FLOOD
      );

      const result = await engine.runSimulation(scenario.id, testAssets);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.affectedAssets).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should run a maintenance simulation', async () => {
      const scenario = await engine.createScenario(
        'Maintenance Forecast',
        ScenarioType.MAINTENANCE,
        { duration: 86400 * 365, timeStep: 86400 }
      );

      const result = await engine.runSimulation(scenario.id, testAssets);

      expect(result.predictions).toBeDefined();
      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it('should throw for non-existent scenario', async () => {
      await expect(engine.runSimulation('fake-id', testAssets))
        .rejects.toThrow('Scenario not found');
    });
  });

  describe('getScenario', () => {
    it('should retrieve scenario by id', async () => {
      const created = await engine.createScenario(
        'Test Scenario',
        ScenarioType.TRAFFIC,
        { duration: 3600, timeStep: 60 }
      );

      const retrieved = await engine.getScenario(created.id);
      expect(retrieved?.name).toBe('Test Scenario');
    });

    it('should return null for non-existent scenario', async () => {
      const result = await engine.getScenario('non-existent');
      expect(result).toBeNull();
    });
  });
});
