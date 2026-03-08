"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, path_1.dirname)(__filename);
describe('Connector Configuration Smoke Test', () => {
    test('postgres-connector.json is valid JSON and has required fields', () => {
        const configPath = (0, path_1.join)(__dirname, '../../cdc/postgres-connector.json');
        const configRaw = (0, fs_1.readFileSync)(configPath, 'utf8');
        const config = JSON.parse(configRaw);
        expect(config.name).toBe('postgres-connector');
        expect(config.config['connector.class']).toBe('io.debezium.connector.postgresql.PostgresConnector');
        expect(config.config['tombstones.on.delete']).toBe('true');
        // Ensure unwrap is NOT present as per review feedback
        expect(config.config['transforms']).toBeUndefined();
    });
});
