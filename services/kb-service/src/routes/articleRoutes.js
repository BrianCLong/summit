"use strict";
// @ts-nocheck
/**
 * Article Routes
 * REST API routes for article management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../controllers/index.js");
const router = (0, express_1.Router)();
exports.articleRouter = router;
// Article CRUD
router.get('/', (req, res, next) => index_js_1.articleController.list(req, res, next));
router.get('/pending-reviews', (req, res, next) => index_js_1.articleController.getPendingReviews(req, res, next));
router.get('/:id', (req, res, next) => index_js_1.articleController.get(req, res, next));
router.post('/', (req, res, next) => index_js_1.articleController.create(req, res, next));
router.patch('/:id', (req, res, next) => index_js_1.articleController.update(req, res, next));
router.delete('/:id', (req, res, next) => index_js_1.articleController.delete(req, res, next));
// Versions
router.get('/:id/versions', (req, res, next) => index_js_1.articleController.getVersions(req, res, next));
router.post('/:id/versions', (req, res, next) => index_js_1.articleController.createVersion(req, res, next));
// Workflow
router.post('/versions/:versionId/submit-review', (req, res, next) => index_js_1.articleController.submitForReview(req, res, next));
router.post('/versions/:versionId/review', (req, res, next) => index_js_1.articleController.submitReview(req, res, next));
router.post('/versions/:versionId/publish', (req, res, next) => index_js_1.articleController.publish(req, res, next));
router.get('/versions/:versionId/workflow', (req, res, next) => index_js_1.articleController.getWorkflowState(req, res, next));
// Article actions
router.post('/:id/archive', (req, res, next) => index_js_1.articleController.archive(req, res, next));
