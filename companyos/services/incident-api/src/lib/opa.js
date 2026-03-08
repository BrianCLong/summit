"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("config"));
const defaultOpaUrl = 'http://opa:8181/v1/data/companyos/incident/allow';
const opaUrl = config_1.default.get('opa.url') || defaultOpaUrl;
const log = (req, level, message, payload) => {
    const logger = req.log;
    if (logger && logger[level]) {
        logger[level](payload, message);
    }
};
const authorize = (action) => async (req, res, next) => {
    // In a real app, user would be populated from a JWT or session
    const user = req.user || { id: 'user-123', tenant_id: 'tenant-123', roles: ['user'], authenticated: true };
    const resource = {
        ...req.body,
        ...req.params,
        // a real app might fetch the resource from the DB to check ownership
    };
    const input = {
        user,
        resource,
        action: `incident:${action}`,
    };
    try {
        const { data } = await axios_1.default.post(opaUrl, { input });
        if (data.result) {
            log(req, 'info', 'Authorization successful', { ...input, decision: 'allow' });
            next();
        }
        else {
            log(req, 'info', 'Authorization denied', { ...input, decision: 'deny' });
            res.status(403).json({ message: 'Forbidden' });
        }
    }
    catch (error) {
        log(req, 'error', 'Authorization service error', { error });
        res.status(500).json({ message: 'Authorization service unavailable' });
    }
};
exports.authorize = authorize;
