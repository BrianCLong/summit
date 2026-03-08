"use strict";
/**
 * Session Management Tests
 *
 * Tests for session tracking, persistence, and audit trail.
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
const session_js_1 = require("../src/lib/session.js");
describe('Session Management', () => {
    let tempDir;
    let sessionDir;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'));
        sessionDir = path.join(tempDir, '.claude', 'sessions');
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('generateSessionId', () => {
        it('generates deterministic ID for same inputs', () => {
            const id1 = (0, session_js_1.generateSessionId)('/repo', 'run', '2024-01-01T00:00:00Z', 'seed');
            const id2 = (0, session_js_1.generateSessionId)('/repo', 'run', '2024-01-01T00:00:00Z', 'seed');
            expect(id1).toBe(id2);
            expect(id1).toMatch(/^session-[a-f0-9]{16}$/);
        });
        it('generates different IDs for different inputs', () => {
            const id1 = (0, session_js_1.generateSessionId)('/repo1', 'run', '2024-01-01T00:00:00Z');
            const id2 = (0, session_js_1.generateSessionId)('/repo2', 'run', '2024-01-01T00:00:00Z');
            expect(id1).not.toBe(id2);
        });
    });
    describe('generateRandomSessionId', () => {
        it('generates unique IDs', () => {
            const id1 = (0, session_js_1.generateRandomSessionId)();
            const id2 = (0, session_js_1.generateRandomSessionId)();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^session-[a-f0-9]{16}$/);
        });
    });
    describe('Session', () => {
        it('creates session with initial state', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: { ci: true },
                sessionDir,
            });
            const state = session.getState();
            expect(state.status).toBe('running');
            expect(state.command).toBe('run');
            expect(state.flags).toEqual({ ci: true });
            expect(state.operations).toEqual([]);
            expect(state.diagnostics.totalOperations).toBe(0);
        });
        it('uses deterministic ID when enabled', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'test',
                flags: {},
                sessionDir,
                deterministicId: true,
                seed: 'test-seed',
            });
            const sessionId = session.getSessionId();
            expect(sessionId).toMatch(/^session-[a-f0-9]{16}$/);
        });
        it('records operations', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.recordOperation('read', '/path/to/file.txt', 'success', { size: 1024 }, 50);
            const state = session.getState();
            expect(state.operations.length).toBe(1);
            expect(state.operations[0].type).toBe('read');
            expect(state.operations[0].target).toBe('/path/to/file.txt');
            expect(state.operations[0].status).toBe('success');
            expect(state.operations[0].durationMs).toBe(50);
            expect(state.diagnostics.filesRead).toBe(1);
            expect(state.diagnostics.totalOperations).toBe(1);
        });
        it('updates diagnostics correctly', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.recordOperation('read', 'file1.txt', 'success');
            session.recordOperation('read', 'file2.txt', 'success');
            session.recordOperation('write', 'output.txt', 'success');
            session.recordOperation('exec', 'git', 'success');
            session.recordOperation('network', 'api.example.com', 'denied');
            session.recordOperation('policy', 'check', 'allowed');
            session.recordOperation('git', 'commit', 'failure');
            const d = session.getState().diagnostics;
            expect(d.totalOperations).toBe(7);
            expect(d.filesRead).toBe(2);
            expect(d.filesWritten).toBe(1);
            expect(d.toolsExecuted).toBe(1);
            expect(d.networkCalls).toBe(1);
            expect(d.policyEvaluations).toBe(1);
            expect(d.gitOperations).toBe(1);
            expect(d.deniedOperations).toBe(1);
            expect(d.failedOperations).toBe(1);
        });
        it('sanitizes sensitive flags', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {
                    ci: true,
                    password: 'secret123',
                    apiKey: 'key123',
                    normalFlag: 'value',
                },
                sessionDir,
            });
            const state = session.getState();
            expect(state.flags.ci).toBe(true);
            expect(state.flags.password).toBe('[REDACTED]');
            expect(state.flags.apiKey).toBe('[REDACTED]');
            expect(state.flags.normalFlag).toBe('value');
        });
        it('persists session to file', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.recordOperation('read', 'file.txt', 'success');
            expect(fs.existsSync(session.getSessionFile())).toBe(true);
            const loaded = (0, session_js_1.loadSession)(session.getSessionFile());
            expect(loaded).not.toBeNull();
            expect(loaded?.operations.length).toBe(1);
        });
        it('marks session as completed', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.complete();
            const state = session.getState();
            expect(state.status).toBe('completed');
            expect(state.endTime).toBeDefined();
        });
        it('marks session as failed', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.fail('Something went wrong');
            const state = session.getState();
            expect(state.status).toBe('failed');
            expect(state.endTime).toBeDefined();
        });
        it('marks session as cancelled', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.cancel();
            const state = session.getState();
            expect(state.status).toBe('cancelled');
            expect(state.endTime).toBeDefined();
        });
        it('formats summary correctly', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session.recordOperation('read', 'file.txt', 'success', {}, 100);
            session.recordOperation('write', 'output.txt', 'success', {}, 50);
            session.complete();
            const summary = session.formatSummary();
            expect(summary).toContain('Session:');
            expect(summary).toContain('Status: completed');
            expect(summary).toContain('Operations: 2');
            expect(summary).toContain('Files: 1 read, 1 written');
        });
        it('outputs deterministic JSON', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: { a: 1, z: 2, m: 3 },
                sessionDir,
                deterministicId: true,
                seed: 'test',
            });
            const json1 = session.toJSON();
            const json2 = session.toJSON();
            expect(json1).toBe(json2);
            // Keys should be sorted
            const parsed = JSON.parse(json1);
            const keys = Object.keys(parsed);
            expect(keys).toEqual([...keys].sort());
        });
    });
    describe('loadSession', () => {
        it('loads existing session', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: { test: true },
                sessionDir,
            });
            session.recordOperation('read', 'file.txt', 'success');
            session.complete();
            const loaded = (0, session_js_1.loadSession)(session.getSessionFile());
            expect(loaded).not.toBeNull();
            expect(loaded?.status).toBe('completed');
            expect(loaded?.operations.length).toBe(1);
        });
        it('returns null for non-existent file', () => {
            const loaded = (0, session_js_1.loadSession)('/nonexistent/path/session.json');
            expect(loaded).toBeNull();
        });
    });
    describe('listSessions', () => {
        it('lists all sessions in directory', () => {
            // Create multiple sessions
            const session1 = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'run',
                flags: {},
                sessionDir,
            });
            session1.complete();
            const session2 = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'build',
                flags: {},
                sessionDir,
            });
            session2.complete();
            const sessions = (0, session_js_1.listSessions)(sessionDir);
            expect(sessions.length).toBe(2);
        });
        it('sorts sessions by start time (newest first)', () => {
            const session1 = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'first',
                flags: {},
                sessionDir,
            });
            session1.complete();
            // Session 2 created after session 1 - file mtime will be used as tiebreaker
            // when timestamps are equal (which can happen in fast execution)
            const session2 = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'second',
                flags: {},
                sessionDir,
            });
            session2.complete();
            const sessions = (0, session_js_1.listSessions)(sessionDir);
            // Sessions are sorted by startTime (newest first), with file mtime as tiebreaker
            // Since session2 was created after session1, it should come first
            expect(sessions[0].command).toBe('second');
            expect(sessions[1].command).toBe('first');
        });
        it('returns empty array for non-existent directory', () => {
            const sessions = (0, session_js_1.listSessions)('/nonexistent/path');
            expect(sessions).toEqual([]);
        });
    });
    describe('cleanOldSessions', () => {
        it('removes sessions older than max age', () => {
            // Create a session
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'old',
                flags: {},
                sessionDir,
            });
            session.complete();
            // Verify session exists
            expect(fs.readdirSync(sessionDir).length).toBe(1);
            // Clean with 0 days max age (remove all)
            const cleaned = (0, session_js_1.cleanOldSessions)(sessionDir, 0);
            expect(cleaned).toBe(1);
            expect(fs.readdirSync(sessionDir).length).toBe(0);
        });
        it('keeps recent sessions', () => {
            const session = (0, session_js_1.createSession)({
                repoRoot: tempDir,
                command: 'recent',
                flags: {},
                sessionDir,
            });
            session.complete();
            // Clean with 7 days max age (keep recent)
            const cleaned = (0, session_js_1.cleanOldSessions)(sessionDir, 7);
            expect(cleaned).toBe(0);
            expect(fs.readdirSync(sessionDir).length).toBe(1);
        });
        it('returns 0 for non-existent directory', () => {
            const cleaned = (0, session_js_1.cleanOldSessions)('/nonexistent/path');
            expect(cleaned).toBe(0);
        });
    });
});
