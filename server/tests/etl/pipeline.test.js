"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pipeline_1 = require("../../src/etl/pipeline");
const csv_s3_1 = require("../../src/connectors/implementations/csv-s3");
const implementations_1 = require("../../src/ingest/enrichers/implementations");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Mock Ledger
const mockLedger = {
    appendEntry: globals_1.jest.fn().mockResolvedValue({ id: 'prov-1' })
};
(0, globals_1.describe)('ETLPipeline', () => {
    const testFile = path.join(__dirname, 'test_pipeline.csv');
    (0, globals_1.beforeAll)(() => {
        fs.writeFileSync(testFile, 'id,ip\n1,8.8.8.8');
    });
    (0, globals_1.afterAll)(() => {
        if (fs.existsSync(testFile))
            fs.unlinkSync(testFile);
    });
    test('should run pipeline end-to-end', async () => {
        const connector = new csv_s3_1.CSVConnector({
            id: 'csv-pipe-1',
            name: 'Pipeline Test',
            type: 'csv',
            tenantId: 't1',
            config: { path: testFile }
        });
        const enricher = new implementations_1.GeoIPEnricher({
            id: 'geo-1',
            type: 'geoip',
            config: { ipField: 'ip' }
        });
        const destination = new pipeline_1.MockGraphDestination();
        const spyDest = globals_1.jest.spyOn(destination, 'write');
        const pipeline = new pipeline_1.ETLPipeline(connector, [enricher], destination, mockLedger, { tenantId: 't1' });
        await pipeline.run();
        // Verify destination write
        (0, globals_1.expect)(spyDest).toHaveBeenCalledTimes(1);
        const args = spyDest.mock.calls[0];
        // args[0] is event, args[1] is enriched data
        (0, globals_1.expect)(args[1]).toHaveProperty('geo');
        (0, globals_1.expect)(args[1].geo.country).toBe('US');
        // Verify provenance
        (0, globals_1.expect)(mockLedger.appendEntry).toHaveBeenCalledTimes(1);
    });
});
