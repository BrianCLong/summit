"use strict";
/**
 * Core event types for threat detection system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSource = exports.ThreatCategory = exports.ThreatSeverity = void 0;
var ThreatSeverity;
(function (ThreatSeverity) {
    ThreatSeverity["CRITICAL"] = "CRITICAL";
    ThreatSeverity["HIGH"] = "HIGH";
    ThreatSeverity["MEDIUM"] = "MEDIUM";
    ThreatSeverity["LOW"] = "LOW";
    ThreatSeverity["INFO"] = "INFO";
})(ThreatSeverity || (exports.ThreatSeverity = ThreatSeverity = {}));
var ThreatCategory;
(function (ThreatCategory) {
    // Network threats
    ThreatCategory["NETWORK_ATTACK"] = "NETWORK_ATTACK";
    ThreatCategory["DDOS"] = "DDOS";
    ThreatCategory["PORT_SCAN"] = "PORT_SCAN";
    ThreatCategory["C2_COMMUNICATION"] = "C2_COMMUNICATION";
    ThreatCategory["DATA_EXFILTRATION"] = "DATA_EXFILTRATION";
    ThreatCategory["DNS_TUNNELING"] = "DNS_TUNNELING";
    // Behavioral threats
    ThreatCategory["ANOMALOUS_BEHAVIOR"] = "ANOMALOUS_BEHAVIOR";
    ThreatCategory["INSIDER_THREAT"] = "INSIDER_THREAT";
    ThreatCategory["PRIVILEGE_ESCALATION"] = "PRIVILEGE_ESCALATION";
    ThreatCategory["CREDENTIAL_ABUSE"] = "CREDENTIAL_ABUSE";
    // Advanced persistent threats
    ThreatCategory["APT"] = "APT";
    ThreatCategory["LATERAL_MOVEMENT"] = "LATERAL_MOVEMENT";
    ThreatCategory["RECONNAISSANCE"] = "RECONNAISSANCE";
    // Data threats
    ThreatCategory["DATA_POISONING"] = "DATA_POISONING";
    ThreatCategory["DATA_MANIPULATION"] = "DATA_MANIPULATION";
    ThreatCategory["INJECTION_ATTACK"] = "INJECTION_ATTACK";
    // Malware
    ThreatCategory["MALWARE"] = "MALWARE";
    ThreatCategory["FILELESS_MALWARE"] = "FILELESS_MALWARE";
    ThreatCategory["PROCESS_INJECTION"] = "PROCESS_INJECTION";
    ThreatCategory["CREDENTIAL_DUMPING"] = "CREDENTIAL_DUMPING";
    // Other
    ThreatCategory["ZERO_DAY"] = "ZERO_DAY";
    ThreatCategory["UNKNOWN"] = "UNKNOWN";
})(ThreatCategory || (exports.ThreatCategory = ThreatCategory = {}));
var EventSource;
(function (EventSource) {
    EventSource["NETWORK"] = "NETWORK";
    EventSource["APPLICATION"] = "APPLICATION";
    EventSource["SYSTEM"] = "SYSTEM";
    EventSource["USER"] = "USER";
    EventSource["API"] = "API";
    EventSource["DATABASE"] = "DATABASE";
    EventSource["EXTERNAL"] = "EXTERNAL";
})(EventSource || (exports.EventSource = EventSource = {}));
