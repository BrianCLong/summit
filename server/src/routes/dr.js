"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const BackupInventoryService_js_1 = require("../dr/backup-inventory/BackupInventoryService.js");
const PolicyChecker_js_1 = require("../dr/backup-inventory/PolicyChecker.js");
const router = express_1.default.Router();
// SEC-2025-001: Enforce authentication and admin role for disaster recovery operations
router.use(auth_js_1.ensureAuthenticated);
router.use((0, auth_js_1.ensureRole)(['ADMIN', 'admin']));
const service = BackupInventoryService_js_1.BackupInventoryService.getInstance();
const checker = new PolicyChecker_js_1.PolicyChecker();
// Initial seed or manual reporting endpoint
router.post('/backups', (req, res) => {
    try {
        // Basic validation
        if (!req.body.id || !req.body.name || !req.body.storeType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // In a real app, validation would be stricter
        const target = service.addTarget(req.body);
        res.status(201).json(target);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/backups', (req, res) => {
    const targets = service.listTargets();
    res.json(targets);
});
router.post('/backups/status', (req, res) => {
    const { id, success, timestamp } = req.body;
    if (!id || success === undefined) {
        return res.status(400).json({ error: 'Missing id or success status' });
    }
    const updated = service.reportStatus(id, success, timestamp ? new Date(timestamp) : new Date());
    if (!updated) {
        return res.status(404).json({ error: 'Backup target not found' });
    }
    res.json(updated);
});
router.post('/backups/check', (req, res) => {
    // Allow passing policy overrides, or use default
    const defaultPolicy = {
        id: 'default-policy',
        minRetentionDays: 30,
        requireEncryption: true,
        maxStalenessHours: 24,
    };
    const policy = { ...defaultPolicy, ...req.body };
    const targets = service.listTargets();
    const report = checker.check(targets, policy);
    res.json(report);
});
exports.default = router;
