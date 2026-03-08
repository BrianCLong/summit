"use strict";
/**
 * @intelgraph/network-threat-detection
 * Network threat detection module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatEvent = exports.NetworkEvent = exports.INetworkThreatDetector = exports.NetworkThreatDetector = void 0;
var network_detector_1 = require("./network-detector");
Object.defineProperty(exports, "NetworkThreatDetector", { enumerable: true, get: function () { return network_detector_1.NetworkThreatDetector; } });
// Re-export core types
var threat_detection_core_1 = require("@intelgraph/threat-detection-core");
Object.defineProperty(exports, "INetworkThreatDetector", { enumerable: true, get: function () { return threat_detection_core_1.INetworkThreatDetector; } });
Object.defineProperty(exports, "NetworkEvent", { enumerable: true, get: function () { return threat_detection_core_1.NetworkEvent; } });
Object.defineProperty(exports, "ThreatEvent", { enumerable: true, get: function () { return threat_detection_core_1.ThreatEvent; } });
