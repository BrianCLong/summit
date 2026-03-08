"use strict";
// @ts-nocheck
/**
 * Help Routes
 * REST API routes for contextual help and Copilot integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../controllers/index.js");
const router = (0, express_1.Router)();
exports.helpRouter = router;
// Contextual help
router.post('/context', (req, res, next) => index_js_1.contextualHelpController.getContextualHelp(req, res, next));
router.get('/search', (req, res, next) => index_js_1.contextualHelpController.search(req, res, next));
router.get('/anchor/:anchorKey', (req, res, next) => index_js_1.contextualHelpController.getAnchorHelp(req, res, next));
router.get('/anchors', (req, res, next) => index_js_1.contextualHelpController.getRouteAnchors(req, res, next));
router.get('/has-help', (req, res, next) => index_js_1.contextualHelpController.hasHelpContent(req, res, next));
router.get('/onboarding', (req, res, next) => index_js_1.contextualHelpController.getOnboarding(req, res, next));
// Copilot integration
router.post('/copilot/query', (req, res, next) => index_js_1.contextualHelpController.copilotQuery(req, res, next));
router.get('/copilot/document/:id', (req, res, next) => index_js_1.contextualHelpController.getCopilotDocument(req, res, next));
router.get('/copilot/updates', (req, res, next) => index_js_1.contextualHelpController.getCopilotUpdates(req, res, next));
