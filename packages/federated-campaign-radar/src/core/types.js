"use strict";
/**
 * Federated Campaign Radar - Core Types
 *
 * Privacy-preserving cross-organization campaign signal sharing for information warfare defense.
 * Implements federated narrative clustering, C2PA credential support, and early-warning detection.
 *
 * @see https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
 * @see https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.AlertStatus = exports.AlertPriority = exports.AlertSeverity = exports.AlertType = exports.ThreatLevel = exports.ClusterStatus = exports.ParticipantStatus = exports.ReachCategory = exports.ChannelType = exports.ProvenanceSourceType = exports.CoordinationPatternType = exports.PrivacyLevel = exports.SignalType = void 0;
exports.createSignalId = createSignalId;
exports.createClusterId = createClusterId;
exports.createAlertId = createAlertId;
exports.createFederationId = createFederationId;
exports.calculateThreatLevel = calculateThreatLevel;
exports.calculateAlertPriority = calculateAlertPriority;
const uuid_1 = require("uuid");
var SignalType;
(function (SignalType) {
    SignalType["NARRATIVE"] = "NARRATIVE";
    SignalType["CLAIM"] = "CLAIM";
    SignalType["MEDIA_ARTIFACT"] = "MEDIA_ARTIFACT";
    SignalType["URL"] = "URL";
    SignalType["ACCOUNT_HANDLE"] = "ACCOUNT_HANDLE";
    SignalType["HASHTAG"] = "HASHTAG";
    SignalType["COORDINATION_PATTERN"] = "COORDINATION_PATTERN";
    SignalType["AMPLIFICATION_NETWORK"] = "AMPLIFICATION_NETWORK";
    SignalType["BOT_NETWORK"] = "BOT_NETWORK";
    SignalType["SYNTHETIC_MEDIA"] = "SYNTHETIC_MEDIA";
})(SignalType || (exports.SignalType = SignalType = {}));
var PrivacyLevel;
(function (PrivacyLevel) {
    PrivacyLevel["PUBLIC"] = "PUBLIC";
    PrivacyLevel["HASHED"] = "HASHED";
    PrivacyLevel["ENCRYPTED"] = "ENCRYPTED";
    PrivacyLevel["AGGREGATE_ONLY"] = "AGGREGATE_ONLY";
    PrivacyLevel["INTERNAL_ONLY"] = "INTERNAL_ONLY";
})(PrivacyLevel || (exports.PrivacyLevel = PrivacyLevel = {}));
var CoordinationPatternType;
(function (CoordinationPatternType) {
    CoordinationPatternType["SYNCHRONIZED_POSTING"] = "SYNCHRONIZED_POSTING";
    CoordinationPatternType["COPY_PASTE_CAMPAIGN"] = "COPY_PASTE_CAMPAIGN";
    CoordinationPatternType["HASHTAG_HIJACKING"] = "HASHTAG_HIJACKING";
    CoordinationPatternType["BRIGADING"] = "BRIGADING";
    CoordinationPatternType["ASTROTURFING"] = "ASTROTURFING";
    CoordinationPatternType["BOT_AMPLIFICATION"] = "BOT_AMPLIFICATION";
    CoordinationPatternType["SOCKPUPPET_NETWORK"] = "SOCKPUPPET_NETWORK";
    CoordinationPatternType["INAUTHENTIC_BEHAVIOR"] = "INAUTHENTIC_BEHAVIOR";
})(CoordinationPatternType || (exports.CoordinationPatternType = CoordinationPatternType = {}));
var ProvenanceSourceType;
(function (ProvenanceSourceType) {
    ProvenanceSourceType["DIRECT_OBSERVATION"] = "DIRECT_OBSERVATION";
    ProvenanceSourceType["PLATFORM_API"] = "PLATFORM_API";
    ProvenanceSourceType["CROWDSOURCED"] = "CROWDSOURCED";
    ProvenanceSourceType["PARTNER_FEED"] = "PARTNER_FEED";
    ProvenanceSourceType["AUTOMATED_DETECTION"] = "AUTOMATED_DETECTION";
    ProvenanceSourceType["INTELLIGENCE_REPORT"] = "INTELLIGENCE_REPORT";
})(ProvenanceSourceType || (exports.ProvenanceSourceType = ProvenanceSourceType = {}));
var ChannelType;
(function (ChannelType) {
    ChannelType["SOCIAL_MEDIA"] = "SOCIAL_MEDIA";
    ChannelType["MESSAGING_APP"] = "MESSAGING_APP";
    ChannelType["NEWS_SITE"] = "NEWS_SITE";
    ChannelType["BLOG"] = "BLOG";
    ChannelType["FORUM"] = "FORUM";
    ChannelType["VIDEO_PLATFORM"] = "VIDEO_PLATFORM";
    ChannelType["PODCAST"] = "PODCAST";
    ChannelType["EMAIL"] = "EMAIL";
    ChannelType["SMS"] = "SMS";
    ChannelType["OFFLINE"] = "OFFLINE";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var ReachCategory;
(function (ReachCategory) {
    ReachCategory["MICRO"] = "MICRO";
    ReachCategory["SMALL"] = "SMALL";
    ReachCategory["MEDIUM"] = "MEDIUM";
    ReachCategory["LARGE"] = "LARGE";
    ReachCategory["MASSIVE"] = "MASSIVE";
})(ReachCategory || (exports.ReachCategory = ReachCategory = {}));
var ParticipantStatus;
(function (ParticipantStatus) {
    ParticipantStatus["ACTIVE"] = "ACTIVE";
    ParticipantStatus["SUSPENDED"] = "SUSPENDED";
    ParticipantStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ParticipantStatus["REVOKED"] = "REVOKED";
})(ParticipantStatus || (exports.ParticipantStatus = ParticipantStatus = {}));
var ClusterStatus;
(function (ClusterStatus) {
    ClusterStatus["EMERGING"] = "EMERGING";
    ClusterStatus["ACTIVE"] = "ACTIVE";
    ClusterStatus["PEAK"] = "PEAK";
    ClusterStatus["DECLINING"] = "DECLINING";
    ClusterStatus["DORMANT"] = "DORMANT";
    ClusterStatus["RESOLVED"] = "RESOLVED";
})(ClusterStatus || (exports.ClusterStatus = ClusterStatus = {}));
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["INFORMATIONAL"] = "INFORMATIONAL";
    ThreatLevel["LOW"] = "LOW";
    ThreatLevel["MEDIUM"] = "MEDIUM";
    ThreatLevel["HIGH"] = "HIGH";
    ThreatLevel["CRITICAL"] = "CRITICAL";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var AlertType;
(function (AlertType) {
    AlertType["CAMPAIGN_EMERGING"] = "CAMPAIGN_EMERGING";
    AlertType["CAMPAIGN_ESCALATING"] = "CAMPAIGN_ESCALATING";
    AlertType["CROSS_TENANT_SPIKE"] = "CROSS_TENANT_SPIKE";
    AlertType["COORDINATION_DETECTED"] = "COORDINATION_DETECTED";
    AlertType["NARRATIVE_SHIFT"] = "NARRATIVE_SHIFT";
    AlertType["SYNTHETIC_MEDIA_SURGE"] = "SYNTHETIC_MEDIA_SURGE";
    AlertType["ATTRIBUTION_UPDATE"] = "ATTRIBUTION_UPDATE";
    AlertType["THRESHOLD_BREACH"] = "THRESHOLD_BREACH";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "INFO";
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertPriority;
(function (AlertPriority) {
    AlertPriority["P4"] = "P4";
    AlertPriority["P3"] = "P3";
    AlertPriority["P2"] = "P2";
    AlertPriority["P1"] = "P1";
    AlertPriority["P0"] = "P0";
})(AlertPriority || (exports.AlertPriority = AlertPriority = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["NEW"] = "NEW";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["INVESTIGATING"] = "INVESTIGATING";
    AlertStatus["MITIGATING"] = "MITIGATING";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["FALSE_POSITIVE"] = "FALSE_POSITIVE";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
var ActionType;
(function (ActionType) {
    ActionType["MONITOR"] = "MONITOR";
    ActionType["INVESTIGATE"] = "INVESTIGATE";
    ActionType["ESCALATE"] = "ESCALATE";
    ActionType["COUNTER_NARRATIVE"] = "COUNTER_NARRATIVE";
    ActionType["PLATFORM_REPORT"] = "PLATFORM_REPORT";
    ActionType["PREBUNK"] = "PREBUNK";
    ActionType["INOCULATION"] = "INOCULATION";
    ActionType["STAKEHOLDER_NOTIFY"] = "STAKEHOLDER_NOTIFY";
    ActionType["PUBLIC_STATEMENT"] = "PUBLIC_STATEMENT";
})(ActionType || (exports.ActionType = ActionType = {}));
// ============================================================================
// Utility Functions
// ============================================================================
function createSignalId() {
    return `sig_${(0, uuid_1.v4)()}`;
}
function createClusterId() {
    return `clst_${(0, uuid_1.v4)()}`;
}
function createAlertId() {
    return `alrt_${(0, uuid_1.v4)()}`;
}
function createFederationId() {
    return `fed_${(0, uuid_1.v4)()}`;
}
function calculateThreatLevel(signalCount, orgCount, velocityMetrics, coordinationStrength) {
    // Composite threat scoring
    let score = 0;
    // Signal volume factor
    if (signalCount > 1000)
        score += 30;
    else if (signalCount > 100)
        score += 20;
    else if (signalCount > 10)
        score += 10;
    // Cross-org factor (network effect)
    if (orgCount > 5)
        score += 25;
    else if (orgCount > 2)
        score += 15;
    else if (orgCount > 1)
        score += 5;
    // Velocity factor
    if (velocityMetrics.growthRate > 100)
        score += 25;
    else if (velocityMetrics.growthRate > 50)
        score += 15;
    else if (velocityMetrics.growthRate > 10)
        score += 5;
    // Coordination factor
    score += coordinationStrength * 20;
    // Map to threat level
    if (score >= 80)
        return ThreatLevel.CRITICAL;
    if (score >= 60)
        return ThreatLevel.HIGH;
    if (score >= 40)
        return ThreatLevel.MEDIUM;
    if (score >= 20)
        return ThreatLevel.LOW;
    return ThreatLevel.INFORMATIONAL;
}
function calculateAlertPriority(severity, crossTenantSignal, orgCount) {
    let priorityScore = 0;
    // Base priority from severity
    switch (severity) {
        case AlertSeverity.CRITICAL:
            priorityScore = 4;
            break;
        case AlertSeverity.HIGH:
            priorityScore = 3;
            break;
        case AlertSeverity.MEDIUM:
            priorityScore = 2;
            break;
        case AlertSeverity.LOW:
            priorityScore = 1;
            break;
        default:
            priorityScore = 0;
    }
    // Boost for cross-tenant
    if (crossTenantSignal)
        priorityScore += 1;
    // Boost for multiple orgs
    if (orgCount > 3)
        priorityScore += 1;
    // Map to priority
    if (priorityScore >= 5)
        return AlertPriority.P0;
    if (priorityScore >= 4)
        return AlertPriority.P1;
    if (priorityScore >= 3)
        return AlertPriority.P2;
    if (priorityScore >= 2)
        return AlertPriority.P3;
    return AlertPriority.P4;
}
