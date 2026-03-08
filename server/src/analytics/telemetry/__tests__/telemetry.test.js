"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scrubber_js_1 = require("../scrubber.js");
const TelemetryService_js_1 = require("../TelemetryService.js");
// Use a unique directory for this test run to avoid conflicts
const TEST_LOG_DIR = path_1.default.join(__dirname, 'test_logs_' + Date.now());
const SALT = 'test-salt';
(0, globals_1.describe)('Telemetry Scrubber', () => {
    const scrubber = new scrubber_js_1.TelemetryScrubber(SALT);
    (0, globals_1.it)('should hash values deterministically', () => {
        const val = 'user-123';
        const hash1 = scrubber.hash(val);
        const hash2 = scrubber.hash(val);
        (0, globals_1.expect)(hash1).toBe(hash2);
        (0, globals_1.expect)(hash1).not.toBe(val);
    });
    (0, globals_1.it)('should scrub PII from strings', () => {
        const props = {
            path: '/home',
            userAgent: 'Mozilla/5.0 ...',
            referrer: 'https://google.com',
            // Mocking 'duration' which is allowed
            duration: 'user@example.com', // Putting PII in an allowed field to test scrubbing
        };
        const scrubbed = scrubber.scrubProps('page_view', props);
        (0, globals_1.expect)(scrubbed.duration).toBe('[REDACTED]');
        (0, globals_1.expect)(scrubbed.path).toBe('/home');
    });
    (0, globals_1.it)('should drop unknown properties', () => {
        const props = {
            path: '/home',
            secretField: 'secret-value',
        };
        const scrubbed = scrubber.scrubProps('page_view', props);
        (0, globals_1.expect)(scrubbed.path).toBe('/home');
        (0, globals_1.expect)(scrubbed.secretField).toBeUndefined();
    });
});
(0, globals_1.describe)('Telemetry Service', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        service = new TelemetryService_js_1.TelemetryService({
            salt: SALT,
            logDir: TEST_LOG_DIR,
        });
    });
    (0, globals_1.afterEach)(() => {
        if (fs_1.default.existsSync(TEST_LOG_DIR)) {
            try {
                fs_1.default.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
            }
            catch (e) {
                console.error('Error cleaning up test logs:', e);
            }
        }
    });
    (0, globals_1.it)('should write event to log file with hashed IDs and scrubbed props', async () => {
        const props = {
            path: '/api/resource',
            userAgent: 'Chrome/90',
            unknown: 'should-be-dropped'
        };
        // 'page_view' allows path, referrer, userAgent, duration
        service.track('page_view', 'tenant-1', 'user-1', 'admin', props);
        // Give it a moment for the file system to catch up if needed
        await new Promise(resolve => setTimeout(resolve, 500));
        const files = fs_1.default.readdirSync(TEST_LOG_DIR);
        console.log('Files in log dir:', files);
        (0, globals_1.expect)(files.length).toBeGreaterThan(0);
        const content = fs_1.default.readFileSync(path_1.default.join(TEST_LOG_DIR, files[0]), 'utf-8');
        const event = JSON.parse(content.trim());
        (0, globals_1.expect)(event.eventType).toBe('page_view');
        (0, globals_1.expect)(event.tenantIdHash).not.toBe('tenant-1');
        (0, globals_1.expect)(event.tenantIdHash).toBeDefined();
        (0, globals_1.expect)(event.props.path).toBe('/api/resource');
        (0, globals_1.expect)(event.props.unknown).toBeUndefined();
        (0, globals_1.expect)(event.actorRole).toBe('admin');
    });
});
