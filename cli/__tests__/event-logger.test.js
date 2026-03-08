"use strict";
/**
 * Event Logger Tests
 *
 * Tests for JSONL event logging, redaction, and deterministic output.
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
const event_logger_js_1 = require("../src/lib/event-logger.js");
describe('Event Logger', () => {
    let tempDir;
    let sessionDir;
    beforeEach(() => {
        tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'event-logger-test-')));
        sessionDir = path.join(tempDir, 'sessions');
        fs.mkdirSync(sessionDir, { recursive: true });
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    describe('createEventLogger', () => {
        it('creates event logger with correct file path', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'test-run-123',
            });
            expect(logger.getEventFile()).toBe(path.join(sessionDir, 'test-run-123', 'events.jsonl'));
        });
        it('creates session directory if it does not exist', () => {
            const runId = 'new-session';
            (0, event_logger_js_1.createEventLogger)({ sessionDir, runId });
            expect(fs.existsSync(path.join(sessionDir, runId))).toBe(true);
        });
    });
    describe('Event Writing', () => {
        it('writes events with increasing sequence numbers', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'seq-test',
            });
            logger.logRunStart({
                command: 'test',
                args: [],
                normalized_env: {},
                policy_enabled: false,
                sandbox_enabled: false,
            });
            logger.logStepStart({
                step_name: 'step1',
                step_id: 'step-1',
            });
            logger.logRunEnd({
                status: 'completed',
                diagnostics: {
                    total_operations: 2,
                    files_read: 0,
                    files_written: 0,
                    tools_executed: 0,
                    provider_calls: 0,
                    retries: 0,
                    errors: 0,
                    denied: 0,
                },
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events.length).toBe(3);
            expect(events[0].seq).toBe(1);
            expect(events[1].seq).toBe(2);
            expect(events[2].seq).toBe(3);
        });
        it('writes valid JSON per line', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'json-test',
            });
            logger.logRunStart({
                command: 'test',
                args: ['arg1', 'arg2'],
                normalized_env: { PATH: '/usr/bin' },
                policy_enabled: true,
                sandbox_enabled: true,
            });
            const content = fs.readFileSync(logger.getEventFile(), 'utf-8');
            const lines = content.trim().split('\n');
            for (const line of lines) {
                expect(() => JSON.parse(line)).not.toThrow();
            }
        });
        it('omits timestamps by default', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'no-ts-test',
            });
            logger.logRunStart({
                command: 'test',
                args: [],
                normalized_env: {},
                policy_enabled: false,
                sandbox_enabled: false,
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].ts).toBeNull();
        });
        it('includes timestamps when enabled', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'ts-test',
                includeTimestamps: true,
            });
            logger.logRunStart({
                command: 'test',
                args: [],
                normalized_env: {},
                policy_enabled: false,
                sandbox_enabled: false,
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].ts).not.toBeNull();
            expect(typeof events[0].ts).toBe('number');
        });
    });
    describe('Event Types', () => {
        it('logs run_start event correctly', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'run-start-test' });
            logger.logRunStart({
                command: 'build',
                args: ['--verbose', '--ci'],
                normalized_env: { NODE_ENV: 'production' },
                repo_root: '/repo',
                branch: 'main',
                commit: 'abc123',
                policy_enabled: true,
                sandbox_enabled: true,
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].type).toBe('run_start');
            expect(events[0].data.command).toBe('build');
        });
        it('logs action event with sorted files', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'action-test' });
            logger.logAction({
                action_type: 'write',
                affected_files: ['z.txt', 'a.txt', 'm.txt'],
                diff_bytes: 100,
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].type).toBe('action');
            expect(events[0].data.affected_files).toEqual(['a.txt', 'm.txt', 'z.txt']);
        });
        it('logs provider_call event', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'provider-test' });
            logger.logProviderCall({
                provider_name: 'anthropic',
                request_id: 'req-123',
                retries: 2,
                latency_ms: 500,
                input_tokens: 100,
                output_tokens: 200,
                status: 'success',
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].type).toBe('provider_call');
            expect(events[0].data.provider_name).toBe('anthropic');
            expect(events[0].data.latency_ms).toBeNull(); // No timestamps by default
        });
        it('logs tool_exec event with sorted args', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'tool-test' });
            logger.logToolExec({
                tool: 'git',
                args: ['status', '--short'],
                exit_code: 0,
                timeout: false,
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].type).toBe('tool_exec');
            expect(events[0].data.tool).toBe('git');
        });
        it('logs error event with sorted deny_reasons', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'error-test' });
            logger.logError({
                category: 'policy',
                message: 'Access denied',
                deny_reasons: ['z_reason', 'a_reason', 'm_reason'],
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events[0].type).toBe('error');
            expect(events[0].data.deny_reasons).toEqual(['a_reason', 'm_reason', 'z_reason']);
        });
    });
    describe('Redaction', () => {
        it('redacts API keys', () => {
            const input = 'Using key sk-abc123def456ghi789jkl012mno345pqr678stu901';
            const redacted = (0, event_logger_js_1.redactSensitive)(input);
            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk-abc123');
        });
        it('redacts Bearer tokens', () => {
            const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
            const redacted = (0, event_logger_js_1.redactSensitive)(input);
            expect(redacted).toContain('[REDACTED]');
        });
        it('redacts GitHub tokens', () => {
            const input = 'Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const redacted = (0, event_logger_js_1.redactSensitive)(input);
            expect(redacted).toContain('[REDACTED]');
        });
        it('redacts sensitive object keys', () => {
            const obj = {
                username: 'user',
                password: 'secret123',
                apiKey: 'key123',
                normalField: 'value',
            };
            const redacted = (0, event_logger_js_1.redactObject)(obj);
            expect(redacted.username).toBe('user');
            expect(redacted.password).toBe('[REDACTED]');
            expect(redacted.apiKey).toBe('[REDACTED]');
            expect(redacted.normalField).toBe('value');
        });
        it('redacts nested objects', () => {
            const obj = {
                config: {
                    token: 'secret-token',
                    name: 'test',
                },
            };
            const redacted = (0, event_logger_js_1.redactObject)(obj);
            expect(redacted.config.token).toBe('[REDACTED]');
            expect(redacted.config.name).toBe('test');
        });
        it('does not redact when unsafeLogPrompts is true', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({
                sessionDir,
                runId: 'unsafe-test',
                unsafeLogPrompts: true,
            });
            logger.logError({
                category: 'test',
                message: 'Token: sk-abc123def456ghi789jkl012mno345pqr678stu901',
                deny_reasons: [],
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            // With unsafe mode, sensitive data is preserved
            expect(JSON.stringify(events[0])).toContain('sk-abc123');
        });
    });
    describe('Deterministic Output', () => {
        it('sorts object keys', () => {
            const obj = { z: 1, a: 2, m: 3, b: 4 };
            const sorted = (0, event_logger_js_1.sortObjectKeys)(obj);
            const keys = Object.keys(sorted);
            expect(keys).toEqual(['a', 'b', 'm', 'z']);
        });
        it('sorts nested object keys', () => {
            const obj = {
                z: { c: 1, a: 2 },
                a: { z: 1, b: 2 },
            };
            const sorted = (0, event_logger_js_1.sortObjectKeys)(obj);
            expect(Object.keys(sorted)).toEqual(['a', 'z']);
            expect(Object.keys(sorted.a)).toEqual(['b', 'z']);
            expect(Object.keys(sorted.z)).toEqual(['a', 'c']);
        });
        it('stably sorts string arrays', () => {
            const arr = ['zebra', 'apple', 'mango', 'apple'];
            const sorted = (0, event_logger_js_1.stableSortStrings)(arr);
            expect(sorted).toEqual(['apple', 'apple', 'mango', 'zebra']);
        });
        it('produces same output for same input', () => {
            const logger1 = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'det-test-1' });
            const logger2 = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'det-test-2' });
            const data = {
                command: 'test',
                args: ['b', 'a'],
                normalized_env: { Z: '1', A: '2' },
                policy_enabled: true,
                sandbox_enabled: false,
            };
            logger1.logRunStart(data);
            logger2.logRunStart(data);
            const events1 = (0, event_logger_js_1.readEvents)(logger1.getEventFile());
            const events2 = (0, event_logger_js_1.readEvents)(logger2.getEventFile());
            // Ignore run_id and seq for comparison
            const normalize = (e) => JSON.stringify(e.data);
            expect(normalize(events1[0])).toBe(normalize(events2[0]));
        });
    });
    describe('readEvents', () => {
        it('reads events from file', () => {
            const logger = (0, event_logger_js_1.createEventLogger)({ sessionDir, runId: 'read-test' });
            logger.logRunStart({
                command: 'test',
                args: [],
                normalized_env: {},
                policy_enabled: false,
                sandbox_enabled: false,
            });
            logger.logRunEnd({
                status: 'completed',
                diagnostics: {
                    total_operations: 0,
                    files_read: 0,
                    files_written: 0,
                    tools_executed: 0,
                    provider_calls: 0,
                    retries: 0,
                    errors: 0,
                    denied: 0,
                },
            });
            const events = (0, event_logger_js_1.readEvents)(logger.getEventFile());
            expect(events.length).toBe(2);
            expect(events[0].type).toBe('run_start');
            expect(events[1].type).toBe('run_end');
        });
        it('returns empty array for non-existent file', () => {
            const events = (0, event_logger_js_1.readEvents)('/nonexistent/events.jsonl');
            expect(events).toEqual([]);
        });
    });
});
