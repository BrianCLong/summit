"use strict";
/**
 * Determinism Harness Tests
 *
 * Tests for the deterministic test harness.
 */
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const determinism_js_1 = require("../src/lib/determinism.js");
describe('Determinism Harness', () => {
    let tempDir;
    beforeEach(() => {
        tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'determinism-test-')));
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('computeHash', () => {
        it('computes sha256 hash', () => {
            const hash = (0, determinism_js_1.computeHash)('hello world', 'sha256');
            expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
        });
        it('computes sha512 hash', () => {
            const hash = (0, determinism_js_1.computeHash)('hello world', 'sha512');
            expect(hash).toHaveLength(128);
        });
        it('computes md5 hash', () => {
            const hash = (0, determinism_js_1.computeHash)('hello world', 'md5');
            expect(hash).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
        });
        it('produces same hash for same input', () => {
            const hash1 = (0, determinism_js_1.computeHash)('test content', 'sha256');
            const hash2 = (0, determinism_js_1.computeHash)('test content', 'sha256');
            expect(hash1).toBe(hash2);
        });
        it('produces different hash for different input', () => {
            const hash1 = (0, determinism_js_1.computeHash)('content a', 'sha256');
            const hash2 = (0, determinism_js_1.computeHash)('content b', 'sha256');
            expect(hash1).not.toBe(hash2);
        });
    });
    describe('canonicalizeJson', () => {
        it('sorts object keys', () => {
            const input = '{"b":1,"a":2}';
            const canonical = (0, determinism_js_1.canonicalizeJson)(input);
            expect(canonical).toBe('{\n  "a": 2,\n  "b": 1\n}');
        });
        it('sorts nested object keys', () => {
            const input = '{"z":{"b":1,"a":2},"a":1}';
            const canonical = (0, determinism_js_1.canonicalizeJson)(input);
            const parsed = JSON.parse(canonical);
            expect(Object.keys(parsed)).toEqual(['a', 'z']);
            expect(Object.keys(parsed.z)).toEqual(['a', 'b']);
        });
        it('handles arrays', () => {
            const input = '{"items":[{"b":1,"a":2}]}';
            const canonical = (0, determinism_js_1.canonicalizeJson)(input);
            const parsed = JSON.parse(canonical);
            expect(Object.keys(parsed.items[0])).toEqual(['a', 'b']);
        });
        it('returns non-JSON as-is', () => {
            const input = 'not json';
            const canonical = (0, determinism_js_1.canonicalizeJson)(input);
            expect(canonical).toBe('not json');
        });
        it('produces deterministic output', () => {
            const input1 = '{"b":1,"a":2}';
            const input2 = '{"a":2,"b":1}';
            expect((0, determinism_js_1.canonicalizeJson)(input1)).toBe((0, determinism_js_1.canonicalizeJson)(input2));
        });
    });
    describe('generateDeterministicId', () => {
        it('generates id with det- prefix', () => {
            const id = (0, determinism_js_1.generateDeterministicId)('test command', 3);
            expect(id).toMatch(/^det-[a-f0-9]{12}$/);
        });
        it('generates same id for same inputs', () => {
            const id1 = (0, determinism_js_1.generateDeterministicId)('test command', 3);
            const id2 = (0, determinism_js_1.generateDeterministicId)('test command', 3);
            expect(id1).toBe(id2);
        });
        it('generates different id for different commands', () => {
            const id1 = (0, determinism_js_1.generateDeterministicId)('command a', 3);
            const id2 = (0, determinism_js_1.generateDeterministicId)('command b', 3);
            expect(id1).not.toBe(id2);
        });
        it('generates different id for different run counts', () => {
            const id1 = (0, determinism_js_1.generateDeterministicId)('command', 3);
            const id2 = (0, determinism_js_1.generateDeterministicId)('command', 5);
            expect(id1).not.toBe(id2);
        });
    });
    describe('findFirstDiff', () => {
        it('returns null for identical JSON', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":1}', '{"a":1}');
            expect(diff).toBeNull();
        });
        it('finds differing values', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":1}', '{"a":2}');
            expect(diff).toEqual({ path: 'a', value1: 1, value2: 2 });
        });
        it('finds differing nested values', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":{"b":1}}', '{"a":{"b":2}}');
            expect(diff).toEqual({ path: 'a.b', value1: 1, value2: 2 });
        });
        it('finds differing array lengths', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":[1,2]}', '{"a":[1,2,3]}');
            expect(diff).toEqual({ path: 'a.length', value1: 2, value2: 3 });
        });
        it('finds differing array elements', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":[1,2]}', '{"a":[1,3]}');
            expect(diff).toEqual({ path: 'a[1]', value1: 2, value2: 3 });
        });
        it('finds missing keys', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('{"a":1,"b":2}', '{"a":1}');
            expect(diff?.path).toBe('.<keys>');
        });
        it('handles non-JSON strings', () => {
            const diff = (0, determinism_js_1.findFirstDiff)('hello', 'world');
            expect(diff).toEqual({ path: '<root>', value1: 'hello', value2: 'world' });
        });
    });
    describe('getDeterministicEnv', () => {
        it('sets TZ to UTC', () => {
            const env = (0, determinism_js_1.getDeterministicEnv)();
            expect(env.TZ).toBe('UTC');
        });
        it('sets LC_ALL to C', () => {
            const env = (0, determinism_js_1.getDeterministicEnv)();
            expect(env.LC_ALL).toBe('C');
        });
        it('sets CI to true', () => {
            const env = (0, determinism_js_1.getDeterministicEnv)();
            expect(env.CI).toBe('true');
        });
        it('disables colors', () => {
            const env = (0, determinism_js_1.getDeterministicEnv)();
            expect(env.NO_COLOR).toBe('1');
            expect(env.FORCE_COLOR).toBe('0');
        });
    });
    describe('generateEvidenceJson', () => {
        it('generates valid evidence structure', () => {
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: null,
                evidenceDir: '/tmp/test',
            };
            const evidence = (0, determinism_js_1.generateEvidenceJson)('test command', options, result);
            expect(evidence.v).toBe(1);
            expect(evidence.runs).toBe(3);
            expect(evidence.command).toBe('test command');
            expect(evidence.hash_algo).toBe('sha256');
            expect(evidence.hashes).toEqual(['hash1', 'hash2', 'hash3']);
            expect(evidence.match).toBe(true);
            expect(evidence.env.tz).toBe('UTC');
            expect(evidence.env.locale).toBe('C');
            expect(evidence.package_test).toBeNull();
        });
        it('includes package test results when present', () => {
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                packageName: 'test-package',
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: {
                    name: 'test-package',
                    runs: 3,
                    passes: 3,
                    failures: 0,
                    results: [],
                },
                evidenceDir: '/tmp/test',
            };
            const evidence = (0, determinism_js_1.generateEvidenceJson)('test command', options, result);
            expect(evidence.package_test).toEqual({
                name: 'test-package',
                runs: 3,
                passes: 3,
            });
        });
    });
    describe('generateEvidenceMarkdown', () => {
        it('generates markdown with command', () => {
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['aaa', 'aaa', 'aaa'],
                packageTest: null,
                evidenceDir: '/tmp/test',
            };
            const md = (0, determinism_js_1.generateEvidenceMarkdown)('test command', options, result);
            expect(md).toContain('# Determinism Evidence');
            expect(md).toContain('test command');
            expect(md).toContain('**Runs**: 3');
            expect(md).toContain('**Match**: Yes');
            expect(md).toContain('aaa');
        });
        it('marks matching hashes with checkmarks', () => {
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['same', 'same', 'same'],
                packageTest: null,
                evidenceDir: '/tmp/test',
            };
            const md = (0, determinism_js_1.generateEvidenceMarkdown)('test', options, result);
            expect(md).toContain('✓');
            expect(md).not.toContain('✗');
        });
        it('marks mismatching hashes with X', () => {
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: false,
                match: false,
                runs: [],
                hashes: ['aaa', 'bbb', 'aaa'],
                firstMismatchRun: 2,
                packageTest: null,
                evidenceDir: '/tmp/test',
            };
            const md = (0, determinism_js_1.generateEvidenceMarkdown)('test', options, result);
            expect(md).toContain('✗');
        });
    });
    describe('generateDiffMarkdown', () => {
        it('generates diff report for mismatch', () => {
            const runs = [
                { runNumber: 1, stdout: '{"a":1}', stderr: '', exitCode: 0, hash: 'hash1', durationMs: null },
                { runNumber: 2, stdout: '{"a":2}', stderr: '', exitCode: 0, hash: 'hash2', durationMs: null },
            ];
            const md = (0, determinism_js_1.generateDiffMarkdown)(runs, 2);
            expect(md).toContain('# Determinism Mismatch Report');
            expect(md).toContain('Run 2 differs from Run 1');
            expect(md).toContain('hash1');
            expect(md).toContain('hash2');
        });
    });
    describe('writeEvidenceArtifacts', () => {
        it('creates output directory', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            expect(fs.existsSync(outputDir)).toBe(true);
        });
        it('writes evidence.json', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            const evidencePath = path.join(outputDir, 'evidence.json');
            expect(fs.existsSync(evidencePath)).toBe(true);
            const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
            expect(evidence.v).toBe(1);
            expect(evidence.match).toBe(true);
        });
        it('writes evidence.md', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            const mdPath = path.join(outputDir, 'evidence.md');
            expect(fs.existsSync(mdPath)).toBe(true);
            const content = fs.readFileSync(mdPath, 'utf-8');
            expect(content).toContain('# Determinism Evidence');
        });
        it('writes diff.md on mismatch', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 2,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: false,
                match: false,
                runs: [
                    { runNumber: 1, stdout: '{"a":1}', stderr: '', exitCode: 0, hash: 'hash1', durationMs: null },
                    { runNumber: 2, stdout: '{"a":2}', stderr: '', exitCode: 0, hash: 'hash2', durationMs: null },
                ],
                hashes: ['hash1', 'hash2'],
                firstMismatchRun: 2,
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            const diffPath = path.join(outputDir, 'diff.md');
            expect(fs.existsSync(diffPath)).toBe(true);
        });
        it('writes per-run outputs on mismatch', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 2,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: false,
                match: false,
                runs: [
                    { runNumber: 1, stdout: '{"a":1}', stderr: '', exitCode: 0, hash: 'hash1', durationMs: null },
                    { runNumber: 2, stdout: '{"a":2}', stderr: '', exitCode: 0, hash: 'hash2', durationMs: null },
                ],
                hashes: ['hash1', 'hash2'],
                firstMismatchRun: 2,
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            expect(fs.existsSync(path.join(outputDir, 'run-1.json'))).toBe(true);
            expect(fs.existsSync(path.join(outputDir, 'run-2.json'))).toBe(true);
        });
        it('writes per-run outputs when includeStdout is true', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 2,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: true,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [
                    { runNumber: 1, stdout: '{"a":1}', stderr: '', exitCode: 0, hash: 'hash1', durationMs: null },
                    { runNumber: 2, stdout: '{"a":1}', stderr: '', exitCode: 0, hash: 'hash1', durationMs: null },
                ],
                hashes: ['hash1', 'hash1'],
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            expect(fs.existsSync(path.join(outputDir, 'run-1.json'))).toBe(true);
            expect(fs.existsSync(path.join(outputDir, 'run-2.json'))).toBe(true);
        });
    });
    describe('Deterministic Output', () => {
        it('evidence.json has sorted keys', () => {
            const outputDir = path.join(tempDir, 'evidence');
            const options = {
                runs: 3,
                failFast: true,
                hashAlgo: 'sha256',
                includeStdout: false,
                requireTestsPass: false,
                includeTimestamps: false,
            };
            const result = {
                success: true,
                match: true,
                runs: [],
                hashes: ['hash1', 'hash2', 'hash3'],
                packageTest: null,
                evidenceDir: outputDir,
            };
            (0, determinism_js_1.writeEvidenceArtifacts)(outputDir, 'test', options, result);
            const content = fs.readFileSync(path.join(outputDir, 'evidence.json'), 'utf-8');
            const parsed = JSON.parse(content);
            const keys = Object.keys(parsed);
            // Keys should be in sorted order
            expect(keys).toEqual([...keys].sort());
        });
    });
});
