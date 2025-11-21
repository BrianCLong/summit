/**
 * Cross-Border AI/Virtual Assistant Interoperability Module
 *
 * Implements Bürokratt-style cross-border government virtual assistant
 * network integration for seamless collaboration between partner nations.
 *
 * Features:
 * - Partner nation registry with trust levels
 * - Adaptive handover protocols with context preservation
 * - Multilingual translation bridge
 * - Secure cross-border data sharing
 * - Comprehensive audit logging
 *
 * @module cross-border
 */

// Types
export * from './types.js';

// Services
export {
  PartnerRegistry,
  getPartnerRegistry,
} from './partner-registry.js';

export {
  HandoverProtocol,
  getHandoverProtocol,
  type HandoverConfig,
} from './handover-protocol.js';

export {
  MultilingualBridge,
  getMultilingualBridge,
  type TranslationRequest,
  type TranslationResult,
  type LanguageDetection,
} from './multilingual-bridge.js';

export {
  CrossBorderGateway,
  getCrossBorderGateway,
  type GatewayConfig,
} from './gateway.js';
