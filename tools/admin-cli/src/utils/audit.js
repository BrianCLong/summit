"use strict";
/**
 * Audit logging for Admin CLI operations
 * Records all CLI operations to the audit black box
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditor = createAuditor;
exports.createAuditContext = createAuditContext;
exports.withAudit = withAudit;
const node_os_1 = __importDefault(require("node:os"));
const uuid_1 = require("uuid");
const logger_js_1 = require("./logger.js");
/**
 * Create auditor instance
 */
function createAuditor(config) {
    const { enabled, apiClient } = config;
    async function record(event) {
        if (!enabled) {
            logger_js_1.logger.debug('Audit logging disabled, skipping record');
            return;
        }
        const fullEvent = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            hostname: node_os_1.default.hostname(),
            username: node_os_1.default.userInfo().username,
            ...event,
            // Redact sensitive options
            options: redactSensitive(event.options),
        };
        logger_js_1.logger.debug('Recording audit event', { action: event.action });
        // Log locally for backup
        logLocally(fullEvent);
        // Send to audit service if API client is configured
        if (apiClient) {
            try {
                const response = await apiClient.post('/admin/audit/record', {
                    action: `cli.${event.action}`,
                    details: fullEvent,
                });
                if (!response.success) {
                    logger_js_1.logger.warn('Failed to send audit event to server', {
                        error: response.error?.message,
                    });
                }
            }
            catch (err) {
                logger_js_1.logger.warn('Error sending audit event', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }
    return { record };
}
/**
 * Redact sensitive values from options
 */
function redactSensitive(options) {
    const sensitiveKeys = [
        'token',
        'password',
        'secret',
        'key',
        'apiKey',
        'credential',
        'auth',
    ];
    const redacted = {};
    for (const [key, value] of Object.entries(options)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()));
        if (isSensitive && typeof value === 'string') {
            redacted[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            redacted[key] = redactSensitive(value);
        }
        else {
            redacted[key] = value;
        }
    }
    return redacted;
}
/**
 * Log audit event locally
 */
function logLocally(event) {
    // In production, this would write to a local file or syslog
    // For now, we use structured logging
    logger_js_1.logger.verbose('AUDIT', event);
}
/**
 * Generate audit context for a command
 */
function createAuditContext(command, args, options) {
    return {
        command,
        args,
        options: redactSensitive(options),
    };
}
/**
 * Wrap a command handler with audit logging
 */
function withAudit(auditor, action, userId, handler) {
    return (async (...args) => {
        const startTime = Date.now();
        let result = 'success';
        let errorMessage;
        try {
            await handler(...args);
        }
        catch (err) {
            result = 'failure';
            errorMessage = err instanceof Error ? err.message : String(err);
            throw err;
        }
        finally {
            const durationMs = Date.now() - startTime;
            await auditor.record({
                action,
                command: action,
                args: args.map(String),
                options: {},
                userId,
                result,
                errorMessage,
                durationMs,
            });
        }
    });
}
