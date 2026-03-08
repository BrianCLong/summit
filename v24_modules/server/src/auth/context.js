"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_js_1 = require("../../config/environment.js");
const logger_js_1 = require("../observability/logger.js");
const createContext = async ({ req }) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null };
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_js_1.config.JWT_PUBLIC_KEY, {
            algorithms: [environment_js_1.config.JWT_ALGORITHM],
            issuer: environment_js_1.config.JWT_ISSUER,
            audience: environment_js_1.config.JWT_AUDIENCE,
        });
        return {
            user: {
                id: decoded.sub || decoded.id,
                tenantId: decoded.tenantId,
                scopes: decoded.scopes || [],
            },
        };
    }
    catch (error) {
        logger_js_1.logger.warn('GraphQL context authentication failed', { error: error.message });
        return { user: null };
    }
};
exports.createContext = createContext;
