// @ts-nocheck
import express from 'express';
import { getFeatureFlagService } from '../feature-flags/setup.js';
import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';
import { ensureAuthenticated as authenticateToken, ensureRole } from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure admin role for mutation operations
const ensureAdmin = [authenticateToken, ensureRole(['admin'])];

// Get all flags (Admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const service = getFeatureFlagService();
    // Assuming listFlags is exposed or we go direct to DB/Provider for admin listing if service doesn't expose it well
    // The service.listFlags() calls provider.listFlags()
    const flags = await service.listFlags();
    res.json(flags);
  } catch (error: any) {
    logger.error('Error fetching feature flags', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

// Get single flag
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const service = getFeatureFlagService();
    const flag = await service.getFlagDefinition(req.params.key);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }
    res.json(flag);
  } catch (error: any) {
    logger.error(`Error fetching flag ${req.params.key}`, error);
    res.status(500).json({ error: 'Failed to fetch flag' });
  }
});

// Create/Update flag (Admin)
router.post('/', ensureAdmin, async (req, res) => {
  const { key, description, type, enabled, defaultValue, variations, rules, tenantId } = req.body;

  // Validation
  if (!key || !type) {
    return res.status(400).json({ error: 'Key and type are required' });
  }

  const pool = getPostgresPool();
  try {
    await pool.query(
      `INSERT INTO feature_flags (key, description, type, enabled, default_value, variations, rollout_rules, tenant_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (key) DO UPDATE SET
         description = EXCLUDED.description,
         type = EXCLUDED.type,
         enabled = EXCLUDED.enabled,
         default_value = EXCLUDED.default_value,
         variations = EXCLUDED.variations,
         rollout_rules = EXCLUDED.rollout_rules,
         tenant_id = EXCLUDED.tenant_id,
         updated_at = NOW()
       RETURNING *`,
      [key, description, type, enabled, defaultValue, JSON.stringify(variations || []), JSON.stringify(rules || []), tenantId]
    );

    // Trigger update in provider via Redis is handled by PostgresProvider listening to its own changes?
    // No, we need to publish the update event so other instances (and this one) reload.
    // We can publish to Redis if available.
    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const pubsub = new Redis(process.env.REDIS_URL);
      await pubsub.publish('feature_flag_updates', JSON.stringify({ key, action: 'update' }));
      pubsub.quit();
    }

    res.json({ success: true, key });
  } catch (error: any) {
    logger.error('Error upserting feature flag', error);
    res.status(500).json({ error: 'Failed to upsert feature flag' });
  }
});

// Delete flag (Admin)
router.delete('/:key', ensureAdmin, async (req, res) => {
  const { key } = req.params;
  const pool = getPostgresPool();

  try {
    await pool.query('DELETE FROM feature_flags WHERE key = $1', [key]);

    if (process.env.REDIS_URL) {
      const Redis = (await import('ioredis')).default;
      const pubsub = new Redis(process.env.REDIS_URL);
      await pubsub.publish('feature_flag_updates', JSON.stringify({ key, action: 'delete' }));
      pubsub.quit();
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting feature flag', error);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

// Evaluate flags for context (Client/Frontend)
router.post('/evaluate', async (req, res) => {
  try {
    const context = req.body.context || {};
    // Augment context with authenticated user info if available
    if (req.user) {
      context.userId = req.user.id || req.user.sub;
      context.userEmail = req.user.email;
      context.userRole = req.user.role;
      context.tenantId = req.user.tenantId || req.user.tenant_id;
    }

    const service = getFeatureFlagService();
    const flags = await service.getAllFlags(context);
    res.json(flags);
  } catch (error: any) {
    logger.error('Error evaluating flags', error);
    res.status(500).json({ error: 'Failed to evaluate flags' });
  }
});

export default router;
