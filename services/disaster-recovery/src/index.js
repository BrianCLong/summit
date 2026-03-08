"use strict";
/**
 * Disaster Recovery Service
 *
 * Provides automated backup, replication, and disaster recovery
 * with RTO/RPO tracking and DR testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_cron_1 = __importDefault(require("node-cron"));
const backup_manager_1 = require("./managers/backup-manager");
const replication_manager_1 = require("./managers/replication-manager");
const failover_manager_1 = require("./managers/failover-manager");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
app.use(express_1.default.json());
const backupManager = new backup_manager_1.BackupManager();
const replicationManager = new replication_manager_1.ReplicationManager();
const failoverManager = new failover_manager_1.FailoverManager();
// Backup endpoints
app.post('/api/backup/create', async (req, res) => {
    try {
        const { provider, resourceId, retentionDays } = req.body;
        const result = await backupManager.createBackup({
            provider,
            resourceId,
            retentionDays
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/backup/status/:id', async (req, res) => {
    try {
        const status = await backupManager.getBackupStatus(req.params.id);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Replication endpoints
app.post('/api/replication/setup', async (req, res) => {
    try {
        const { source, target, mode } = req.body;
        const result = await replicationManager.setupReplication({
            source,
            target,
            mode
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Failover endpoints
app.post('/api/failover/initiate', async (req, res) => {
    try {
        const { sourceCluster, targetCluster } = req.body;
        const result = await failoverManager.initiateFailover({
            sourceCluster,
            targetCluster
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/failover/test', async (req, res) => {
    try {
        const { cluster } = req.body;
        const result = await failoverManager.testFailover({ cluster });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Scheduled backup jobs
node_cron_1.default.schedule('0 */6 * * *', async () => {
    await backupManager.runScheduledBackups();
});
// Replication monitoring
node_cron_1.default.schedule('*/5 * * * *', async () => {
    await replicationManager.monitorReplication();
});
// Weekly DR testing
node_cron_1.default.schedule('0 2 * * SUN', async () => {
    await failoverManager.runDRTest();
});
app.listen(PORT, () => {
    console.log(`Disaster Recovery Service listening on port ${PORT}`);
});
