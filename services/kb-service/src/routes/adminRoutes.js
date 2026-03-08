"use strict";
// @ts-nocheck
/**
 * Admin Routes
 * REST API routes for KB administration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../controllers/index.js");
const router = (0, express_1.Router)();
exports.adminRouter = router;
// Tags
router.get('/tags', (req, res, next) => index_js_1.adminController.listTags(req, res, next));
router.get('/tags/:id', (req, res, next) => index_js_1.adminController.getTag(req, res, next));
router.post('/tags', (req, res, next) => index_js_1.adminController.createTag(req, res, next));
router.patch('/tags/:id', (req, res, next) => index_js_1.adminController.updateTag(req, res, next));
router.delete('/tags/:id', (req, res, next) => index_js_1.adminController.deleteTag(req, res, next));
// Audiences
router.get('/audiences', (req, res, next) => index_js_1.adminController.listAudiences(req, res, next));
router.get('/audiences/:id', (req, res, next) => index_js_1.adminController.getAudience(req, res, next));
router.post('/audiences', (req, res, next) => index_js_1.adminController.createAudience(req, res, next));
router.patch('/audiences/:id', (req, res, next) => index_js_1.adminController.updateAudience(req, res, next));
router.delete('/audiences/:id', (req, res, next) => index_js_1.adminController.deleteAudience(req, res, next));
// Help Anchors
router.get('/help-anchors', (req, res, next) => index_js_1.adminController.listHelpAnchors(req, res, next));
router.get('/help-anchors/:id', (req, res, next) => index_js_1.adminController.getHelpAnchor(req, res, next));
router.post('/help-anchors', (req, res, next) => index_js_1.adminController.createHelpAnchor(req, res, next));
router.patch('/help-anchors/:id', (req, res, next) => index_js_1.adminController.updateHelpAnchor(req, res, next));
router.delete('/help-anchors/:id', (req, res, next) => index_js_1.adminController.deleteHelpAnchor(req, res, next));
// Export/Import
router.get('/export', (req, res, next) => index_js_1.adminController.exportAll(req, res, next));
router.get('/export/article/:id', (req, res, next) => index_js_1.adminController.exportArticle(req, res, next));
router.post('/import', (req, res, next) => index_js_1.adminController.importData(req, res, next));
