"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHasPermission = void 0;
exports.authorize = authorize;
const permissions_js_1 = require("../security/permissions.js");
Object.defineProperty(exports, "userHasPermission", { enumerable: true, get: function () { return permissions_js_1.userHasPermission; } });
function authorize(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const normalized = (0, permissions_js_1.normalizePermission)(requiredPermission);
        const allowed = normalized && (0, permissions_js_1.userHasPermission)(req.user, normalized);
        if (!allowed) {
            return res.status(403).json({
                error: 'Forbidden',
                required: normalized || requiredPermission,
                actorRole: req.user.role,
            });
        }
        return next();
    };
}
exports.default = authorize;
