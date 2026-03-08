"use strict";
/**
 * Context Provenance Graph (CPG) Module
 *
 * Implements ADR-009: Cryptographic tracking, versioning, and policy enforcement
 * over model context at token-range granularity.
 *
 * @module context/provenance
 * @see docs/adr/ADR-009_context_provenance_graph.md
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
exports.contextExpirationRule = exports.trustTierEscalationRule = exports.agentQuarantineRule = exports.policyDomainMismatchRule = exports.unsignedSegmentAuditRule = exports.externalTrustRedactionRule = exports.revokedAgentRule = exports.createSegmentId = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./ProvenanceGraph.js"), exports);
__exportStar(require("./PolicyEngine.js"), exports);
__exportStar(require("./ReplayEngine.js"), exports);
var ProvenanceGraph_js_1 = require("./ProvenanceGraph.js");
Object.defineProperty(exports, "createSegmentId", { enumerable: true, get: function () { return ProvenanceGraph_js_1.createSegmentId; } });
var PolicyEngine_js_1 = require("./PolicyEngine.js");
Object.defineProperty(exports, "revokedAgentRule", { enumerable: true, get: function () { return PolicyEngine_js_1.revokedAgentRule; } });
Object.defineProperty(exports, "externalTrustRedactionRule", { enumerable: true, get: function () { return PolicyEngine_js_1.externalTrustRedactionRule; } });
Object.defineProperty(exports, "unsignedSegmentAuditRule", { enumerable: true, get: function () { return PolicyEngine_js_1.unsignedSegmentAuditRule; } });
Object.defineProperty(exports, "policyDomainMismatchRule", { enumerable: true, get: function () { return PolicyEngine_js_1.policyDomainMismatchRule; } });
Object.defineProperty(exports, "agentQuarantineRule", { enumerable: true, get: function () { return PolicyEngine_js_1.agentQuarantineRule; } });
Object.defineProperty(exports, "trustTierEscalationRule", { enumerable: true, get: function () { return PolicyEngine_js_1.trustTierEscalationRule; } });
Object.defineProperty(exports, "contextExpirationRule", { enumerable: true, get: function () { return PolicyEngine_js_1.contextExpirationRule; } });
