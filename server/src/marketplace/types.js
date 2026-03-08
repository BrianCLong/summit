"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubgraphStatus = exports.TrustTier = exports.SecurityStatus = exports.LicenseType = void 0;
var LicenseType;
(function (LicenseType) {
    LicenseType["MIT"] = "MIT";
    LicenseType["APACHE_2_0"] = "Apache-2.0";
    LicenseType["GPL_3_0"] = "GPL-3.0";
    LicenseType["PROPRIETARY"] = "Proprietary";
    LicenseType["UNKNOWN"] = "Unknown";
})(LicenseType || (exports.LicenseType = LicenseType = {}));
var SecurityStatus;
(function (SecurityStatus) {
    SecurityStatus["SAFE"] = "SAFE";
    SecurityStatus["VULNERABLE"] = "VULNERABLE";
    SecurityStatus["CRITICAL"] = "CRITICAL";
    SecurityStatus["UNKNOWN"] = "UNKNOWN";
})(SecurityStatus || (exports.SecurityStatus = SecurityStatus = {}));
var TrustTier;
(function (TrustTier) {
    TrustTier["INTERNAL"] = "INTERNAL";
    TrustTier["PARTNER"] = "PARTNER";
    TrustTier["COMMUNITY"] = "COMMUNITY";
    TrustTier["UNVERIFIED"] = "UNVERIFIED";
})(TrustTier || (exports.TrustTier = TrustTier = {}));
var SubgraphStatus;
(function (SubgraphStatus) {
    SubgraphStatus["SUBMITTED"] = "SUBMITTED";
    SubgraphStatus["QUARANTINED"] = "QUARANTINED";
    SubgraphStatus["APPROVED"] = "APPROVED";
    SubgraphStatus["REJECTED"] = "REJECTED";
})(SubgraphStatus || (exports.SubgraphStatus = SubgraphStatus = {}));
