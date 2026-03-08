"use strict";
/**
 * Admin Rate Limit Management Routes
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRateLimitRouter = void 0;
const express_1 = require("express");
const routes_js_1 = require("@intelgraph/rate-limiter/dist/admin/routes.js");
const rateLimit_new_js_1 = require("../middleware/rateLimit.new.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
exports.adminRateLimitRouter = router;
// Require authentication for all admin routes
router.use(auth_js_1.authMiddleware);
// Require internal tier for admin access
router.use((req, res, next) => {
    const tier = req.user?.tier || req.tenant?.plan;
    if (tier !== 'internal') {
        return res.status(403).json({
            success: false,
            error: 'Forbidden: Internal tier required',
        });
    }
    next();
});
// Mount rate limit admin router
router.use('/', (0, routes_js_1.createAdminRateLimitRouter)(rateLimit_new_js_1.rateLimiter, rateLimit_new_js_1.metricsCollector));
