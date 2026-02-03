import express from 'express';
import tenantsRouter from './tenants.js';
import usersRouter from './users.js';
import rolesRouter from './roles.js';
import quotaRouter from './quota.js';
import identityRouter from './identity.js';
import legacyAdminRouter from '../admin.js';

const router = express.Router();

/**
 * Admin Gateway Router
 * 
 * Consolidates all administrative modules into a single entry point.
 * Mounted at /api/admin in app.ts
 */

// Domain-specific admin modules
router.use('/tenants', tenantsRouter);
router.use('/users', usersRouter);
router.use('/roles', rolesRouter);
router.use('/quota', quotaRouter);
router.use('/identity', identityRouter);

// Legacy and miscellaneous admin endpoints
// Note: We mount legacyAdminRouter here; paths in admin.ts should be relative to /api/admin
router.use('/', legacyAdminRouter);

export default router;
