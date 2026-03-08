"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenance_js_1 = require("../scripts/maintenance.js");
const BackupService_js_1 = require("../backup/BackupService.js");
const DisasterRecoveryService_js_1 = require("../dr/DisasterRecoveryService.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const integrity_service_js_1 = require("../evidence/integrity-service.js");
const hotReloadService_js_1 = require("../policy/hotReloadService.js");
const bundleStore_js_1 = require("../policy/bundleStore.js");
const releaseReadinessService_js_1 = require("../services/releaseReadinessService.js");
const SystemHealthService_js_1 = require("../services/SystemHealthService.js");
const router = (0, express_1.Router)();
const backupService = new BackupService_js_1.BackupService();
const drService = new DisasterRecoveryService_js_1.DisasterRecoveryService();
const isHotReloadEnabled = () => (process.env.POLICY_HOT_RELOAD || '').toLowerCase() === 'true';
// All /ops routes require authentication and at least OPERATOR role
router.use(auth_js_1.ensureAuthenticated);
router.use((0, auth_js_1.ensureRole)(['ADMIN', 'admin', 'OPERATOR', 'operator']));
/**
 * @route POST /ops/maintenance
 * @description Trigger system maintenance tasks (partitioning, cleanup)
 */
router.post('/maintenance', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    try {
        // Run asynchronously to avoid timeout
        (0, maintenance_js_1.runMaintenance)().catch(err => logger_js_1.default.error('Async maintenance failed', err));
        res.json({ message: 'Maintenance task started' });
    }
    catch (error) {
        logger_js_1.default.error('Failed to trigger maintenance', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/ops/policy/reload', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    if (!isHotReloadEnabled()) {
        return res.status(403).json({ error: 'POLICY_HOT_RELOAD is disabled' });
    }
    const { bundlePath, signaturePath } = req.body || {};
    if (!bundlePath) {
        return res.status(400).json({ error: 'bundlePath is required' });
    }
    try {
        const version = await hotReloadService_js_1.policyHotReloadService.reload(bundlePath, signaturePath);
        res.json({
            ok: true,
            currentPolicyVersionId: bundleStore_js_1.policyBundleStore.currentPolicyVersionId,
            version,
        });
    }
    catch (error) {
        logger_js_1.default.error('Failed to reload policy bundle', error);
        res.status(500).json({ error: error?.message || 'reload failed' });
    }
});
router.post('/ops/policy/rollback', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    if (!isHotReloadEnabled()) {
        return res.status(403).json({ error: 'POLICY_HOT_RELOAD is disabled' });
    }
    const toVersion = req.query.toVersion || req.body?.toVersion;
    if (!toVersion) {
        return res.status(400).json({ error: 'toVersion is required' });
    }
    try {
        const version = await hotReloadService_js_1.policyHotReloadService.rollback(toVersion);
        res.json({
            ok: true,
            currentPolicyVersionId: bundleStore_js_1.policyBundleStore.currentPolicyVersionId,
            version,
        });
    }
    catch (error) {
        const status = /not found/.test(error?.message || '') ? 404 : 500;
        logger_js_1.default.error('Failed to rollback policy bundle', error);
        res.status(status).json({ error: error?.message || 'rollback failed' });
    }
});
/**
 * @route POST /ops/backup/:type
 * @description Trigger a specific backup
 */
router.post('/backup/:type', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    const { type } = req.params;
    const { uploadToS3 } = req.body;
    try {
        let result;
        switch (type) {
            case 'postgres':
                result = await backupService.backupPostgres({ uploadToS3 });
                break;
            case 'neo4j':
                result = await backupService.backupNeo4j({ uploadToS3 });
                break;
            case 'redis':
                result = await backupService.backupRedis({ uploadToS3 });
                break;
            default:
                return res.status(400).json({ error: 'Invalid backup type. Use postgres, neo4j, or redis.' });
        }
        res.json({ message: 'Backup completed', path: result });
    }
    catch (error) {
        logger_js_1.default.error(`Failed to backup ${type}`, error);
        res.status(500).json({ error: `Backup failed: ${error.message}` });
    }
});
/**
 * @route POST /ops/dr/drill
 * @description Trigger a DR drill simulation
 */
router.post('/dr/drill', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    const { target } = req.body; // 'postgres' or 'neo4j'
    if (target && target !== 'postgres' && target !== 'neo4j') {
        return res.status(400).json({ error: 'Invalid target. Use postgres or neo4j.' });
    }
    try {
        const success = await drService.runDrill(target || 'postgres');
        if (success) {
            res.json({ message: 'DR Drill completed successfully' });
        }
        else {
            res.status(500).json({ error: 'DR Drill failed' });
        }
    }
    catch (error) {
        logger_js_1.default.error('DR drill error', error);
        res.status(500).json({ error: 'DR Drill execution error' });
    }
});
/**
 * @route GET /ops/dr/status
 * @description Get DR status
 */
router.get('/dr/status', (0, auth_js_1.ensureRole)(['ADMIN', 'admin', 'OPERATOR']), async (req, res) => {
    try {
        const status = await drService.getStatus();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get DR status' });
    }
});
/**
 * @route POST /ops/evidence/verify
 * @description Trigger chunked evidence re-hashing for integrity verification
 */
router.post('/evidence/verify', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    if (process.env.EVIDENCE_INTEGRITY !== 'true') {
        return res.status(503).json({ ok: false, error: 'Evidence integrity verification is disabled' });
    }
    const chunkSize = Number(req.body?.chunkSize ?? process.env.EVIDENCE_INTEGRITY_CHUNK ?? 50);
    const rateLimitPerSecond = Number(req.body?.rateLimitPerSecond ?? process.env.EVIDENCE_INTEGRITY_RPS ?? 5);
    const emitIncidents = req.body?.emitIncidents ?? process.env.EVIDENCE_INTEGRITY_INCIDENTS === 'true';
    try {
        const result = await integrity_service_js_1.evidenceIntegrityService.verifyAll({
            chunkSize: Number.isFinite(chunkSize) ? chunkSize : undefined,
            rateLimitPerSecond: Number.isFinite(rateLimitPerSecond) ? rateLimitPerSecond : undefined,
            emitIncidents,
        });
        return res.json({ ok: true, ...result });
    }
    catch (error) {
        logger_js_1.default.error('Failed to run evidence integrity verification', error);
        return res.status(500).json({ ok: false, error: 'Failed to verify evidence integrity' });
    }
});
/**
 * @route GET /ops/release-readiness/summary
 * @description Get release readiness summary with governance checks
 */
router.get('/release-readiness/summary', (0, auth_js_1.ensureRole)(['ADMIN', 'OPERATOR']), async (req, res) => {
    try {
        const summary = await releaseReadinessService_js_1.releaseReadinessService.getSummary();
        res.json(summary);
    }
    catch (error) {
        logger_js_1.default.error('Failed to get release readiness summary', error);
        res.status(500).json({ error: 'Failed to retrieve release readiness summary' });
    }
});
/**
 * @route GET /ops/release-readiness/evidence-index
 * @description Get structured evidence index from governance artifacts
 */
router.get('/release-readiness/evidence-index', (0, auth_js_1.ensureRole)(['ADMIN', 'OPERATOR']), async (req, res) => {
    try {
        const evidenceIndex = await releaseReadinessService_js_1.releaseReadinessService.getEvidenceIndex();
        res.json(evidenceIndex);
    }
    catch (error) {
        logger_js_1.default.error('Failed to get evidence index', error);
        res.status(500).json({ error: 'Failed to retrieve evidence index' });
    }
});
/**
 * @route GET /ops/system-health
 * @description Get system health status including kill-switch, safe-mode, backpressure
 */
router.get('/system-health', (0, auth_js_1.ensureRole)(['ADMIN', 'admin', 'OPERATOR']), async (req, res) => {
    try {
        const status = await SystemHealthService_js_1.systemHealthService.getStatus();
        res.json(status);
    }
    catch (error) {
        logger_js_1.default.error('Failed to get system health status', error);
        res.status(500).json({ error: 'Failed to retrieve system health status' });
    }
});
/**
 * @route POST /ops/system-health/kill-switch
 * @description Enable or disable the kill-switch
 */
router.post('/system-health/kill-switch', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    const { enabled, reason } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled (boolean) is required' });
    }
    if (enabled && !reason) {
        return res.status(400).json({ error: 'reason is required when enabling kill-switch' });
    }
    try {
        if (enabled) {
            SystemHealthService_js_1.systemHealthService.enableKillSwitch(reason);
        }
        else {
            SystemHealthService_js_1.systemHealthService.disableKillSwitch();
        }
        res.json({ ok: true, killSwitchEnabled: SystemHealthService_js_1.systemHealthService.isKillSwitchEnabled() });
    }
    catch (error) {
        logger_js_1.default.error('Failed to toggle kill-switch', error);
        res.status(500).json({ error: 'Failed to toggle kill-switch' });
    }
});
/**
 * @route POST /ops/system-health/safe-mode
 * @description Enable or disable safe-mode
 */
router.post('/system-health/safe-mode', (0, auth_js_1.ensureRole)(['ADMIN', 'admin']), async (req, res) => {
    const { enabled, reason } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled (boolean) is required' });
    }
    if (enabled && !reason) {
        return res.status(400).json({ error: 'reason is required when enabling safe-mode' });
    }
    try {
        if (enabled) {
            SystemHealthService_js_1.systemHealthService.enableSafeMode(reason);
        }
        else {
            SystemHealthService_js_1.systemHealthService.disableSafeMode();
        }
        res.json({ ok: true, safeModeEnabled: SystemHealthService_js_1.systemHealthService.isSafeModeEnabled() });
    }
    catch (error) {
        logger_js_1.default.error('Failed to toggle safe-mode', error);
        res.status(500).json({ error: 'Failed to toggle safe-mode' });
    }
});
/**
 * @route POST /ops/policy-simulator
 * @description Simulate a policy decision for testing/validation
 */
router.post('/policy-simulator', (0, auth_js_1.ensureRole)(['ADMIN', 'admin', 'OPERATOR']), async (req, res) => {
    const { action, resource, subject, context } = req.body;
    if (!action || !resource || !subject) {
        return res.status(400).json({
            error: 'action, resource, and subject are required',
        });
    }
    if (!subject.id || !Array.isArray(subject.roles)) {
        return res.status(400).json({
            error: 'subject must have id (string) and roles (array)',
        });
    }
    try {
        const result = await SystemHealthService_js_1.systemHealthService.simulatePolicy({
            action,
            resource,
            subject,
            context,
        });
        res.json(result);
    }
    catch (error) {
        logger_js_1.default.error('Policy simulation failed', error);
        res.status(500).json({ error: 'Policy simulation failed' });
    }
});
exports.default = router;
