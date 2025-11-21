/**
 * AI Marketplace Service
 * Hyper-Personalized AI Experience Marketplace
 *
 * Features:
 * - Preference learning with collaborative filtering
 * - Content-based recommendations
 * - Multi-persona support (citizen, business, developer)
 * - On-demand localization (60+ locales)
 * - Modular experience architecture
 */

// Types
export * from './models/types.js';

// Services
export { PreferenceLearningService } from './services/preference-learning.js';
export {
  AIMarketplaceService,
  marketplaceService,
} from './services/marketplace-service.js';

// Engines
export { PersonalizationEngine } from './engines/personalization-engine.js';

// GraphQL
export { marketplaceTypeDefs } from './graphql/schema.js';
export { marketplaceResolvers } from './graphql/resolvers.js';
