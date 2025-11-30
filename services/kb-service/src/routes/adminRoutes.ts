/**
 * Admin Routes
 * REST API routes for KB administration
 */

import { Router } from 'express';
import { adminController } from '../controllers/index.js';

const router = Router();

// Tags
router.get('/tags', (req, res, next) => adminController.listTags(req, res, next));
router.get('/tags/:id', (req, res, next) => adminController.getTag(req, res, next));
router.post('/tags', (req, res, next) => adminController.createTag(req, res, next));
router.patch('/tags/:id', (req, res, next) => adminController.updateTag(req, res, next));
router.delete('/tags/:id', (req, res, next) => adminController.deleteTag(req, res, next));

// Audiences
router.get('/audiences', (req, res, next) => adminController.listAudiences(req, res, next));
router.get('/audiences/:id', (req, res, next) => adminController.getAudience(req, res, next));
router.post('/audiences', (req, res, next) => adminController.createAudience(req, res, next));
router.patch('/audiences/:id', (req, res, next) => adminController.updateAudience(req, res, next));
router.delete('/audiences/:id', (req, res, next) => adminController.deleteAudience(req, res, next));

// Help Anchors
router.get('/help-anchors', (req, res, next) => adminController.listHelpAnchors(req, res, next));
router.get('/help-anchors/:id', (req, res, next) => adminController.getHelpAnchor(req, res, next));
router.post('/help-anchors', (req, res, next) => adminController.createHelpAnchor(req, res, next));
router.patch('/help-anchors/:id', (req, res, next) => adminController.updateHelpAnchor(req, res, next));
router.delete('/help-anchors/:id', (req, res, next) => adminController.deleteHelpAnchor(req, res, next));

// Export/Import
router.get('/export', (req, res, next) => adminController.exportAll(req, res, next));
router.get('/export/article/:id', (req, res, next) => adminController.exportArticle(req, res, next));
router.post('/import', (req, res, next) => adminController.importData(req, res, next));

export { router as adminRouter };
