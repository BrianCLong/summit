"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenants_js_1 = __importDefault(require("./tenants.js"));
const users_js_1 = __importDefault(require("./users.js"));
const roles_js_1 = __importDefault(require("./roles.js"));
const quota_js_1 = __importDefault(require("./quota.js"));
const identity_js_1 = __importDefault(require("./identity.js"));
const admin_js_1 = __importDefault(require("../admin.js"));
const router = express_1.default.Router();
/**
 * Admin Gateway Router
 *
 * Consolidates all administrative modules into a single entry point.
 * Mounted at /api/admin in app.ts
 */
// Domain-specific admin modules
router.use('/tenants', tenants_js_1.default);
router.use('/users', users_js_1.default);
router.use('/roles', roles_js_1.default);
router.use('/quota', quota_js_1.default);
router.use('/identity', identity_js_1.default);
// Legacy and miscellaneous admin endpoints
// Note: We mount legacyAdminRouter here; paths in admin.ts should be relative to /api/admin
router.use('/', admin_js_1.default);
exports.default = router;
