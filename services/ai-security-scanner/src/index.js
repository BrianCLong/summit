"use strict";
/**
 * AI Security Scanner - Autonomous Red Teaming Service
 *
 * Provides continuous AI-powered security scanning, vulnerability detection,
 * attribution, and automated remediation with full compliance logging.
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
exports.ZeroTrustValidator = exports.ComplianceLogger = exports.RemediationEngine = exports.VulnerabilityAttributor = exports.RedTeamEngine = exports.AISecurityScanner = void 0;
var ai_scanner_js_1 = require("./scanner/ai-scanner.js");
Object.defineProperty(exports, "AISecurityScanner", { enumerable: true, get: function () { return ai_scanner_js_1.AISecurityScanner; } });
var red_team_engine_js_1 = require("./redteam/red-team-engine.js");
Object.defineProperty(exports, "RedTeamEngine", { enumerable: true, get: function () { return red_team_engine_js_1.RedTeamEngine; } });
var vulnerability_attributor_js_1 = require("./attribution/vulnerability-attributor.js");
Object.defineProperty(exports, "VulnerabilityAttributor", { enumerable: true, get: function () { return vulnerability_attributor_js_1.VulnerabilityAttributor; } });
var remediation_engine_js_1 = require("./remediation/remediation-engine.js");
Object.defineProperty(exports, "RemediationEngine", { enumerable: true, get: function () { return remediation_engine_js_1.RemediationEngine; } });
var compliance_logger_js_1 = require("./compliance/compliance-logger.js");
Object.defineProperty(exports, "ComplianceLogger", { enumerable: true, get: function () { return compliance_logger_js_1.ComplianceLogger; } });
var validator_js_1 = require("./zero-trust/validator.js");
Object.defineProperty(exports, "ZeroTrustValidator", { enumerable: true, get: function () { return validator_js_1.ZeroTrustValidator; } });
__exportStar(require("./types.js"), exports);
