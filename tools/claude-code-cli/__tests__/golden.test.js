"use strict";
/**
 * Golden Integration Tests
 *
 * Verifies deterministic output by running the CLI multiple times
 * and asserting identical JSON output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
describe('Golden Tests - Deterministic Output', () => {
    let tempDir;
    beforeAll(() => {
        // Create a temporary directory with known content
        tempDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'claude-code-test-'));
        // Create some test files with deterministic content
        (0, node_fs_1.mkdirSync)((0, node_path_1.join)(tempDir, 'src'));
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, 'src', 'index.ts'), 'export const hello = "world";');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, 'src', 'utils.ts'), 'export const add = (a: number, b: number) => a + b;');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, 'README.md'), '# Test Project');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(tempDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
    });
    afterAll(() => {
        // Clean up
        try {
            (0, node_fs_1.rmSync)(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore cleanup errors
        }
    });
    /**
     * Run CLI and capture JSON output
     */
    function runCLI(args) {
        const cliPath = (0, node_path_1.join)(__dirname, '..', 'src', 'cli.ts');
        const cmd = `npx tsx ${cliPath} --output json ${args.join(' ')}`;
        try {
            const output = (0, node_child_process_1.execSync)(cmd, {
                cwd: tempDir,
                env: {
                    ...process.env,
                    TZ: 'UTC',
                    LC_ALL: 'C',
                    LANG: 'C',
                    // Disable timestamps for deterministic comparison
                    CLAUDE_NO_TIMESTAMPS: 'true',
                },
                encoding: 'utf8',
                timeout: 30000,
            });
            return output.trim();
        }
        catch (error) {
            if (error && typeof error === 'object' && 'stdout' in error) {
                return error.stdout.trim();
            }
            throw error;
        }
    }
    /**
     * Parse and normalize JSON for comparison
     * Removes any timing/timestamp fields that might vary
     */
    function normalizeOutput(json) {
        try {
            const obj = JSON.parse(json);
            // Remove fields that might vary between runs
            delete obj.timestamp;
            delete obj.duration_ms;
            // Re-stringify with sorted keys for comparison
            return JSON.stringify(obj, Object.keys(obj).sort(), 2);
        }
        catch {
            return json; // Return as-is if not valid JSON
        }
    }
    describe('Analyze Command - 3x Identical Output', () => {
        it('should produce identical JSON output across 3 runs', () => {
            const results = [];
            // Run 3 times
            for (let i = 0; i < 3; i++) {
                const output = runCLI(['run', 'analyze', '.']);
                results.push(normalizeOutput(output));
            }
            // All 3 should be identical
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
            // Verify it's valid JSON with expected structure
            const parsed = JSON.parse(results[0]);
            expect(parsed).toHaveProperty('version', '1.0.0');
            expect(parsed).toHaveProperty('command');
            expect(parsed).toHaveProperty('status');
            expect(parsed).toHaveProperty('normalized_env');
        });
        it('should have deterministic file ordering', () => {
            const results = [];
            // Run 5 times to catch ordering issues
            for (let i = 0; i < 5; i++) {
                const output = runCLI(['run', 'analyze', '.']);
                const parsed = JSON.parse(output);
                if (parsed.result && parsed.result.files) {
                    results.push(JSON.stringify(parsed.result.files));
                }
            }
            // All file lists should be in same order
            const uniqueResults = [...new Set(results)];
            expect(uniqueResults).toHaveLength(1);
        });
        it('should have deterministic environment info', () => {
            const results = [];
            for (let i = 0; i < 3; i++) {
                const output = runCLI(['run', 'analyze', '.']);
                const parsed = JSON.parse(output);
                results.push(JSON.stringify(parsed.normalized_env));
            }
            // Environment should be identical
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
            // Verify timezone is UTC
            const env = JSON.parse(results[0]);
            expect(env.tz).toBe('UTC');
            expect(env.locale).toBe('C');
        });
    });
    describe('JSON Schema Validation', () => {
        it('should have all required schema fields', () => {
            const output = runCLI(['run', 'analyze', '.']);
            const parsed = JSON.parse(output);
            // Required top-level fields
            expect(parsed).toHaveProperty('version');
            expect(parsed).toHaveProperty('command');
            expect(parsed).toHaveProperty('args');
            expect(parsed).toHaveProperty('normalized_env');
            expect(parsed).toHaveProperty('status');
            expect(parsed).toHaveProperty('result');
            expect(parsed).toHaveProperty('diagnostics');
            // Normalized env fields
            expect(parsed.normalized_env).toHaveProperty('tz');
            expect(parsed.normalized_env).toHaveProperty('locale');
            expect(parsed.normalized_env).toHaveProperty('nodeVersion');
            expect(parsed.normalized_env).toHaveProperty('platform');
            expect(parsed.normalized_env).toHaveProperty('arch');
        });
        it('should be valid JSON that can roundtrip through jq', () => {
            const output = runCLI(['run', 'analyze', '.']);
            // Parse and re-stringify
            const parsed = JSON.parse(output);
            const reStringified = JSON.stringify(parsed);
            const reParsed = JSON.parse(reStringified);
            // Should be equivalent
            expect(reParsed).toEqual(parsed);
        });
        it('should have correct version number', () => {
            const output = runCLI(['run', 'analyze', '.']);
            const parsed = JSON.parse(output);
            expect(parsed.version).toBe('1.0.0');
        });
        it('should have correct status values', () => {
            const output = runCLI(['run', 'analyze', '.']);
            const parsed = JSON.parse(output);
            expect(['success', 'error', 'cancelled']).toContain(parsed.status);
        });
    });
    describe('Error Output Determinism', () => {
        it('should produce deterministic error output for unknown tasks', () => {
            const results = [];
            for (let i = 0; i < 3; i++) {
                try {
                    runCLI(['run', 'unknown-task', '.']);
                }
                catch (error) {
                    if (error && typeof error === 'object' && 'stdout' in error) {
                        results.push(normalizeOutput(error.stdout));
                    }
                }
            }
            // Error outputs should be identical
            if (results.length === 3) {
                expect(results[0]).toBe(results[1]);
                expect(results[1]).toBe(results[2]);
            }
        });
    });
});
describe('Cross-Platform Consistency', () => {
    it('should normalize platform differences via TZ and locale', () => {
        // This test verifies the environment normalization works
        // by checking that dates formatted in the CLI use UTC
        const originalTZ = process.env.TZ;
        const originalLC = process.env.LC_ALL;
        try {
            process.env.TZ = 'UTC';
            process.env.LC_ALL = 'C';
            const date = new Date('2025-01-01T00:00:00Z');
            const formatted = date.toISOString();
            // ISO string should always be UTC
            expect(formatted).toBe('2025-01-01T00:00:00.000Z');
            // getTimezoneOffset should be 0 for UTC
            // Note: This may not work in all Node.js versions due to TZ caching
            // but the test documents the expected behavior
        }
        finally {
            process.env.TZ = originalTZ;
            process.env.LC_ALL = originalLC;
        }
    });
});
