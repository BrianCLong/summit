// Mock config before any imports to prevent process.exit
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
jest.mock('../../src/config.js', () => ({
  cfg: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NEO4J_URI: 'bolt://localhost:7687',
    NEO4J_USER: 'neo4j',
    NEO4J_PASSWORD: 'test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ISSUER: 'test',
  },
}));

import { CSVConnector } from '../../src/connectors/implementations/csv-s3';
import { ConnectorConfig } from '../../src/connectors/types';
import * as fs from 'fs';
import * as path from 'path';

describe('CSVConnector', () => {
    const testFile = path.join(__dirname, 'test.csv');

    beforeAll(() => {
        fs.writeFileSync(testFile, 'id,name\n1,Test\n2,User');
    });

    afterAll(() => {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    const config: ConnectorConfig = {
        id: 'csv-1',
        name: 'CSV Test',
        type: 'csv',
        tenantId: 'tenant-1',
        config: { path: testFile }
    };

    test('should read CSV file', async () => {
        const connector = new CSVConnector(config);
        const stream = await connector.readStream();

        const data: any[] = [];
        for await (const chunk of stream) {
            data.push(chunk);
        }

        expect(data.length).toBe(2);
        expect(data[0].data.name).toBe('Test');
    });

    test('should fetch schema', async () => {
        const connector = new CSVConnector(config);
        const schema = await connector.fetchSchema();
        expect(schema.fields).toHaveLength(2);
        expect(schema.fields[0].name).toBe('id');
    });
});
