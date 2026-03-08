"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeCustomerRead = authorizeCustomerRead;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("config"));
const defaultOpaUrl = 'http://opa:8181/v1/data/companyos/authz/customer/allow';
const opaUrl = process.env.OPA_URL ?? (config_1.default.has('opa.url') ? config_1.default.get('opa.url') : defaultOpaUrl);
function logInfo(req, message, payload) {
    const logger = req.log ?? req.logger;
    if (logger?.info) {
        logger.info(payload, message);
    }
}
function logError(req, message, payload) {
    const logger = req.log ?? req.logger;
    if (logger?.error) {
        logger.error(payload, message);
    }
}
async function authorizeCustomerRead(req, res, next) {
    const subject = req.user ?? {};
    const resource = {
        type: 'customer',
        tenant_id: req.params.tenantId,
        region: req.params.region
    };
    const input = { subject, resource, action: 'read' };
    try {
        const { data } = await axios_1.default.post(opaUrl ?? defaultOpaUrl, { input });
        if (!data.result) {
            logInfo(req, 'authz_denied', { subject_id: subject.id, resource, action: 'read', decision: 'deny' });
            return res.status(403).json({ error: 'forbidden' });
        }
        logInfo(req, 'authz_allowed', { subject_id: subject.id, resource, action: 'read', decision: 'allow' });
        return next();
    }
    catch (err) {
        logError(req, 'authz_error', { err });
        return res.status(503).json({ error: 'authorization_unavailable' });
    }
}
