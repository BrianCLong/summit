import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvConnector } from '../src/connectors/csv';
import { RssConnector } from '../src/connectors/rss';
import { MispConnector } from '../src/connectors/misp';

describe('Ingest Connectors', () => {
    it('CsvConnector should discover resources', async () => {
        const connector = new CsvConnector();
        const resources = await connector.discover();
        expect(resources).toHaveLength(1);
        expect(resources[0].type).toBe('csv');
    });

    it('RssConnector should discover resources', async () => {
        const connector = new RssConnector();
        const resources = await connector.discover();
        expect(resources).toHaveLength(1);
        expect(resources[0].type).toBe('rss');
    });

    it('MispConnector should discover resources', async () => {
        const connector = new MispConnector();
        const resources = await connector.discover();
        expect(resources).toHaveLength(1);
        expect(resources[0].type).toBe('misp');
    });
});
