"use strict";
/**
 * System Health Service
 *
 * Exposes operational health metrics for the platform including:
 * - Kill-switch and safe-mode state
 * - Backpressure metrics (concurrency, queue depth)
 * - Recent policy denials
 * - SLO results presence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemHealthService = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const logger_js_1 = __importDefault(require("../config/logger.js"));
// In-memory state for kill-switch and safe-mode
// In production, these would be backed by Redis or a database
let killSwitchEnabled = false;
let safeModeEnabled = false;
// Backpressure tracking
const backpressureState = {
    currentConcurrency: 0,
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '100', 10),
    queueDepth: 0,
    maxQueueDepth: parseInt(process.env.MAX_QUEUE_DEPTH || '1000', 10),
};
class SystemHealthServiceImpl {
    killSwitchReason;
    killSwitchEnabledAt;
    safeModeReason;
    safeModeEnabledAt;
    /**
     * Get current system health status
     */
    async getStatus() {
        const sloResultsPath = (0, path_1.join)(process.cwd(), 'dist', 'slo-results.json');
        return {
            timestamp: new Date().toISOString(),
            killSwitch: {
                enabled: killSwitchEnabled,
                reason: this.killSwitchReason,
                enabledAt: this.killSwitchEnabledAt?.toISOString(),
            },
            safeMode: {
                enabled: safeModeEnabled,
                reason: this.safeModeReason,
                enabledAt: this.safeModeEnabledAt?.toISOString(),
            },
            backpressure: {
                ...backpressureState,
                isBackpressured: this.isBackpressured(),
            },
            sloResults: {
                available: (0, fs_1.existsSync)(sloResultsPath),
                path: sloResultsPath,
            },
            recentPolicyDenials: await this.countRecentPolicyDenials(),
        };
    }
    /**
     * Enable kill-switch (stops all non-essential operations)
     */
    enableKillSwitch(reason) {
        killSwitchEnabled = true;
        this.killSwitchReason = reason;
        this.killSwitchEnabledAt = new Date();
        logger_js_1.default.warn('Kill-switch ENABLED', { reason });
    }
    /**
     * Disable kill-switch
     */
    disableKillSwitch() {
        killSwitchEnabled = false;
        this.killSwitchReason = undefined;
        this.killSwitchEnabledAt = undefined;
        logger_js_1.default.info('Kill-switch DISABLED');
    }
    /**
     * Enable safe-mode (reduced functionality)
     */
    enableSafeMode(reason) {
        safeModeEnabled = true;
        this.safeModeReason = reason;
        this.safeModeEnabledAt = new Date();
        logger_js_1.default.warn('Safe-mode ENABLED', { reason });
    }
    /**
     * Disable safe-mode
     */
    disableSafeMode() {
        safeModeEnabled = false;
        this.safeModeReason = undefined;
        this.safeModeEnabledAt = undefined;
        logger_js_1.default.info('Safe-mode DISABLED');
    }
    /**
     * Check if kill-switch is active
     */
    isKillSwitchEnabled() {
        return killSwitchEnabled;
    }
    /**
     * Check if safe-mode is active
     */
    isSafeModeEnabled() {
        return safeModeEnabled;
    }
    /**
     * Check if system is under backpressure
     */
    isBackpressured() {
        return (backpressureState.currentConcurrency >= backpressureState.maxConcurrency * 0.9 ||
            backpressureState.queueDepth >= backpressureState.maxQueueDepth * 0.9);
    }
    /**
     * Update backpressure metrics
     */
    updateBackpressure(concurrency, queueDepth) {
        backpressureState.currentConcurrency = concurrency;
        backpressureState.queueDepth = queueDepth;
    }
    /**
     * Simulate a policy decision (for testing/validation)
     */
    async simulatePolicy(input) {
        const startTime = Date.now();
        // Simplified policy simulation
        // In production, this would call the actual OPA engine
        const { action, resource, subject } = input;
        // Default allow for admins
        if (subject.roles.includes('admin') || subject.roles.includes('ADMIN')) {
            return {
                allowed: true,
                reason: 'Admin role has full access',
                matchedPolicy: 'admin-override',
                evaluationTimeMs: Date.now() - startTime,
            };
        }
        // Check for read access
        if (action === 'read' && subject.roles.includes('viewer')) {
            return {
                allowed: true,
                reason: 'Viewer role has read access',
                matchedPolicy: 'viewer-read',
                evaluationTimeMs: Date.now() - startTime,
            };
        }
        // Check for write access
        if (['create', 'update', 'delete'].includes(action) && subject.roles.includes('editor')) {
            return {
                allowed: true,
                reason: 'Editor role has write access',
                matchedPolicy: 'editor-write',
                evaluationTimeMs: Date.now() - startTime,
            };
        }
        return {
            allowed: false,
            reason: `No policy grants ${action} on ${resource} for roles: ${subject.roles.join(', ')}`,
            evaluationTimeMs: Date.now() - startTime,
        };
    }
    /**
     * Count recent policy denials from audit logs
     */
    async countRecentPolicyDenials() {
        // In production, this would query the audit_logs table
        // For now, return a placeholder
        try {
            // Placeholder - in production:
            // const result = await db.query(
            //   'SELECT COUNT(*) FROM audit_logs WHERE status_code = 403 AND created_at > NOW() - INTERVAL 1 HOUR'
            // );
            // return result.rows[0].count;
            return 0;
        }
        catch (error) {
            logger_js_1.default.error('Failed to count policy denials', { error });
            return -1;
        }
    }
}
exports.systemHealthService = new SystemHealthServiceImpl();
