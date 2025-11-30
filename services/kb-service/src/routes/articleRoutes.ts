/**
 * Article Routes
 * REST API routes for article management
 */

import { Router } from 'express';
import { articleController } from '../controllers/index.js';

const router = Router();

// Article CRUD
router.get('/', (req, res, next) => articleController.list(req, res, next));
router.get('/pending-reviews', (req, res, next) => articleController.getPendingReviews(req, res, next));
router.get('/:id', (req, res, next) => articleController.get(req, res, next));
router.post('/', (req, res, next) => articleController.create(req, res, next));
router.patch('/:id', (req, res, next) => articleController.update(req, res, next));
router.delete('/:id', (req, res, next) => articleController.delete(req, res, next));

// Versions
router.get('/:id/versions', (req, res, next) => articleController.getVersions(req, res, next));
router.post('/:id/versions', (req, res, next) => articleController.createVersion(req, res, next));

// Workflow
router.post('/versions/:versionId/submit-review', (req, res, next) => articleController.submitForReview(req, res, next));
router.post('/versions/:versionId/review', (req, res, next) => articleController.submitReview(req, res, next));
router.post('/versions/:versionId/publish', (req, res, next) => articleController.publish(req, res, next));
router.get('/versions/:versionId/workflow', (req, res, next) => articleController.getWorkflowState(req, res, next));

// Article actions
router.post('/:id/archive', (req, res, next) => articleController.archive(req, res, next));

export { router as articleRouter };
