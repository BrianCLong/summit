"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictRate = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.strictRate = (0, express_rate_limit_1.default)({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
});
