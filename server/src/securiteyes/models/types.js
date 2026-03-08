"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATIONSHIPS = exports.NODE_LABELS = void 0;
exports.NODE_LABELS = {
    THREAT_ACTOR: 'ThreatActor',
    CAMPAIGN: 'Campaign',
    INTRUSION_SET: 'IntrusionSet',
    TTP: 'TTP',
    INDICATOR: 'Indicator',
    SUSPICIOUS_EVENT: 'SuspiciousEvent',
    ABUSE_PATTERN: 'AbusePattern',
    INSIDER_RISK_PROFILE: 'InsiderRiskProfile',
    DECEPTION_ASSET: 'DeceptionAsset',
    INVESTIGATION: 'Investigation',
    MITIGATION: 'Mitigation',
    THREAT_INTEL_FEED: 'ThreatIntelFeed',
    INCIDENT: 'Incident',
    ASSET: 'Asset',
    TENANT: 'Tenant',
};
exports.RELATIONSHIPS = {
    ATTRIBUTED_TO: 'ATTRIBUTED_TO',
    USES_TTP: 'USES_TTP',
    INDICATES: 'INDICATES',
    OBSERVED_IN: 'OBSERVED_IN',
    SUSPICIOUS_FOR: 'SUSPICIOUS_FOR',
    PART_OF_INVESTIGATION: 'PART_OF_INVESTIGATION',
    MITIGATED_BY: 'MITIGATED_BY',
    TARGETS: 'TARGETS',
    LURED_BY: 'LURED_BY',
    RAISED_FROM: 'RAISED_FROM',
    SUPPORTED_BY: 'SUPPORTED_BY',
    HAS_RISK_PROFILE: 'HAS_RISK_PROFILE',
    TRIGGERED_BY: 'TRIGGERED_BY',
};
