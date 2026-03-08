"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const FlagController_js_1 = require("../controllers/FlagController.js");
const router = express_1.default.Router();
// Middleware to ensure admin role for all routes in this router
const ensureAdmin = [auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['admin'])];
/**
 * POST /api/admin/flags/set
 * Set a flag value (Kill Switch / Break Glass)
 */
router.post('/set', ensureAdmin, FlagController_js_1.setFlagHandler);
/**
 * GET /api/admin/flags/:name
 * Get current flag value
 */
router.get('/:name', ensureAdmin, FlagController_js_1.getFlagHandler);
exports.default = router;
