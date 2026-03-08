"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const csv_1 = require("../src/connectors/csv");
const rss_1 = require("../src/connectors/rss");
const misp_1 = require("../src/connectors/misp");
(0, vitest_1.describe)('Ingest Connectors', () => {
    (0, vitest_1.it)('CsvConnector should discover resources', async () => {
        const connector = new csv_1.CsvConnector();
        const resources = await connector.discover();
        (0, vitest_1.expect)(resources).toHaveLength(1);
        (0, vitest_1.expect)(resources[0].type).toBe('csv');
    });
    (0, vitest_1.it)('RssConnector should discover resources', async () => {
        const connector = new rss_1.RssConnector();
        const resources = await connector.discover();
        (0, vitest_1.expect)(resources).toHaveLength(1);
        (0, vitest_1.expect)(resources[0].type).toBe('rss');
    });
    (0, vitest_1.it)('MispConnector should discover resources', async () => {
        const connector = new misp_1.MispConnector();
        const resources = await connector.discover();
        (0, vitest_1.expect)(resources).toHaveLength(1);
        (0, vitest_1.expect)(resources[0].type).toBe('misp');
    });
});
