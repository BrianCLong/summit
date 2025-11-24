/**
 * Tests for ScenarioGenerator
 */

import { ScenarioGenerator } from '../src/generators/ScenarioGenerator';
import { ScenarioParameters } from '../src/types';

describe('ScenarioGenerator', () => {
  let generator: ScenarioGenerator;

  beforeEach(() => {
    generator = new ScenarioGenerator(12345);
  });

  describe('Deterministic Generation', () => {
    it('should generate identical scenarios with same seed', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
        seed: 42,
      };

      const gen1 = new ScenarioGenerator(42);
      const gen2 = new ScenarioGenerator(42);

      const scenario1 = await gen1.generate(params);
      const scenario2 = await gen2.generate(params);

      expect(scenario1.entities.length).toBe(scenario2.entities.length);
      expect(scenario1.relationships.length).toBe(scenario2.relationships.length);
      expect(scenario1.entities[0].name).toBe(scenario2.entities[0].name);
    });

    it('should generate different scenarios with different seeds', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
        seed: 42,
      };

      const gen1 = new ScenarioGenerator(42);
      const gen2 = new ScenarioGenerator(99);

      const scenario1 = await gen1.generate({ ...params, seed: 42 });
      const scenario2 = await gen2.generate({ ...params, seed: 99 });

      expect(scenario1.entities[0].name).not.toBe(scenario2.entities[0].name);
    });
  });

  describe('Fraud Ring Scenario', () => {
    it('should generate fraud ring with expected structure', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'medium',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      expect(scenario.investigation.type).toBe('FRAUD_INVESTIGATION');
      expect(scenario.entities.length).toBeGreaterThan(0);
      expect(scenario.relationships.length).toBeGreaterThan(0);
      expect(scenario.metadata?.parameters.type).toBe('fraud-ring');

      // Check for expected entity types
      const people = scenario.entities.filter((e) => e.type === 'PERSON');
      const orgs = scenario.entities.filter((e) => e.type === 'ORGANIZATION');
      const accounts = scenario.entities.filter((e) => e.type === 'ACCOUNT');

      expect(people.length).toBeGreaterThan(0);
      expect(orgs.length).toBeGreaterThan(0);
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('should include key fraud patterns', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.0,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      // Check for control/ownership relationships
      const controlRels = scenario.relationships.filter(
        (r) => r.type === 'CONTROLS' || r.type === 'OWNS'
      );
      expect(controlRels.length).toBeGreaterThan(0);

      // Check for transaction relationships
      const transactionRels = scenario.relationships.filter(
        (r) => r.type === 'TRANSACTED_WITH'
      );
      expect(transactionRels.length).toBeGreaterThan(0);
    });
  });

  describe('Terror Cell Scenario', () => {
    it('should generate terror cell with hierarchical structure', async () => {
      const params: ScenarioParameters = {
        type: 'terror-cell',
        size: 'medium',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      expect(scenario.investigation.type).toBe('THREAT_ANALYSIS');

      // Check for people with roles
      const people = scenario.entities.filter((e) => e.type === 'PERSON');
      const leaders = people.filter(
        (p) => p.properties.role === 'cell_leader'
      );
      const operatives = people.filter(
        (p) => p.properties.role === 'operative'
      );

      expect(leaders.length).toBeGreaterThan(0);
      expect(operatives.length).toBeGreaterThan(0);

      // Check for locations
      const locations = scenario.entities.filter((e) => e.type === 'LOCATION');
      expect(locations.length).toBeGreaterThan(0);
    });
  });

  describe('Corruption Network Scenario', () => {
    it('should generate corruption network with officials and businesses', async () => {
      const params: ScenarioParameters = {
        type: 'corruption-network',
        size: 'medium',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      expect(scenario.investigation.type).toBe('CORRUPTION_INVESTIGATION');

      // Check for government officials
      const officials = scenario.entities.filter(
        (e) =>
          e.type === 'PERSON' &&
          e.properties.role === 'government_official'
      );
      expect(officials.length).toBeGreaterThan(0);

      // Check for businesses
      const businesses = scenario.entities.filter(
        (e) => e.type === 'ORGANIZATION'
      );
      expect(businesses.length).toBeGreaterThan(0);
    });
  });

  describe('Noise and Data Quality', () => {
    it('should apply noise to entities', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.5,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      const noisyEntities = scenario.entities.filter(
        (e) => e.properties.noise_flag
      );
      expect(noisyEntities.length).toBeGreaterThan(0);
    });

    it('should apply missing data', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.0,
        missingDataRate: 0.5,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);

      // Some entities should have fewer properties
      const avgPropsWithoutMissing = 3;
      const actualAvgProps =
        scenario.entities.reduce(
          (sum, e) => sum + Object.keys(e.properties).length,
          0
        ) / scenario.entities.length;

      expect(actualAvgProps).toBeLessThan(avgPropsWithoutMissing);
    });

    it('should apply conflicting evidence', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'medium',
        noiseLevel: 0.0,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.3,
      };

      const scenario = await generator.generate(params);

      const conflictingEntities = scenario.entities.filter(
        (e) => e.properties.conflicting_data
      );
      expect(conflictingEntities.length).toBeGreaterThan(0);
    });
  });

  describe('Size Configuration', () => {
    it('should generate small graphs', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'small',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);
      expect(scenario.entities.length).toBeLessThanOrEqual(25);
    });

    it('should generate medium graphs', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'medium',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);
      expect(scenario.entities.length).toBeGreaterThan(25);
      expect(scenario.entities.length).toBeLessThanOrEqual(75);
    });

    it('should generate large graphs', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'large',
        noiseLevel: 0.1,
        missingDataRate: 0.0,
        conflictingEvidenceRate: 0.0,
      };

      const scenario = await generator.generate(params);
      expect(scenario.entities.length).toBeGreaterThan(75);
    });
  });

  describe('Metadata', () => {
    it('should include metadata with generation parameters', async () => {
      const params: ScenarioParameters = {
        type: 'fraud-ring',
        size: 'medium',
        noiseLevel: 0.1,
        missingDataRate: 0.05,
        conflictingEvidenceRate: 0.03,
        seed: 42,
      };

      const scenario = await generator.generate(params);

      expect(scenario.metadata).toBeDefined();
      expect(scenario.metadata?.seed).toBe(42);
      expect(scenario.metadata?.generatedAt).toBeDefined();
      expect(scenario.metadata?.parameters).toEqual(params);
    });
  });
});
