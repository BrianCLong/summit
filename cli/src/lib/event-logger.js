"use strict";
/**
 * Event Logger Module
 *
 * Provides structured JSONL event logging for session audit trails.
 * Features:
 * - Append-only JSONL format
 * - Deterministic output (timestamps optional)
 * - Monotonically increasing sequence numbers
 * - Automatic redaction of sensitive data
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
exports.EventLogger = void 0;
exports.redactSensitive = redactSensitive;
exports.redactObject = redactObject;
exports.sortObjectKeys = sortObjectKeys;
exports.stableSortStrings = stableSortStrings;
exports.readEvents = readEvents;
exports.createEventLogger = createEventLogger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Patterns for redacting sensitive data
 */
const REDACTION_PATTERNS = [
    // API keys and tokens
    /\b(sk-[a-zA-Z0-9]{20,})\b/g,
    /\b(xoxb-[a-zA-Z0-9-]+)\b/g,
    /\b(xoxp-[a-zA-Z0-9-]+)\b/g,
    /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
    /\b(gho_[a-zA-Z0-9]{36,})\b/g,
    /\b(github_pat_[a-zA-Z0-9_]{22,})\b/g,
    // Bearer tokens
    /Bearer\s+[a-zA-Z0-9._-]+/gi,
    // JWT tokens
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    // Generic secrets
    /\b(password|secret|token|apikey|api_key|auth)[=:]\s*["']?[^\s"']+["']?/gi,
    // AWS keys
    /\b(AKIA[0-9A-Z]{16})\b/g,
    /\b([a-zA-Z0-9/+]{40})\b/g,
];
/**
 * Redact sensitive data from a string
 */
function redactSensitive(input) {
    let result = input;
    for (const pattern of REDACTION_PATTERNS) {
        result = result.replace(pattern, '[REDACTED]');
    }
    return result;
}
/**
 * Redact sensitive data from an object recursively
 */
function redactObject(obj) {
    if (typeof obj === 'string') {
        return redactSensitive(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(redactObject);
    }
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            // Redact values for sensitive keys
            const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'credential', 'bearer'];
            const isSensitiveKey = sensitiveKeys.some(k => key.toLowerCase().includes(k));
            if (isSensitiveKey && typeof value === 'string') {
                result[key] = '[REDACTED]';
            }
            else {
                result[key] = redactObject(value);
            }
        }
        return result;
    }
    return obj;
}
/**
 * Sort object keys deterministically
 */
function sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        for (const key of keys) {
            sorted[key] = sortObjectKeys(obj[key]);
        }
        return sorted;
    }
    return obj;
}
/**
 * Stable sort for arrays of strings
 */
function stableSortStrings(arr) {
    return [...arr].sort((a, b) => a.localeCompare(b));
}
/**
 * Event logger class
 */
class EventLogger {
    options;
    eventFile;
    sequence = 0;
    startTime;
    constructor(options) {
        this.options = options;
        this.startTime = Date.now();
        // Ensure session directory exists
        const sessionPath = path.join(options.sessionDir, options.runId);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        this.eventFile = path.join(sessionPath, 'events.jsonl');
    }
    /**
     * Get the current timestamp (null if timestamps disabled)
     */
    getTimestamp() {
        return this.options.includeTimestamps ? Date.now() : null;
    }
    /**
     * Get elapsed time in ms (null if timestamps disabled)
     */
    getElapsedMs() {
        return this.options.includeTimestamps ? Date.now() - this.startTime : null;
    }
    /**
     * Write an event to the log
     */
    writeEvent(type, data) {
        this.sequence++;
        // Redact sensitive data unless unsafe mode
        const safeData = this.options.unsafeLogPrompts
            ? data
            : redactObject(data);
        // Sort data keys for determinism
        const sortedData = sortObjectKeys(safeData);
        const event = {
            v: 1,
            ts: this.getTimestamp(),
            type,
            run_id: this.options.runId,
            seq: this.sequence,
            data: sortedData,
        };
        // Sort top-level keys
        const sortedEvent = sortObjectKeys(event);
        const line = JSON.stringify(sortedEvent) + '\n';
        fs.appendFileSync(this.eventFile, line);
    }
    /**
     * Log run start event
     */
    logRunStart(data) {
        this.writeEvent('run_start', {
            ...data,
            args: stableSortStrings(data.args),
            normalized_env: sortObjectKeys(data.normalized_env),
        });
    }
    /**
     * Log step start event
     */
    logStepStart(data) {
        this.writeEvent('step_start', data);
    }
    /**
     * Log action event
     */
    logAction(data) {
        this.writeEvent('action', {
            ...data,
            affected_files: stableSortStrings(data.affected_files),
        });
    }
    /**
     * Log provider call event
     */
    logProviderCall(data) {
        this.writeEvent('provider_call', {
            ...data,
            latency_ms: this.options.includeTimestamps ? data.latency_ms ?? null : null,
        });
    }
    /**
     * Log tool execution event
     */
    logToolExec(data) {
        this.writeEvent('tool_exec', {
            ...data,
            args: stableSortStrings(data.args),
            duration_ms: this.options.includeTimestamps ? data.duration_ms ?? null : null,
        });
    }
    /**
     * Log run end event
     */
    logRunEnd(data) {
        this.writeEvent('run_end', {
            ...data,
            duration_ms: this.options.includeTimestamps ? data.duration_ms ?? this.getElapsedMs() : null,
            diagnostics: sortObjectKeys(data.diagnostics),
        });
    }
    /**
     * Log error event
     */
    logError(data) {
        this.writeEvent('error', {
            ...data,
            message: this.options.unsafeLogPrompts ? data.message : redactSensitive(data.message),
            deny_reasons: stableSortStrings(data.deny_reasons),
        });
    }
    /**
     * Log policy decision event
     */
    logPolicyDecision(data) {
        this.writeEvent('policy_decision', {
            ...data,
            deny_reasons: stableSortStrings(data.deny_reasons),
            limits: sortObjectKeys(data.limits),
        });
    }
    /**
     * Get the event file path
     */
    getEventFile() {
        return this.eventFile;
    }
    /**
     * Get current sequence number
     */
    getSequence() {
        return this.sequence;
    }
}
exports.EventLogger = EventLogger;
/**
 * Read events from a JSONL file
 */
function readEvents(eventFile) {
    if (!fs.existsSync(eventFile)) {
        return [];
    }
    const content = fs.readFileSync(eventFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    return lines.map(line => JSON.parse(line));
}
/**
 * Create event logger
 */
function createEventLogger(options) {
    return new EventLogger(options);
}
