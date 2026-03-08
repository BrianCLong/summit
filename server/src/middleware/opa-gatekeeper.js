"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaGatekeeperMiddleware = opaGatekeeperMiddleware;
const apollo_server_express_1 = require("apollo-server-express");
const logger_js_1 = require("../utils/logger.js");
function opaGatekeeperMiddleware(opaClient, simulate = false) {
    return async (req, res, next) => {
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const user = req.user;
            if (!user) {
                // In a real application, we would deny the request.
                // For now, we'll just log a warning.
                logger_js_1.logger.warn('No user in request for OPA gatekeeper');
                return next();
            }
            const policyInput = {
                user,
                resource: {
                    type: 'api',
                    path: req.path,
                    tenant: user.tenant,
                },
                operation_type: req.method.toLowerCase(),
            };
            const allowed = await opaClient.evaluate('intelgraph.abac.gatekeeper', policyInput);
            if (simulate) {
                logger_js_1.logger.info('OPA gatekeeper simulation:', {
                    input: policyInput,
                    decision: allowed,
                });
                return next();
            }
            if (!allowed) {
                throw new apollo_server_express_1.ForbiddenError('Access denied by OPA gatekeeper');
            }
        }
        next();
    };
}
