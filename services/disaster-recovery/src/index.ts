/**
 * Disaster Recovery Service
 *
 * Provides automated backup, replication, and disaster recovery
 * with RTO/RPO tracking and DR testing
 */

import express from 'express';
import cron from 'node-cron';
import { BackupManager } from './managers/backup-manager';
import { ReplicationManager } from './managers/replication-manager';
import { FailoverManager } from './managers/failover-manager';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

const backupManager = new BackupManager();
const replicationManager = new ReplicationManager();
const failoverManager = new FailoverManager();

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/backup/status/:id', async (req, res) => {
  try {
    const status = await backupManager.getBackupStatus(req.params.id);
    res.json(status);
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/failover/test', async (req, res) => {
  try {
    const { cluster } = req.body;

    const result = await failoverManager.testFailover({ cluster });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scheduled backup jobs
cron.schedule('0 */6 * * *', async () => {
  await backupManager.runScheduledBackups();
});

// Replication monitoring
cron.schedule('*/5 * * * *', async () => {
  await replicationManager.monitorReplication();
});

// Weekly DR testing
cron.schedule('0 2 * * SUN', async () => {
  await failoverManager.runDRTest();
});

app.listen(PORT, () => {
  console.log(`Disaster Recovery Service listening on port ${PORT}`);
});
