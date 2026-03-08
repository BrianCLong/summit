"use strict";
/**
 * @intelgraph/procurement-automation
 *
 * Automated Government Procurement & Compliance Engine
 *
 * Streamlines government procurement, software accreditation, and compliance paperwork.
 * Features:
 * - Parse requirements and auto-detect applicable frameworks
 * - Auto-complete compliance forms with organization/system data
 * - Generate SBOMs and integrate with vulnerability scanning
 * - Surface documents for rapid Authority to Operate (ATO)
 * - Track compliance progress with dashboards and checklists
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
exports.ProcurementAutomationEngine = exports.SBOMIntegration = exports.ComplianceTracker = exports.ATODocumentGenerator = exports.FormAutoCompleteEngine = exports.RequirementsParser = void 0;
// Types
__exportStar(require("./types.js"), exports);
// Requirements Parser
var requirements_parser_js_1 = require("./requirements-parser.js");
Object.defineProperty(exports, "RequirementsParser", { enumerable: true, get: function () { return requirements_parser_js_1.RequirementsParser; } });
// Form Auto-completion
var form_autocomplete_js_1 = require("./form-autocomplete.js");
Object.defineProperty(exports, "FormAutoCompleteEngine", { enumerable: true, get: function () { return form_autocomplete_js_1.FormAutoCompleteEngine; } });
// ATO Document Generator
var ato_document_generator_js_1 = require("./ato-document-generator.js");
Object.defineProperty(exports, "ATODocumentGenerator", { enumerable: true, get: function () { return ato_document_generator_js_1.ATODocumentGenerator; } });
// Compliance Tracker
var compliance_tracker_js_1 = require("./compliance-tracker.js");
Object.defineProperty(exports, "ComplianceTracker", { enumerable: true, get: function () { return compliance_tracker_js_1.ComplianceTracker; } });
// SBOM Integration
var sbom_integration_js_1 = require("./sbom-integration.js");
Object.defineProperty(exports, "SBOMIntegration", { enumerable: true, get: function () { return sbom_integration_js_1.SBOMIntegration; } });
// Main Engine
var engine_js_1 = require("./engine.js");
Object.defineProperty(exports, "ProcurementAutomationEngine", { enumerable: true, get: function () { return engine_js_1.ProcurementAutomationEngine; } });
