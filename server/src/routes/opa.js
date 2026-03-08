"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaRoutes = void 0;
const express_1 = require("express");
const OpaController_js_1 = require("../controllers/OpaController.js");
const auth_js_1 = require("../middleware/auth.js");
const require_tenant_context_js_1 = require("../middleware/require-tenant-context.js");
const router = (0, express_1.Router)();
// Protect these routes as they allow arbitrary code execution (though in sandbox)
router.use(auth_js_1.ensureAuthenticated, (0, require_tenant_context_js_1.requireTenantContextMiddleware)());
router.get('/policies', OpaController_js_1.OpaController.getPolicies);
router.get('/policies/:filename', OpaController_js_1.OpaController.getPolicyContent);
router.post('/evaluate', OpaController_js_1.OpaController.evaluatePolicy);
router.post('/validate', OpaController_js_1.OpaController.validatePolicy);
exports.opaRoutes = router;
