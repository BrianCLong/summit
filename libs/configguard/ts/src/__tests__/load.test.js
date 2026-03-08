"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const parse_1 = require("../parse");
const validate_1 = require("../validate");
const FIXTURES = (0, node_path_1.join)(__dirname, 'fixtures');
const SCHEMA = (0, node_path_1.join)(FIXTURES, 'service.schema.json');
describe('configguard load', () => {
    beforeEach(() => {
        delete process.env.DATABASE_URL;
        delete process.env.SERVICE_NAME;
    });
    it('returns diagnostics for invalid config', () => {
        const file = (0, node_path_1.join)(FIXTURES, 'invalid.yaml');
        const result = (0, parse_1.loadConfig)(file, SCHEMA);
        expect(result.diagnostics.some((d) => d.code === 'required' || d.code === 'enum')).toBe(true);
        const enumDiag = result.diagnostics.find((d) => d.code === 'enum');
        expect(enumDiag?.hint).toContain('Allowed values');
        const typeDiag = result.diagnostics.find((d) => d.code === 'type');
        expect(typeDiag?.pointer).toContain('port');
    });
    it('loads valid config with interpolation defaults', () => {
        const file = (0, node_path_1.join)(FIXTURES, 'interpolation.yaml');
        const policy = {
            allowList: ['SERVICE_NAME', 'DATABASE_URL'],
            defaults: { DATABASE_URL: 'postgres://localhost:5432/app' },
            onMissing: 'warn',
        };
        const result = (0, parse_1.loadConfig)(file, SCHEMA, { interpolation: policy });
        expect(result.config).toBeTruthy();
        const config = result.config;
        expect(config.serviceName).toBe('intelgraph-dev');
        expect(config.database).toEqual({ url: 'postgres://localhost:5432/app' });
        expect(result.diagnostics).toHaveLength(0);
    });
    it('fails when interpolation policy denies env var', () => {
        const file = (0, node_path_1.join)(FIXTURES, 'valid.yaml');
        process.env.DATABASE_URL = 'postgres://remote:5432/app';
        const policy = {
            denyList: ['DATABASE_URL'],
        };
        const result = (0, parse_1.loadConfig)(file, SCHEMA, { interpolation: policy });
        const error = result.diagnostics.find((d) => d.severity === 'error');
        expect(error?.message).toContain('blocked by policy');
    });
});
describe('configguard validate', () => {
    it('produces empty diagnostics for valid object', () => {
        const obj = {
            serviceName: 'intelgraph-api',
            port: 8080,
            mode: 'production',
            database: { url: 'https://example.com/db' },
        };
        const diagnostics = (0, validate_1.validate)(obj, SCHEMA, {});
        expect(diagnostics).toHaveLength(0);
    });
});
