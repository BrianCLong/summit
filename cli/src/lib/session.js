"use strict";
/**
 * Session Management Module
 *
 * Provides session tracking for CLI operations:
 * - Deterministic session ID generation
 * - Session state persistence
 * - Operation audit trail
 * - Diagnostics collection
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
exports.Session = void 0;
exports.generateSessionId = generateSessionId;
exports.generateRandomSessionId = generateRandomSessionId;
exports.loadSession = loadSession;
exports.listSessions = listSessions;
exports.cleanOldSessions = cleanOldSessions;
exports.createSession = createSession;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
/**
 * Generate deterministic session ID
 */
function generateSessionId(repoRoot, command, timestamp, seed) {
    const input = [repoRoot, command, timestamp, seed || ''].join('|');
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return `session-${hash.slice(0, 16)}`;
}
/**
 * Generate random session ID
 */
function generateRandomSessionId() {
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `session-${randomBytes}`;
}
/**
 * Session class for tracking CLI operations
 */
class Session {
    state;
    sessionDir;
    sessionFile;
    startMemory;
    constructor(options) {
        const startTime = new Date().toISOString();
        const sessionId = options.deterministicId
            ? generateSessionId(options.repoRoot, options.command, startTime, options.seed)
            : generateRandomSessionId();
        this.sessionDir = options.sessionDir || path.join(options.repoRoot, '.claude', 'sessions');
        this.sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
        this.startMemory = process.memoryUsage().heapUsed;
        this.state = {
            sessionId,
            startTime,
            status: 'running',
            repoRoot: options.repoRoot,
            command: options.command,
            flags: this.sanitizeFlags(options.flags),
            operations: [],
            diagnostics: {
                totalOperations: 0,
                allowedOperations: 0,
                deniedOperations: 0,
                successfulOperations: 0,
                failedOperations: 0,
                totalDurationMs: 0,
                peakMemoryMb: 0,
                filesRead: 0,
                filesWritten: 0,
                toolsExecuted: 0,
                networkCalls: 0,
                policyEvaluations: 0,
                gitOperations: 0,
            },
        };
        // Ensure session directory exists
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }
    }
    /**
     * Sanitize flags to remove sensitive values
     */
    sanitizeFlags(flags) {
        const sanitized = {};
        const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /credential/i];
        for (const [key, value] of Object.entries(flags)) {
            const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
            sanitized[key] = isSensitive ? '[REDACTED]' : value;
        }
        return sanitized;
    }
    /**
     * Get session ID
     */
    getSessionId() {
        return this.state.sessionId;
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Record an operation
     */
    recordOperation(type, target, status, details = {}, durationMs = 0) {
        const operation = {
            timestamp: new Date().toISOString(),
            type,
            target,
            status,
            details: this.sanitizeDetails(details),
            durationMs,
        };
        this.state.operations.push(operation);
        this.updateDiagnostics(operation);
        this.persist();
    }
    /**
     * Sanitize operation details
     */
    sanitizeDetails(details) {
        const sanitized = {};
        for (const [key, value] of Object.entries(details)) {
            if (typeof value === 'string' && value.length > 1000) {
                sanitized[key] = `[TRUNCATED: ${value.length} chars]`;
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Update diagnostics based on operation
     */
    updateDiagnostics(operation) {
        const d = this.state.diagnostics;
        d.totalOperations++;
        d.totalDurationMs += operation.durationMs;
        if (operation.status === 'allowed' || operation.status === 'success') {
            d.allowedOperations++;
        }
        if (operation.status === 'denied') {
            d.deniedOperations++;
        }
        if (operation.status === 'success') {
            d.successfulOperations++;
        }
        if (operation.status === 'failure') {
            d.failedOperations++;
        }
        switch (operation.type) {
            case 'read':
                d.filesRead++;
                break;
            case 'write':
                d.filesWritten++;
                break;
            case 'exec':
                d.toolsExecuted++;
                break;
            case 'network':
                d.networkCalls++;
                break;
            case 'policy':
                d.policyEvaluations++;
                break;
            case 'git':
                d.gitOperations++;
                break;
        }
        // Update peak memory
        const currentMemoryMb = (process.memoryUsage().heapUsed - this.startMemory) / 1024 / 1024;
        if (currentMemoryMb > d.peakMemoryMb) {
            d.peakMemoryMb = Math.round(currentMemoryMb * 100) / 100;
        }
    }
    /**
     * Mark session as completed
     */
    complete() {
        this.state.status = 'completed';
        this.state.endTime = new Date().toISOString();
        this.persist();
    }
    /**
     * Mark session as failed
     */
    fail(error) {
        this.state.status = 'failed';
        this.state.endTime = new Date().toISOString();
        if (error) {
            this.recordOperation('policy', 'session', 'failure', { error });
        }
        this.persist();
    }
    /**
     * Mark session as cancelled
     */
    cancel() {
        this.state.status = 'cancelled';
        this.state.endTime = new Date().toISOString();
        this.persist();
    }
    /**
     * Persist session state to file
     */
    persist() {
        try {
            const json = JSON.stringify(this.state, Object.keys(this.state).sort(), 2);
            fs.writeFileSync(this.sessionFile, json);
        }
        catch {
            // Ignore persistence errors
        }
    }
    /**
     * Get session file path
     */
    getSessionFile() {
        return this.sessionFile;
    }
    /**
     * Format session as JSON (deterministic output)
     */
    toJSON() {
        return JSON.stringify(this.state, Object.keys(this.state).sort(), 2);
    }
    /**
     * Format session summary for display
     */
    formatSummary() {
        const d = this.state.diagnostics;
        const duration = this.state.endTime
            ? new Date(this.state.endTime).getTime() - new Date(this.state.startTime).getTime()
            : Date.now() - new Date(this.state.startTime).getTime();
        const lines = [
            `Session: ${this.state.sessionId}`,
            `Status: ${this.state.status}`,
            `Duration: ${Math.round(duration / 1000)}s`,
            `Operations: ${d.totalOperations} (${d.successfulOperations} success, ${d.failedOperations} failed, ${d.deniedOperations} denied)`,
            `Files: ${d.filesRead} read, ${d.filesWritten} written`,
            `Tools: ${d.toolsExecuted} executed`,
            `Network: ${d.networkCalls} calls`,
            `Git: ${d.gitOperations} operations`,
            `Policy: ${d.policyEvaluations} evaluations`,
            `Peak Memory: ${d.peakMemoryMb}MB`,
        ];
        return lines.join('\n');
    }
}
exports.Session = Session;
/**
 * Load session from file
 */
function loadSession(sessionFile) {
    try {
        if (!fs.existsSync(sessionFile)) {
            return null;
        }
        const content = fs.readFileSync(sessionFile, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * List sessions in a directory
 */
function listSessions(sessionDir) {
    try {
        if (!fs.existsSync(sessionDir)) {
            return [];
        }
        const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
        const sessionsWithMtime = [];
        for (const file of files) {
            const filePath = path.join(sessionDir, file);
            const session = loadSession(filePath);
            if (session) {
                // Use file mtime as secondary sort key for determinism
                const stat = fs.statSync(filePath);
                sessionsWithMtime.push({ session, mtime: stat.mtimeMs });
            }
        }
        // Sort by start time (newest first), then by file mtime (newest first) as tiebreaker
        return sessionsWithMtime
            .sort((a, b) => {
            const timeDiff = new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime();
            if (timeDiff !== 0)
                return timeDiff;
            // Use file mtime as tiebreaker (newer files first)
            return b.mtime - a.mtime;
        })
            .map((item) => item.session);
    }
    catch {
        return [];
    }
}
/**
 * Clean old sessions
 */
function cleanOldSessions(sessionDir, maxAgeDays = 7) {
    try {
        if (!fs.existsSync(sessionDir)) {
            return 0;
        }
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith('.json'));
        let cleaned = 0;
        for (const file of files) {
            const filePath = path.join(sessionDir, file);
            const session = loadSession(filePath);
            if (session && new Date(session.startTime).getTime() <= cutoff) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        }
        return cleaned;
    }
    catch {
        return 0;
    }
}
/**
 * Create a new session
 */
function createSession(options) {
    return new Session(options);
}
