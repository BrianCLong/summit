import { describe, it, expect } from 'vitest';
import { ConnectorRuntimeContractV1, ConnectorRecordV1 } from '../src/v1/connector_contract.js';
import tinyFixture from '../fixtures/tiny.json';
import typicalFixture from '../fixtures/typical.json';
import adversarialFixture from '../fixtures/adversarial.json';
import { z } from 'zod';

const z_array_record = z.array(ConnectorRecordV1);

describe('Connector Contract Verification', () => {
  it('should validate a basic connector manifest and output', () => {
    const mockOutput = [
      {
        id: 'rec_123',
        source_id: '1',
        entity_type: 'Person',
        properties: { name: 'Alice' },
        lineage: {
          source_connector: 'test-connector',
          ingestion_timestamp: new Date().toISOString(),
          connector_version: '1.0.0',
        },
      },
    ];

    const result = z_array_record.safeParse(mockOutput);
    expect(result.success).toBe(true);
  });

  describe('Golden Fixtures Validation', () => {
    it('should match the contract for the tiny fixture', () => {
      expect(tinyFixture.name).toBe('tiny-dataset');
      expect(tinyFixture.records.length).toBe(1);
    });

    it('should match the contract for the typical fixture', () => {
      expect(typicalFixture.records.length).toBe(3);
      expect(typicalFixture.records[0].entity_type).toBe('Person');
    });

    it('should handle the adversarial fixture with expected errors', () => {
      expect(adversarialFixture.records.length).toBe(3);
    });
  });
});
