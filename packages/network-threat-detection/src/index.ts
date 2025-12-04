/**
 * @intelgraph/network-threat-detection
 * Network threat detection module
 */

export { NetworkThreatDetector } from './network-detector';
export type { NetworkDetectorConfig } from './network-detector';

// Re-export core types
export {
  INetworkThreatDetector,
  NetworkEvent,
  ThreatEvent
} from '@intelgraph/threat-detection-core';
