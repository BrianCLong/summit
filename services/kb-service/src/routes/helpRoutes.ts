/**
 * Help Routes
 * REST API routes for contextual help and Copilot integration
 */

import { Router } from 'express';
import { contextualHelpController } from '../controllers/index.js';

const router = Router();

// Contextual help
router.post('/context', (req, res, next) => contextualHelpController.getContextualHelp(req, res, next));
router.get('/search', (req, res, next) => contextualHelpController.search(req, res, next));
router.get('/anchor/:anchorKey', (req, res, next) => contextualHelpController.getAnchorHelp(req, res, next));
router.get('/anchors', (req, res, next) => contextualHelpController.getRouteAnchors(req, res, next));
router.get('/has-help', (req, res, next) => contextualHelpController.hasHelpContent(req, res, next));
router.get('/onboarding', (req, res, next) => contextualHelpController.getOnboarding(req, res, next));

// Copilot integration
router.post('/copilot/query', (req, res, next) => contextualHelpController.copilotQuery(req, res, next));
router.get('/copilot/document/:id', (req, res, next) => contextualHelpController.getCopilotDocument(req, res, next));
router.get('/copilot/updates', (req, res, next) => contextualHelpController.getCopilotUpdates(req, res, next));

export { router as helpRouter };
