export var ReasonCode;
(function (ReasonCode) {
    ReasonCode["EXPORT_CONTROL"] = "EXPORT_CONTROL";
    ReasonCode["POLICY_DENY"] = "POLICY_DENY";
    ReasonCode["DUAL_CONTROL_REQUIRED"] = "DUAL_CONTROL_REQUIRED";
    ReasonCode["DUAL_CONTROL_DENIED"] = "DUAL_CONTROL_DENIED";
    ReasonCode["ATTESTATION_MISSING"] = "ATTESTATION_MISSING";
    ReasonCode["SBOM_POLICY_FAIL"] = "SBOM_POLICY_FAIL";
    ReasonCode["INCIDENT_CLOSED_CANCELLED"] = "INCIDENT_CLOSED_CANCELLED";
    ReasonCode["USER_ROLE_INSUFFICIENT"] = "USER_ROLE_INSUFFICIENT";
    ReasonCode["RATE_LIMIT"] = "RATE_LIMIT";
    ReasonCode["UNKNOWN"] = "UNKNOWN";
})(ReasonCode || (ReasonCode = {}));
export function mapPreflightToReason(reason, requiresDual) {
    const r = (reason || '').toLowerCase();
    if (r.includes('export'))
        return ReasonCode.EXPORT_CONTROL;
    if (r.includes('role') || r.includes('permission'))
        return ReasonCode.USER_ROLE_INSUFFICIENT;
    if (r.includes('rate'))
        return ReasonCode.RATE_LIMIT;
    if (requiresDual)
        return ReasonCode.DUAL_CONTROL_REQUIRED;
    return ReasonCode.POLICY_DENY;
}
//# sourceMappingURL=SafetyReason.js.map