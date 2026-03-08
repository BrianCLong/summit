"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const release_1 = require("../src/commands/release");
const fs_1 = require("fs");
const path_1 = require("path");
describe('Maestro Release Dry-Run', () => {
    const testDir = (0, path_1.resolve)(process.cwd(), 'temp-test-dir');
    const resultFilePath = (0, path_1.resolve)(process.cwd(), 'maestro-release-dryrun-result.json');
    beforeAll(() => {
        // Create a temp directory for test files
        (0, fs_1.mkdirSync)(testDir, { recursive: true });
        // Prevent process.exit from being called during tests
        process.env.NODE_ENV = 'test';
    });
    afterAll(() => {
        // Cleanup the temp directory
        (0, fs_1.rmSync)(testDir, { recursive: true, force: true });
        (0, fs_1.rmSync)(resultFilePath, { force: true });
        delete process.env.NODE_ENV;
    });
    const createTestBundle = (name, content) => {
        const filePath = (0, path_1.resolve)(testDir, name);
        const contentString = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        (0, fs_1.writeFileSync)(filePath, contentString);
        return filePath;
    };
    const getResult = () => {
        return JSON.parse((0, fs_1.readFileSync)(resultFilePath, 'utf-8'));
    };
    it('should return GO for a valid bundle', async () => {
        const bundlePath = createTestBundle('valid.json', {
            schemaVersion: '1.0.0',
            decision: 'GO',
        });
        const command = new release_1.ReleaseCommand();
        await command.dryRun({ bundle: bundlePath, verbose: false });
        const result = getResult();
        expect(result.decision).toBe('GO');
        expect(result.reasons).toHaveLength(0);
    });
    it('should return NO-GO for invalid JSON', async () => {
        const bundlePath = createTestBundle('invalid.json', '{ "schemaVersion": "1.0.0", "decision": "GO"');
        const command = new release_1.ReleaseCommand();
        await command.dryRun({ bundle: bundlePath, verbose: false });
        const result = getResult();
        expect(result.decision).toBe('NO-GO');
        expect(result.reasons[0].code).toBe('BUNDLE_INVALID_JSON');
    });
    it('should return NO-GO for missing required field', async () => {
        const bundlePath = createTestBundle('missing-field.json', {
            decision: 'GO',
        });
        const command = new release_1.ReleaseCommand();
        await command.dryRun({ bundle: bundlePath, verbose: false });
        const result = getResult();
        expect(result.decision).toBe('NO-GO');
        expect(result.reasons[0].code).toBe('BUNDLE_MISSING_FIELD');
    });
    it('should return NO-GO for incompatible schema version', async () => {
        const bundlePath = createTestBundle('incompatible-schema.json', {
            schemaVersion: '0.1.0',
            decision: 'GO',
        });
        const command = new release_1.ReleaseCommand();
        await command.dryRun({ bundle: bundlePath, verbose: false });
        const result = getResult();
        expect(result.decision).toBe('NO-GO');
        expect(result.reasons[0].code).toBe('BUNDLE_SCHEMA_INCOMPATIBLE');
    });
    it('should passthrough blockedReasons from the bundle', async () => {
        const bundlePath = createTestBundle('blocked.json', {
            schemaVersion: '1.0.0',
            decision: 'NO-GO',
            reasons: [{ code: 'MANUAL_BLOCK', message: 'Release manually blocked' }],
        });
        const command = new release_1.ReleaseCommand();
        await command.dryRun({ bundle: bundlePath, verbose: false });
        const result = getResult();
        expect(result.decision).toBe('NO-GO');
        expect(result.reasons[0].code).toBe('MANUAL_BLOCK');
    });
});
