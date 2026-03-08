"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimInputSchema = exports.ClaimStatus = exports.RiskTier = exports.EvidenceType = void 0;
// @ts-nocheck
const zod_1 = require("zod");
var EvidenceType;
(function (EvidenceType) {
    EvidenceType["CustomerMetric"] = "customer_metric";
    EvidenceType["CustomerQuote"] = "customer_quote";
    EvidenceType["Certification"] = "certification";
    EvidenceType["Sla"] = "sla";
    EvidenceType["Audit"] = "audit";
    EvidenceType["SecurityAttestation"] = "security_attestation";
    EvidenceType["ProductTelemetry"] = "product_telemetry";
    EvidenceType["DemoVideo"] = "demo_video";
})(EvidenceType || (exports.EvidenceType = EvidenceType = {}));
var RiskTier;
(function (RiskTier) {
    RiskTier["Low"] = "low";
    RiskTier["Medium"] = "medium";
    RiskTier["High"] = "high";
})(RiskTier || (exports.RiskTier = RiskTier = {}));
var ClaimStatus;
(function (ClaimStatus) {
    ClaimStatus["Pending"] = "pending";
    ClaimStatus["Approved"] = "approved";
    ClaimStatus["Rejected"] = "rejected";
    ClaimStatus["Expired"] = "expired";
})(ClaimStatus || (exports.ClaimStatus = ClaimStatus = {}));
exports.ClaimInputSchema = zod_1.z.object({
    message: zod_1.z.string().min(10),
    evidenceType: zod_1.z.nativeEnum(EvidenceType),
    evidenceSource: zod_1.z.string().min(3),
    owner: zod_1.z.string().min(2),
    channels: zod_1.z.array(zod_1.z.union([zod_1.z.literal('web'), zod_1.z.literal('sales'), zod_1.z.literal('content')])).min(1),
    riskTier: zod_1.z.nativeEnum(RiskTier).optional(),
    reviewDate: zod_1.z.string().optional(),
    forwardLooking: zod_1.z.boolean().optional(),
    complianceSurface: zod_1.z.array(zod_1.z.string()).optional(),
});
