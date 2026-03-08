"use strict";
/**
 * Summit SDK
 *
 * Official TypeScript SDK for the Summit platform.
 *
 * @example
 * ```typescript
 * import { SummitClient } from '@summit/sdk';
 *
 * const client = new SummitClient({
 *   baseUrl: 'https://api.summit.example.com',
 *   apiKey: process.env.SUMMIT_API_KEY,
 *   tenantId: 'your-tenant-id'
 * });
 *
 * // Evaluate governance
 * const result = await client.governance.evaluate({
 *   action: 'read',
 *   resource: { type: 'document', id: 'doc-123' }
 * });
 *
 * // Get compliance summary
 * const compliance = await client.compliance.getSummary('SOC2');
 * ```
 *
 * @packageDocumentation
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
exports.default = exports.ComplianceClient = exports.GovernanceClient = exports.SummitClient = void 0;
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "SummitClient", { enumerable: true, get: function () { return client_js_1.SummitClient; } });
var governance_js_1 = require("./governance.js");
Object.defineProperty(exports, "GovernanceClient", { enumerable: true, get: function () { return governance_js_1.GovernanceClient; } });
var compliance_js_1 = require("./compliance.js");
Object.defineProperty(exports, "ComplianceClient", { enumerable: true, get: function () { return compliance_js_1.ComplianceClient; } });
__exportStar(require("./types.js"), exports);
// Default export
var client_js_2 = require("./client.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return client_js_2.SummitClient; } });
