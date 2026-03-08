"use strict";
/**
 * Validation utilities for threat detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitValidator = exports.ThreatEventSchema = void 0;
exports.validateThreatEvent = validateThreatEvent;
exports.isValidIp = isValidIp;
exports.isValidDomain = isValidDomain;
exports.isValidUrl = isValidUrl;
exports.isValidHash = isValidHash;
exports.isValidEmail = isValidEmail;
exports.isValidMitreTechnique = isValidMitreTechnique;
exports.sanitizeInput = sanitizeInput;
exports.sanitizeSqlInput = sanitizeSqlInput;
exports.isValidJson = isValidJson;
exports.isValidTimeRange = isValidTimeRange;
exports.isValidThreatScore = isValidThreatScore;
exports.validateIndicator = validateIndicator;
const zod_1 = require("zod");
const events_js_1 = require("../types/events.js");
/**
 * Zod schema for ThreatEvent validation
 */
exports.ThreatEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    source: zod_1.z.nativeEnum(events_js_1.EventSource),
    category: zod_1.z.nativeEnum(events_js_1.ThreatCategory),
    severity: zod_1.z.nativeEnum(events_js_1.ThreatSeverity),
    userId: zod_1.z.string().optional(),
    entityId: zod_1.z.string().optional(),
    sourceIp: zod_1.z.string().ip().optional(),
    destinationIp: zod_1.z.string().ip().optional(),
    threatScore: zod_1.z.number().min(0).max(1),
    confidenceScore: zod_1.z.number().min(0).max(1),
    indicators: zod_1.z.array(zod_1.z.string()),
    description: zod_1.z.string().min(1),
    rawData: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.record(zod_1.z.any()),
    mitreAttackTactics: zod_1.z.array(zod_1.z.string()).optional(),
    mitreAttackTechniques: zod_1.z.array(zod_1.z.string()).optional(),
    correlationId: zod_1.z.string().optional(),
    relatedEvents: zod_1.z.array(zod_1.z.string()).optional(),
    responded: zod_1.z.boolean(),
    responseActions: zod_1.z.array(zod_1.z.string()).optional()
});
/**
 * Validate threat event
 */
function validateThreatEvent(event) {
    try {
        const validated = exports.ThreatEventSchema.parse(event);
        return { valid: true, event: validated };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return { valid: false, errors: error };
        }
        throw error;
    }
}
/**
 * Validate IP address
 */
function isValidIp(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv4Regex.test(ip)) {
        const parts = ip.split('.');
        return parts.every(part => parseInt(part, 10) <= 255);
    }
    return ipv6Regex.test(ip);
}
/**
 * Validate domain name
 */
function isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}
/**
 * Validate URL
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validate hash (MD5, SHA1, SHA256, SHA512)
 */
function isValidHash(hash, type) {
    const patterns = {
        md5: /^[a-fA-F0-9]{32}$/,
        sha1: /^[a-fA-F0-9]{40}$/,
        sha256: /^[a-fA-F0-9]{64}$/,
        sha512: /^[a-fA-F0-9]{128}$/
    };
    if (type) {
        return patterns[type].test(hash);
    }
    // Try all patterns if type not specified
    return Object.values(patterns).some(pattern => pattern.test(hash));
}
/**
 * Validate email address
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Validate MITRE ATT&CK technique ID
 */
function isValidMitreTechnique(techniqueId) {
    // Format: T1234 or T1234.001
    const techniqueRegex = /^T\d{4}(\.\d{3})?$/;
    return techniqueRegex.test(techniqueId);
}
/**
 * Sanitize user input to prevent injection attacks
 */
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[\\]/g, '') // Remove backslashes
        .trim();
}
/**
 * Validate and sanitize SQL input (basic protection)
 */
function sanitizeSqlInput(input) {
    const dangerous = [
        'DROP', 'DELETE', 'UPDATE', 'INSERT', 'EXEC', 'EXECUTE',
        'CREATE', 'ALTER', 'GRANT', 'REVOKE', '--', ';', 'xp_'
    ];
    let sanitized = input.trim();
    for (const keyword of dangerous) {
        const regex = new RegExp(keyword, 'gi');
        if (regex.test(sanitized)) {
            throw new Error(`Potentially dangerous SQL keyword detected: ${keyword}`);
        }
    }
    return sanitized;
}
/**
 * Validate JSON data
 */
function isValidJson(data) {
    try {
        JSON.parse(data);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validate time range
 */
function isValidTimeRange(start, end, maxRange) {
    if (start > end) {
        return { valid: false, error: 'Start time must be before end time' };
    }
    if (start > new Date()) {
        return { valid: false, error: 'Start time cannot be in the future' };
    }
    if (maxRange) {
        const range = end.getTime() - start.getTime();
        if (range > maxRange) {
            return { valid: false, error: `Time range exceeds maximum of ${maxRange}ms` };
        }
    }
    return { valid: true };
}
/**
 * Validate threat score range
 */
function isValidThreatScore(score) {
    return score >= 0 && score <= 1 && !isNaN(score);
}
/**
 * Validate indicator type and value
 */
function validateIndicator(type, value) {
    switch (type) {
        case 'ip':
            if (!isValidIp(value)) {
                return { valid: false, error: 'Invalid IP address format' };
            }
            break;
        case 'domain':
            if (!isValidDomain(value)) {
                return { valid: false, error: 'Invalid domain format' };
            }
            break;
        case 'url':
            if (!isValidUrl(value)) {
                return { valid: false, error: 'Invalid URL format' };
            }
            break;
        case 'hash':
            if (!isValidHash(value)) {
                return { valid: false, error: 'Invalid hash format' };
            }
            break;
        case 'email':
            if (!isValidEmail(value)) {
                return { valid: false, error: 'Invalid email format' };
            }
            break;
        default:
            return { valid: false, error: `Unknown indicator type: ${type}` };
    }
    return { valid: true };
}
/**
 * Rate limiting validator
 */
class RateLimitValidator {
    maxRequests;
    windowMs;
    counts = new Map();
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    validate(key) {
        const now = Date.now();
        const record = this.counts.get(key);
        if (!record || now >= record.resetAt) {
            // New window
            this.counts.set(key, {
                count: 1,
                resetAt: now + this.windowMs
            });
            return {
                allowed: true,
                remaining: this.maxRequests - 1,
                resetAt: now + this.windowMs
            };
        }
        if (record.count >= this.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: record.resetAt
            };
        }
        record.count++;
        return {
            allowed: true,
            remaining: this.maxRequests - record.count,
            resetAt: record.resetAt
        };
    }
    reset(key) {
        this.counts.delete(key);
    }
    clear() {
        this.counts.clear();
    }
}
exports.RateLimitValidator = RateLimitValidator;
