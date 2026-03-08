"use strict";
/**
 * Provenance & Integrity Gateway (PIG)
 *
 * Official Content Firewall for governments and enterprises providing:
 * - Inbound media provenance verification (C2PA)
 * - Outbound official content signing
 * - Impersonation and deepfake detection
 * - Tamper-evident truth bundle generation
 * - Asset revocation and propagation
 * - Governance and compliance dashboards
 *
 * @module provenance-integrity-gateway
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
exports.createPIGInstance = exports.ProvenanceIntegrityGateway = exports.pigGovernanceService = exports.PIGGovernanceService = exports.narrativeConflictService = exports.NarrativeConflictService = exports.truthBundleService = exports.TruthBundleService = exports.deepfakeDetectionService = exports.DeepfakeDetectionService = exports.contentSigningService = exports.ContentSigningService = exports.c2paValidationService = exports.C2PAValidationService = void 0;
// Types
__exportStar(require("./types.js"), exports);
// Services
var C2PAValidationService_js_1 = require("./C2PAValidationService.js");
Object.defineProperty(exports, "C2PAValidationService", { enumerable: true, get: function () { return C2PAValidationService_js_1.C2PAValidationService; } });
Object.defineProperty(exports, "c2paValidationService", { enumerable: true, get: function () { return C2PAValidationService_js_1.c2paValidationService; } });
var ContentSigningService_js_1 = require("./ContentSigningService.js");
Object.defineProperty(exports, "ContentSigningService", { enumerable: true, get: function () { return ContentSigningService_js_1.ContentSigningService; } });
Object.defineProperty(exports, "contentSigningService", { enumerable: true, get: function () { return ContentSigningService_js_1.contentSigningService; } });
var DeepfakeDetectionService_js_1 = require("./DeepfakeDetectionService.js");
Object.defineProperty(exports, "DeepfakeDetectionService", { enumerable: true, get: function () { return DeepfakeDetectionService_js_1.DeepfakeDetectionService; } });
Object.defineProperty(exports, "deepfakeDetectionService", { enumerable: true, get: function () { return DeepfakeDetectionService_js_1.deepfakeDetectionService; } });
var TruthBundleService_js_1 = require("./TruthBundleService.js");
Object.defineProperty(exports, "TruthBundleService", { enumerable: true, get: function () { return TruthBundleService_js_1.TruthBundleService; } });
Object.defineProperty(exports, "truthBundleService", { enumerable: true, get: function () { return TruthBundleService_js_1.truthBundleService; } });
var NarrativeConflictService_js_1 = require("./NarrativeConflictService.js");
Object.defineProperty(exports, "NarrativeConflictService", { enumerable: true, get: function () { return NarrativeConflictService_js_1.NarrativeConflictService; } });
Object.defineProperty(exports, "narrativeConflictService", { enumerable: true, get: function () { return NarrativeConflictService_js_1.narrativeConflictService; } });
var PIGGovernanceService_js_1 = require("./PIGGovernanceService.js");
Object.defineProperty(exports, "PIGGovernanceService", { enumerable: true, get: function () { return PIGGovernanceService_js_1.PIGGovernanceService; } });
Object.defineProperty(exports, "pigGovernanceService", { enumerable: true, get: function () { return PIGGovernanceService_js_1.pigGovernanceService; } });
// Main Gateway
var ProvenanceIntegrityGateway_js_1 = require("./ProvenanceIntegrityGateway.js");
Object.defineProperty(exports, "ProvenanceIntegrityGateway", { enumerable: true, get: function () { return ProvenanceIntegrityGateway_js_1.ProvenanceIntegrityGateway; } });
Object.defineProperty(exports, "createPIGInstance", { enumerable: true, get: function () { return ProvenanceIntegrityGateway_js_1.createPIGInstance; } });
