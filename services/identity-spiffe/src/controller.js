"use strict";
/**
 * SPIFFE identity controller
 * Provides endpoints for SVID issuance and revocation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
exports.router = express_1.default.Router();
/**
 * Health check for the identity service.
 */
exports.router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
/**
 * Placeholder for SVID issuance.
 * TODO: integrate with SPIRE server to mint SVIDs for workloads.
 */
exports.router.post('/svid', (_req, res) => {
    res.status(501).json({ error: 'not implemented' });
});
