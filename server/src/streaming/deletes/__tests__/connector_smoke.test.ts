import { jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Connector Configuration Smoke Test', () => {
  test('postgres-connector.json is valid JSON and has required fields', () => {
    const configPath = join(__dirname, '../../cdc/postgres-connector.json');
    const configRaw = readFileSync(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    expect(config.name).toBe('postgres-connector');
    expect(config.config['connector.class']).toBe('io.debezium.connector.postgresql.PostgresConnector');
    expect(config.config['tombstones.on.delete']).toBe('true');
    // Ensure unwrap is NOT present as per review feedback
    expect(config.config['transforms']).toBeUndefined();
  });
});
