"use strict";
/**
 * @intelgraph/threat-detection-core
 * Core types and interfaces for advanced threat detection system
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
exports.MITRE_ATTACK_TACTICS = exports.THREAT_SCORE_THRESHOLDS = exports.DEFAULT_CONFIG = void 0;
// Event types
__exportStar(require("./types/events.js"), exports);
__exportStar(require("./types/threats.js"), exports);
__exportStar(require("./types/alerts.js"), exports);
__exportStar(require("./types/ml.js"), exports);
__exportStar(require("./types/threat-intelligence.js"), exports);
__exportStar(require("./types/hunting.js"), exports);
// Interfaces
__exportStar(require("./interfaces/detector.js"), exports);
// Utilities
__exportStar(require("./utils/scoring.js"), exports);
__exportStar(require("./utils/validators.js"), exports);
__exportStar(require("./utils/correlation.js"), exports);
// Constants
exports.DEFAULT_CONFIG = {
    enabled: true,
    logLevel: 'info',
    eventRetentionDays: 90,
    alertRetentionDays: 365,
    batchSize: 1000,
    processingInterval: 5000,
    mlModelsEnabled: true,
    threatIntelEnabled: true,
    threatIntelFeeds: [],
    alertingEnabled: true,
    alertChannels: [],
    autoResponseEnabled: false,
    requireApprovalForActions: true
};
exports.THREAT_SCORE_THRESHOLDS = {
    CRITICAL: 0.9,
    HIGH: 0.7,
    MEDIUM: 0.5,
    LOW: 0.3,
    INFO: 0.0
};
exports.MITRE_ATTACK_TACTICS = [
    'reconnaissance',
    'resource-development',
    'initial-access',
    'execution',
    'persistence',
    'privilege-escalation',
    'defense-evasion',
    'credential-access',
    'discovery',
    'lateral-movement',
    'collection',
    'command-and-control',
    'exfiltration',
    'impact'
];
