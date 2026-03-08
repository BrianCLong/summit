"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditBus = void 0;
exports.log = log;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class AuditBus {
    hmacKey;
    logPath;
    now;
    lastChecksum = null;
    metadata;
    constructor(options) {
        this.hmacKey = options.hmacKey;
        this.logPath = options.logPath || 'audit.log';
        this.now = options.now || Date.now;
        this.metadata = {
            service: options.serviceName || 'authz-gateway',
            version: options.serviceVersion,
            environment: options.environment || process.env.NODE_ENV || 'development',
            host: options.includeHostname === false ? undefined : os_1.default.hostname(),
        };
        this.ensureLogDirectory();
        this.lastChecksum = this.rehydrateLastChecksum();
    }
    publish(entry) {
        const enriched = {
            ...entry,
            ts: new Date(this.now()).toISOString(),
            previousChecksum: this.lastChecksum,
            event: {
                ...this.metadata,
                ...entry.event,
            },
        };
        const checksum = this.computeChecksum(enriched);
        const record = { ...enriched, checksum };
        fs_1.default.appendFileSync(this.logPath, JSON.stringify(record) + '\n');
        this.lastChecksum = checksum;
        return record;
    }
    ensureLogDirectory() {
        const directory = path_1.default.dirname(this.logPath);
        if (directory && directory !== '.') {
            fs_1.default.mkdirSync(directory, { recursive: true });
        }
    }
    rehydrateLastChecksum() {
        if (!fs_1.default.existsSync(this.logPath)) {
            return null;
        }
        try {
            const content = fs_1.default.readFileSync(this.logPath, 'utf8').trim();
            if (!content) {
                return null;
            }
            const lines = content.split('\n');
            const lastLine = lines[lines.length - 1];
            const parsed = JSON.parse(lastLine);
            return typeof parsed.checksum === 'string' ? parsed.checksum : null;
        }
        catch {
            return null;
        }
    }
    computeChecksum(entry) {
        const { checksum: _ignored, ...record } = entry;
        const payload = JSON.stringify(record);
        return crypto_1.default.createHmac('sha256', this.hmacKey).update(payload).digest('hex');
    }
}
exports.AuditBus = AuditBus;
const defaultAuditBus = process.env.AUDIT_HMAC_KEY
    ? new AuditBus({
        hmacKey: process.env.AUDIT_HMAC_KEY,
        logPath: process.env.AUDIT_LOG_PATH,
        serviceName: process.env.SERVICE_NAME,
        serviceVersion: process.env.SERVICE_VERSION,
        environment: process.env.NODE_ENV,
    })
    : null;
function log(entry) {
    try {
        if (defaultAuditBus) {
            defaultAuditBus.publish(entry);
            return;
        }
        const record = { ...entry, ts: new Date().toISOString() };
        fs_1.default.appendFileSync('audit.log', JSON.stringify(record) + '\n');
    }
    catch (error) {
        // Logging must never crash the gateway; swallow errors intentionally.
        if (process.env.NODE_ENV !== 'test') {
            // eslint-disable-next-line no-console
            console.error('audit_log_failure', error);
        }
    }
}
