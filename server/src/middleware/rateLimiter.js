"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatedRateLimit = exports.publicRateLimit = void 0;
// @ts-nocheck
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Define different rate-limiting configurations for various scenarios
const publicRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many public requests from this IP, please try again after 15 minutes',
        });
    },
});
exports.publicRateLimit = publicRateLimit;
const authenticatedRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each authenticated user to 1000 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authenticated requests from this user, please try again after 15 minutes',
        });
    },
});
exports.authenticatedRateLimit = authenticatedRateLimit;
