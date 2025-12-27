// @ts-nocheck
import express from 'express';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import { setFlagHandler, getFlagHandler } from '../controllers/FlagController.js';

const router = express.Router();

// Middleware to ensure admin role for all routes in this router
const ensureAdmin = [ensureAuthenticated, ensureRole(['admin'])];

/**
 * POST /api/admin/flags/set
 * Set a flag value (Kill Switch / Break Glass)
 */
router.post('/set', ensureAdmin, setFlagHandler);

/**
 * GET /api/admin/flags/:name
 * Get current flag value
 */
router.get('/:name', ensureAdmin, getFlagHandler);

export default router;
