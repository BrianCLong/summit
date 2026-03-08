"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryService = exports.TelemetryService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scrubber_js_1 = require("./scrubber.js");
const crypto_1 = __importDefault(require("crypto"));
class TelemetryService {
    config;
    scrubber;
    logStream = null;
    currentLogFile = '';
    enabled;
    constructor(config) {
        this.config = config;
        this.enabled = config.enabled ?? true;
        this.scrubber = new scrubber_js_1.TelemetryScrubber(config.salt);
        if (this.enabled) {
            this.ensureLogDir();
            this.rotateLog();
        }
    }
    ensureLogDir() {
        if (!fs_1.default.existsSync(this.config.logDir)) {
            console.log(`[TelemetryService] Creating log dir: ${this.config.logDir}`);
            fs_1.default.mkdirSync(this.config.logDir, { recursive: true });
        }
        else {
            console.log(`[TelemetryService] Log dir exists: ${this.config.logDir}`);
        }
    }
    rotateLog() {
        const date = new Date().toISOString().split('T')[0];
        const filename = `telemetry-${date}.jsonl`;
        const filepath = path_1.default.join(this.config.logDir, filename);
        if (this.currentLogFile !== filepath) {
            console.log(`[TelemetryService] Rotating log to: ${filepath}`);
            if (this.logStream) {
                this.logStream.end();
            }
            this.currentLogFile = filepath;
            this.logStream = fs_1.default.createWriteStream(filepath, { flags: 'a' });
            this.logStream.on('error', (err) => {
                console.error('[TelemetryService] Stream error:', err);
            });
            this.logStream.on('open', (fd) => {
                console.log(`[TelemetryService] Stream opened for ${filepath}, fd: ${fd}`);
            });
        }
    }
    track(eventType, rawTenantId, rawUserId, actorRole, props) {
        // 1. Hash identifiers
        const tenantIdHash = this.scrubber.hash(rawTenantId);
        const scopeHash = this.scrubber.hash(rawUserId);
        // 2. Scrub properties
        const cleanProps = this.scrubber.scrubProps(eventType, props);
        // 3. Construct Envelope
        const event = {
            eventId: crypto_1.default.randomUUID(),
            tenantIdHash,
            scopeHash,
            actorRole,
            eventType,
            ts: new Date().toISOString(),
            props: cleanProps,
        };
        // 4. Write to storage
        this.writeEvent(event);
    }
    writeEvent(event) {
        if (!this.enabled) {
            return;
        }
        // Ensure we are writing to the correct day's log
        this.rotateLog();
        if (this.logStream) {
            const line = JSON.stringify(event) + '\n';
            // console.log(`[TelemetryService] Writing event: ${line.trim()}`);
            this.logStream.write(line);
        }
        else {
            console.error('[TelemetryService] No log stream available');
        }
    }
}
exports.TelemetryService = TelemetryService;
// Singleton instance
// In a real app, config would come from env vars
const config = {
    salt: process.env.TELEMETRY_SALT || 'development_salt',
    logDir: process.env.TELEMETRY_LOG_DIR || path_1.default.join(process.cwd(), 'logs', 'telemetry'),
    enabled: process.env.DISABLE_TELEMETRY !== 'true',
};
exports.telemetryService = new TelemetryService(config);
