import express from 'express';
import { BackupInventoryService } from '../dr/backup-inventory/BackupInventoryService.js';
import { PolicyChecker } from '../dr/backup-inventory/PolicyChecker.js';
import { BackupPolicy } from '../dr/backup-inventory/types.js';

const router = express.Router();
const service = BackupInventoryService.getInstance();
const checker = new PolicyChecker();

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
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
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
  const defaultPolicy: BackupPolicy = {
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

export default router;
