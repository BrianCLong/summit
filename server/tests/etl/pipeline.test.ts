
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ETLPipeline, MockGraphDestination } from '../../src/etl/pipeline';
import { CSVConnector } from '../../src/connectors/implementations/csv-s3';
import { GeoIPEnricher } from '../../src/ingest/enrichers/implementations';
import { ProvenanceLedgerV2 } from '../../src/provenance/ledger';
import * as fs from 'fs';
import * as path from 'path';

// Mock Ledger
const mockLedger = {
    appendEntry: jest.fn().mockResolvedValue({ id: 'prov-1' })
} as unknown as ProvenanceLedgerV2;

describe('ETLPipeline', () => {
    const testFile = path.join(__dirname, 'test_pipeline.csv');

    beforeAll(() => {
        fs.writeFileSync(testFile, 'id,ip\n1,8.8.8.8');
    });

    afterAll(() => {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    test('should run pipeline end-to-end', async () => {
        const connector = new CSVConnector({
            id: 'csv-pipe-1',
            name: 'Pipeline Test',
            type: 'csv',
            tenantId: 't1',
            config: { path: testFile }
        });

        const enricher = new GeoIPEnricher({
            id: 'geo-1',
            type: 'geoip',
            config: { ipField: 'ip' }
        });

        const destination = new MockGraphDestination();
        const spyDest = jest.spyOn(destination, 'write');

        const pipeline = new ETLPipeline(
            connector,
            [enricher],
            destination,
            mockLedger,
            { tenantId: 't1' }
        );

        await pipeline.run();

        // Verify destination write
        expect(spyDest).toHaveBeenCalledTimes(1);
        const args = spyDest.mock.calls[0];
        // args[0] is event, args[1] is enriched data
        expect(args[1]).toHaveProperty('geo');
        expect(args[1].geo.country).toBe('US');

        // Verify provenance
        expect(mockLedger.appendEntry).toHaveBeenCalledTimes(1);
    });
});
