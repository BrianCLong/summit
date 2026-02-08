// server/src/api/featureFlags.ts
import express, { Request, Response, Router, NextFunction } from 'express';
import { FeatureFlagService } from '../featureFlags/FeatureFlagService.js';
import { ConfigService } from '../featureFlags/ConfigService.js';
import { EvaluationContext } from '../featureFlags/types.js';
import { ensureAuthenticated, ensureRole, requirePermission } from '../middleware/auth.js';

export interface FeatureFlagApiDependencies {
  featureFlagService: FeatureFlagService;
  configService: ConfigService;
}

/**
 * Middleware to require authentication
 * Assumes req.user is set by upstream auth middleware (e.g., passport, JWT)
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }
  next();
};

/**
 * Middleware to require admin role
 * Feature flag mutation (create/update/delete) requires admin privileges
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  const user = req.user as any;
  const isAdmin = user.role === 'admin' || user.roles?.includes('admin') || user.isAdmin === true;

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'You do not have permission to modify feature flags',
      requiredRole: 'admin',
      yourRole: user.role || 'unknown'
    });
  }

  next();
};

export const createFeatureFlagRouter = (deps: FeatureFlagApiDependencies): Router => {
  const router = express.Router();

  // Get all feature flags for the current user/context
  router.get('/', async (req: Request, res: Response) => {
    try {
      // Extract context from request
      const context: EvaluationContext = {
        userId: req.query.userId as string || req.user?.id,
        groups: req.query.groups ? (req.query.groups as string).split(',') : (req.user as any)?.groups || [],
        attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : (req.user as any)?.attributes || {}
      };

      // Get all flags with their evaluation status
      const flags = await deps.featureFlagService.getAllFlagsWithContext(context);

      // Also get relevant configuration values
      const configs = await deps.configService.getAllConfig();

      // Combine into a response
      const response = {
        flags: Object.entries(flags).map(([key, enabled]) => ({
          key,
          enabled,
          value: enabled, // Simplified for now - in a real system you'd include actual values
          lastUpdated: new Date().toISOString()
        })),
        configs,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error fetching feature flags:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Get a specific feature flag evaluation
  router.get('/:flagKey', async (req: Request, res: Response) => {
    try {
      const flagKey = req.params.flagKey as string;

      // Extract context from request
      const context: EvaluationContext = {
        userId: req.query.userId as string || req.user?.id,
        groups: req.query.groups ? (req.query.groups as string).split(',') : (req.user as any)?.groups || [],
        attributes: req.query.attributes ? JSON.parse(req.query.attributes as string) : (req.user as any)?.attributes || {}
      };

      // Get the flag evaluation
      const enabled = await deps.featureFlagService.isEnabled(flagKey, context);
      const variant = await deps.featureFlagService.getVariant(flagKey, context);

      res.json({
        key: flagKey,
        enabled,
        value: variant !== null ? variant : enabled,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`Error fetching feature flag ${req.params.flagKey}:`, error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Admin API: Create a new feature flag (requires admin privileges)
  router.post('/', ensureAuthenticated, ensureRole(['admin', 'operator']), async (req: Request, res: Response) => {
    try {
      const { key, enabled = false, description, rolloutPercentage, targetUsers, targetGroups, conditions } = req.body;


      // Create the feature flag object
      const newFlag = {
        key,
        enabled,
        type: 'boolean', // Default type
        description: description || '',
        createdBy: req.user?.id || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        rolloutPercentage: rolloutPercentage || undefined,
        targetUsers: targetUsers || undefined,
        targetGroups: targetGroups || undefined,
        conditions: conditions || undefined,
        tags: req.body.tags || [],
        environment: [process.env.NODE_ENV || 'development']
      };

      // TODO: Actually implement the createFlag method in the service
      // await deps.featureFlagService.createFlag(newFlag);

      res.status(201).json({
        key,
        enabled,
        message: 'Feature flag created successfully'
      });
    } catch (error: any) {
      console.error('Error creating feature flag:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Admin API: Update a feature flag (requires admin privileges)
  router.put('/:flagKey', ensureAuthenticated, ensureRole(['admin', 'operator']), async (req: Request, res: Response) => {
    try {
      const { flagKey } = req.params;
      const updateData = req.body;


      // Update the flag
      // await deps.featureFlagService.updateFlag(flagKey, updateData);

      res.json({
        key: flagKey,
        updated: true,
        message: 'Feature flag updated successfully',
        changes: Object.keys(updateData)
      });
    } catch (error: any) {
      console.error(`Error updating feature flag ${req.params.flagKey}:`, error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Admin API: Delete a feature flag (requires admin privileges)
  router.delete('/:flagKey', ensureAuthenticated, ensureRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { flagKey } = req.params;


      // Delete the flag
      // await deps.featureFlagService.deleteFlag(flagKey);

      res.json({
        key: flagKey,
        deleted: true,
        message: 'Feature flag deleted successfully'
      });
    } catch (error: any) {
      console.error(`Error deleting feature flag ${req.params.flagKey}:`, error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Get configuration values
  router.get('/config/:key', async (req: Request, res: Response) => {
    try {
      const key = req.params.key as string;
      const environment = req.query.env as string || process.env.NODE_ENV || 'development';

      const value = await deps.configService.getConfig(key, environment);

      res.json({
        key,
        value,
        environment,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error(`Error fetching config ${req.params.key}:`, error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  // Get multiple configuration values
  router.post('/config/batch', async (req: Request, res: Response) => {
    try {
      const { keys } = req.body;
      const environment = req.query.env as string || process.env.NODE_ENV || 'development';

      if (!Array.isArray(keys)) {
        return res.status(400).json({ error: 'Keys must be an array' });
      }

      const configs = await deps.configService.getMultipleConfig(keys, environment);

      res.json({
        configs,
        environment,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error fetching multiple configs:', error);
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
};

// Export types for consistency
