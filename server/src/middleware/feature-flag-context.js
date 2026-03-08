"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlagContextMiddleware = featureFlagContextMiddleware;
const context_js_1 = require("../feature-flags/context.js");
function featureFlagContextMiddleware(req, _res, next) {
    req.featureFlagContext = (0, context_js_1.buildContextFromRequest)(req);
    next();
}
