"use strict";
/**
 * Sandbox Guardrails Tests
 *
 * Tests for path allowlist, tool execution, and network restrictions.
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
const sandbox_js_1 = require("../src/lib/sandbox.js");
describe('Sandbox Guardrails', () => {
    let tempDir;
    let repoRoot;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-test-'));
        repoRoot = path.join(tempDir, 'repo');
        fs.mkdirSync(repoRoot);
        // Create some test files
        fs.writeFileSync(path.join(repoRoot, 'allowed.txt'), 'allowed content');
        fs.mkdirSync(path.join(repoRoot, 'src'));
        fs.writeFileSync(path.join(repoRoot, 'src', 'index.ts'), 'export {}');
        // Create .git directory (should be denied)
        fs.mkdirSync(path.join(repoRoot, '.git'));
        fs.writeFileSync(path.join(repoRoot, '.git', 'config'), 'git config');
        // Create a secrets file (should be denied)
        fs.mkdirSync(path.join(repoRoot, 'secrets'));
        fs.writeFileSync(path.join(repoRoot, 'secrets', 'api.key'), 'secret');
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('matchesGlob', () => {
        it('matches simple patterns', () => {
            expect((0, sandbox_js_1.matchesGlob)('test.txt', '*.txt')).toBe(true);
            expect((0, sandbox_js_1.matchesGlob)('test.js', '*.txt')).toBe(false);
        });
        it('matches ** patterns', () => {
            expect((0, sandbox_js_1.matchesGlob)('src/lib/test.ts', '**/*.ts')).toBe(true);
            expect((0, sandbox_js_1.matchesGlob)('.git/config', '.git/**')).toBe(true);
            expect((0, sandbox_js_1.matchesGlob)('.git/hooks/pre-commit', '.git/**')).toBe(true);
        });
        it('matches exact patterns', () => {
            expect((0, sandbox_js_1.matchesGlob)('.env', '**/.env')).toBe(true);
            expect((0, sandbox_js_1.matchesGlob)('config/.env', '**/.env')).toBe(true);
        });
        it('matches key file patterns', () => {
            expect((0, sandbox_js_1.matchesGlob)('id_rsa', '**/id_rsa*')).toBe(true);
            expect((0, sandbox_js_1.matchesGlob)('home/.ssh/id_rsa.pub', '**/id_rsa*')).toBe(true);
        });
    });
    describe('normalizePath', () => {
        it('resolves relative paths against base', () => {
            const result = (0, sandbox_js_1.normalizePath)('src/test.ts', repoRoot);
            expect(result).toBe(path.join(repoRoot, 'src', 'test.ts'));
        });
        it('keeps absolute paths absolute', () => {
            const absPath = '/absolute/path/test.ts';
            const result = (0, sandbox_js_1.normalizePath)(absPath, repoRoot);
            expect(path.isAbsolute(result)).toBe(true);
        });
    });
    describe('isPathWithin', () => {
        it('returns true for paths within base', () => {
            expect((0, sandbox_js_1.isPathWithin)(path.join(repoRoot, 'src'), repoRoot)).toBe(true);
            expect((0, sandbox_js_1.isPathWithin)(path.join(repoRoot, 'src', 'test.ts'), repoRoot)).toBe(true);
        });
        it('returns false for paths outside base', () => {
            expect((0, sandbox_js_1.isPathWithin)('/other/path', repoRoot)).toBe(false);
            expect((0, sandbox_js_1.isPathWithin)(path.join(tempDir, 'other'), repoRoot)).toBe(false);
        });
        it('returns true for the base itself', () => {
            expect((0, sandbox_js_1.isPathWithin)(repoRoot, repoRoot)).toBe(true);
        });
    });
    describe('scrubEnvironment', () => {
        it('preserves safe environment variables', () => {
            const env = {
                PATH: '/usr/bin',
                HOME: '/home/user',
                SECRET_KEY: 'should-be-removed',
            };
            const scrubbed = (0, sandbox_js_1.scrubEnvironment)(env);
            expect(scrubbed.PATH).toBe('/usr/bin');
            expect(scrubbed.HOME).toBe('/home/user');
        });
        it('removes secret-pattern variables', () => {
            const env = {
                PATH: '/usr/bin',
                API_KEY: 'secret',
                DATABASE_PASSWORD: 'secret',
                AUTH_TOKEN: 'secret',
                PRIVATE_KEY: 'secret',
            };
            const scrubbed = (0, sandbox_js_1.scrubEnvironment)(env);
            expect(scrubbed.API_KEY).toBeUndefined();
            expect(scrubbed.DATABASE_PASSWORD).toBeUndefined();
            expect(scrubbed.AUTH_TOKEN).toBeUndefined();
            expect(scrubbed.PRIVATE_KEY).toBeUndefined();
        });
    });
    describe('Sandbox', () => {
        describe('path checks', () => {
            it('allows reading files inside repo root', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkPath('allowed.txt', 'read')).not.toThrow();
                expect(() => sandbox.checkPath('src/index.ts', 'read')).not.toThrow();
            });
            it('denies reading files outside repo root', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                const outsidePath = path.join(tempDir, 'outside.txt');
                fs.writeFileSync(outsidePath, 'outside content');
                expect(() => sandbox.checkPath(outsidePath, 'read')).toThrow(sandbox_js_1.SandboxError);
                try {
                    sandbox.checkPath(outsidePath, 'read');
                    fail('Should have thrown');
                }
                catch (error) {
                    expect(error).toBeInstanceOf(sandbox_js_1.SandboxError);
                    const sandboxError = error;
                    expect(sandboxError.exitCode).toBe(sandbox_js_1.SANDBOX_EXIT_CODE);
                    expect(sandboxError.violationType).toBe('path');
                }
            });
            it('denies access to .git even if within repo root', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkPath('.git/config', 'read')).toThrow(sandbox_js_1.SandboxError);
                try {
                    sandbox.checkPath('.git/config', 'read');
                }
                catch (error) {
                    const sandboxError = error;
                    expect(sandboxError.details).toContain('matched_pattern: .git/**');
                }
            });
            it('denies access to secrets directory', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkPath('secrets/api.key', 'read')).toThrow(sandbox_js_1.SandboxError);
            });
            it('denies access to .pem files', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkPath('certs/server.pem', 'read')).toThrow(sandbox_js_1.SandboxError);
            });
            it('respects custom allow paths', () => {
                const allowedDir = path.join(tempDir, 'allowed-dir');
                fs.mkdirSync(allowedDir);
                fs.writeFileSync(path.join(allowedDir, 'test.txt'), 'test');
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    allowPaths: [repoRoot, allowedDir],
                });
                expect(() => sandbox.checkPath(path.join(allowedDir, 'test.txt'), 'read')).not.toThrow();
            });
            it('respects custom deny paths', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    denyPaths: ['**/custom-deny/**'],
                });
                expect(() => sandbox.checkPath('custom-deny/file.txt', 'read')).toThrow(sandbox_js_1.SandboxError);
            });
        });
        describe('tool execution', () => {
            it('denies tool execution by default', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkTool('git')).toThrow(sandbox_js_1.SandboxError);
                try {
                    sandbox.checkTool('git');
                }
                catch (error) {
                    const sandboxError = error;
                    expect(sandboxError.violationType).toBe('tool');
                    expect(sandboxError.details).toContain('no_tools_allowed');
                }
            });
            it('allows tool execution when in allowlist', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    allowTools: ['git', 'rg'],
                });
                expect(() => sandbox.checkTool('git')).not.toThrow();
                expect(() => sandbox.checkTool('rg')).not.toThrow();
            });
            it('denies tool not in allowlist', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    allowTools: ['git'],
                });
                expect(() => sandbox.checkTool('curl')).toThrow(sandbox_js_1.SandboxError);
                try {
                    sandbox.checkTool('curl');
                }
                catch (error) {
                    const sandboxError = error;
                    expect(sandboxError.violationType).toBe('tool');
                    expect(sandboxError.details).toContain('requested_tool: curl');
                }
            });
        });
        describe('network access', () => {
            it('denies network by default', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkNetwork()).toThrow(sandbox_js_1.SandboxError);
                try {
                    sandbox.checkNetwork();
                }
                catch (error) {
                    const sandboxError = error;
                    expect(sandboxError.violationType).toBe('network');
                }
            });
            it('allows network when enabled', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    allowNetwork: true,
                });
                expect(() => sandbox.checkNetwork()).not.toThrow();
            });
            it('includes CI-specific message when in CI mode', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    ci: true,
                    allowNetwork: false,
                });
                try {
                    sandbox.checkNetwork();
                }
                catch (error) {
                    const sandboxError = error;
                    expect(sandboxError.details).toContain('network_disabled_in_ci');
                }
            });
        });
        describe('file operations', () => {
            it('readFile works for allowed paths', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                const content = sandbox.readFile('allowed.txt');
                expect(content).toBe('allowed content');
            });
            it('readFile throws for denied paths', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.readFile('.git/config')).toThrow(sandbox_js_1.SandboxError);
            });
            it('writeFile works for allowed paths', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                sandbox.writeFile('new-file.txt', 'new content');
                const written = fs.readFileSync(path.join(repoRoot, 'new-file.txt'), 'utf-8');
                expect(written).toBe('new content');
            });
            it('writeFile creates parent directories', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                sandbox.writeFile('new-dir/nested/file.txt', 'nested content');
                expect(fs.existsSync(path.join(repoRoot, 'new-dir', 'nested', 'file.txt'))).toBe(true);
            });
            it('writeFile throws for denied paths', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.writeFile('.git/hooks/test', 'malicious')).toThrow(sandbox_js_1.SandboxError);
            });
        });
        describe('dotenv handling', () => {
            it('denies .env by default', () => {
                fs.writeFileSync(path.join(repoRoot, '.env'), 'SECRET=value');
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                expect(() => sandbox.checkPath('.env', 'read')).toThrow(sandbox_js_1.SandboxError);
            });
            it('allows .env when allowDotenv is true', () => {
                fs.writeFileSync(path.join(repoRoot, '.env'), 'SECRET=value');
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    allowDotenv: true,
                });
                expect(() => sandbox.checkPath('.env', 'read')).not.toThrow();
            });
        });
        describe('unsafe sensitive paths', () => {
            it('still denies hardcoded patterns by default', () => {
                const sandbox = (0, sandbox_js_1.createSandbox)({ repoRoot });
                // All hardcoded patterns should be denied
                expect(() => sandbox.checkPath('.git/config', 'read')).toThrow(sandbox_js_1.SandboxError);
                expect(() => sandbox.checkPath('certs/server.pem', 'read')).toThrow(sandbox_js_1.SandboxError);
            });
            it('allows sensitive paths when unsafeAllowSensitivePaths is true', () => {
                // Create the file first
                fs.writeFileSync(path.join(repoRoot, 'test.pem'), 'cert');
                const sandbox = (0, sandbox_js_1.createSandbox)({
                    repoRoot,
                    unsafeAllowSensitivePaths: true,
                });
                // .pem should now be allowed (but file must exist for readFile)
                expect(() => sandbox.checkPath('test.pem', 'read')).not.toThrow();
            });
        });
    });
    describe('SandboxError', () => {
        it('formats error with stable-sorted details', () => {
            const error = new sandbox_js_1.SandboxError('Test error', 'path', ['detail_z', 'detail_a', 'detail_m']);
            const formatted = error.format();
            expect(formatted).toContain('Sandbox Error (path): Test error');
            expect(formatted).toContain('Details:');
            // Details should be sorted
            const detailsSection = formatted.split('Details:')[1];
            const detailIndex = {
                a: detailsSection.indexOf('detail_a'),
                m: detailsSection.indexOf('detail_m'),
                z: detailsSection.indexOf('detail_z'),
            };
            expect(detailIndex.a).toBeLessThan(detailIndex.m);
            expect(detailIndex.m).toBeLessThan(detailIndex.z);
        });
        it('has correct exit code', () => {
            const error = new sandbox_js_1.SandboxError('Test', 'path', [], sandbox_js_1.SANDBOX_EXIT_CODE);
            expect(error.exitCode).toBe(2);
        });
    });
    describe('detectRepoRoot', () => {
        it('finds .git directory', () => {
            const detected = (0, sandbox_js_1.detectRepoRoot)(path.join(repoRoot, 'src'));
            expect(detected).toBe(repoRoot);
        });
        it('finds package.json', () => {
            // Remove .git and add package.json
            fs.rmSync(path.join(repoRoot, '.git'), { recursive: true });
            fs.writeFileSync(path.join(repoRoot, 'package.json'), '{}');
            const detected = (0, sandbox_js_1.detectRepoRoot)(path.join(repoRoot, 'src'));
            expect(detected).toBe(repoRoot);
        });
        it('falls back to start directory', () => {
            const emptyDir = path.join(tempDir, 'empty');
            fs.mkdirSync(emptyDir);
            const detected = (0, sandbox_js_1.detectRepoRoot)(emptyDir);
            expect(detected).toBe(emptyDir);
        });
    });
    describe('HARDCODED_DENY_PATTERNS', () => {
        it('includes critical security patterns', () => {
            expect(sandbox_js_1.HARDCODED_DENY_PATTERNS).toContain('.git/**');
            expect(sandbox_js_1.HARDCODED_DENY_PATTERNS).toContain('**/*.pem');
            expect(sandbox_js_1.HARDCODED_DENY_PATTERNS).toContain('**/*.key');
            expect(sandbox_js_1.HARDCODED_DENY_PATTERNS).toContain('**/secrets/**');
        });
    });
});
