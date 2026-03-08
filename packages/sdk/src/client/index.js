"use strict";
/**
 * Summit SDK Client Module
 *
 * Exports all client classes and types for interacting with
 * the Summit Platform API.
 *
 * @module @summit/sdk/client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceClient = exports.PolicyClient = exports.createSummitClient = exports.SummitClient = void 0;
exports.createSummitSDK = createSummitSDK;
// Main client
var SummitClient_js_1 = require("./SummitClient.js");
Object.defineProperty(exports, "SummitClient", { enumerable: true, get: function () { return SummitClient_js_1.SummitClient; } });
Object.defineProperty(exports, "createSummitClient", { enumerable: true, get: function () { return SummitClient_js_1.createSummitClient; } });
// Policy client
var PolicyClient_js_1 = require("./PolicyClient.js");
Object.defineProperty(exports, "PolicyClient", { enumerable: true, get: function () { return PolicyClient_js_1.PolicyClient; } });
// Compliance client
var ComplianceClient_js_1 = require("./ComplianceClient.js");
Object.defineProperty(exports, "ComplianceClient", { enumerable: true, get: function () { return ComplianceClient_js_1.ComplianceClient; } });
// ============================================================================
// Convenience Factory
// ============================================================================
const SummitClient_js_2 = require("./SummitClient.js");
const PolicyClient_js_2 = require("./PolicyClient.js");
const ComplianceClient_js_2 = require("./ComplianceClient.js");
/**
 * Create Summit SDK with all clients
 */
function createSummitSDK(config) {
    const client = new SummitClient_js_2.SummitClient(config);
    return {
        client,
        policy: new PolicyClient_js_2.PolicyClient(client),
        compliance: new ComplianceClient_js_2.ComplianceClient(client),
    };
}
