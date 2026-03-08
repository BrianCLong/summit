"use strict";
// @ts-nocheck
/**
 * Financial Compliance Module - Shared Types
 *
 * Core type definitions for compliance, surveillance, risk analytics,
 * fraud detection, market data, and regulatory reporting.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudAlertSchema = exports.SurveillanceAlertSchema = exports.TradeSchema = void 0;
const z = __importStar(require("zod"));
// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================
exports.TradeSchema = z.object({
    tradeId: z.string().uuid(),
    orderId: z.string().uuid().optional(),
    tenantId: z.string().uuid(),
    accountId: z.string(),
    traderId: z.string(),
    symbol: z.string().min(1).max(20),
    side: z.enum(['buy', 'sell']),
    quantity: z.number().positive(),
    price: z.number().positive(),
    executionTime: z.date(),
    venue: z.string(),
    orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']),
    status: z.enum(['pending', 'filled', 'partial', 'cancelled', 'rejected']),
    commission: z.number().nonnegative().optional(),
    fees: z.number().nonnegative().optional(),
    currency: z.string().length(3),
    assetClass: z.enum(['equity', 'fixed_income', 'derivative', 'fx', 'commodity', 'crypto']),
    metadata: z.record(z.unknown()).optional(),
});
exports.SurveillanceAlertSchema = z.object({
    alertId: z.string().uuid(),
    tenantId: z.string().uuid(),
    alertType: z.enum([
        'wash_trading', 'layering', 'spoofing', 'front_running', 'insider_trading',
        'market_manipulation', 'restricted_list_violation', 'position_limit_breach',
        'unusual_volume', 'price_manipulation', 'best_execution_failure',
        'unauthorized_trading', 'communication_flag'
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'false_positive']),
    title: z.string().min(1).max(500),
    description: z.string(),
    detectedAt: z.date(),
    confidence: z.number().min(0).max(1),
});
exports.FraudAlertSchema = z.object({
    alertId: z.string().uuid(),
    tenantId: z.string().uuid(),
    alertType: z.enum([
        'suspicious_transaction', 'structuring', 'velocity_anomaly', 'geographic_anomaly',
        'behavior_change', 'identity_fraud', 'account_takeover', 'money_laundering',
        'sanctions_hit', 'pep_match', 'adverse_media', 'unusual_pattern'
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    status: z.enum(['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'false_positive']),
    riskScore: z.number().min(0).max(100),
    title: z.string().min(1).max(500),
    description: z.string(),
    detectedAt: z.date(),
    entityType: z.enum(['account', 'transaction', 'customer', 'employee']),
    entityId: z.string(),
});
