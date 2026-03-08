"use strict";
/**
 * Summit SDK
 *
 * Official SDK for the Summit Platform API.
 * Provides typed clients for all platform services.
 *
 * @example
 * ```typescript
 * import { createSummitSDK } from '@summit/sdk';
 *
 * const sdk = createSummitSDK({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Check if action is allowed
 * const allowed = await sdk.policy.isAllowed('user-123', 'doc-456', 'read');
 *
 * // Get compliance summary
 * const summary = await sdk.compliance.getSummary();
 * ```
 *
 * @module @summit/sdk
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyDecisionsClient = exports.ReceiptsClient = exports.createSummitSDK = exports.ComplianceClient = exports.PolicyClient = exports.createSummitClient = exports.SummitClient = void 0;
// Client exports
var index_js_1 = require("./client/index.js");
// Main client
Object.defineProperty(exports, "SummitClient", { enumerable: true, get: function () { return index_js_1.SummitClient; } });
Object.defineProperty(exports, "createSummitClient", { enumerable: true, get: function () { return index_js_1.createSummitClient; } });
// Policy client
Object.defineProperty(exports, "PolicyClient", { enumerable: true, get: function () { return index_js_1.PolicyClient; } });
// Compliance client
Object.defineProperty(exports, "ComplianceClient", { enumerable: true, get: function () { return index_js_1.ComplianceClient; } });
Object.defineProperty(exports, "createSummitSDK", { enumerable: true, get: function () { return index_js_1.createSummitSDK; } });
// Generated API client exports
__exportStar(require("./generated/index.js"), exports);
// Governance helpers
var receipts_js_1 = require("./receipts.js");
Object.defineProperty(exports, "ReceiptsClient", { enumerable: true, get: function () { return receipts_js_1.ReceiptsClient; } });
var policyDecisions_js_1 = require("./policyDecisions.js");
Object.defineProperty(exports, "PolicyDecisionsClient", { enumerable: true, get: function () { return policyDecisions_js_1.PolicyDecisionsClient; } });
