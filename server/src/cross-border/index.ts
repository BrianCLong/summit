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
 * - Circuit breakers and rate limiting for resilience
 * - Environment-based configuration
 *
 * @module cross-border
 */

// Types
export * from './types.js';

// Configuration
export {
  loadCrossBorderConfig,
  getCrossBorderConfig,
  validateConfig,
  type CrossBorderConfig,
} from './config.js';

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

// Resilience
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  RateLimiter,
  ResilienceManager,
  getResilienceManager,
  retryWithBackoff,
} from './resilience.js';

// GraphQL
export { crossBorderTypeDefs, crossBorderResolvers } from './graphql/index.js';

// HTTP Router
export { crossBorderRouter } from './router.js';

// Metrics
export {
  CrossBorderMetrics,
  getCrossBorderMetrics,
  recordHandover,
  recordTranslation,
  recordPartnerHealth,
  updateActiveSessions,
  updateActivePartners,
} from './metrics.js';
