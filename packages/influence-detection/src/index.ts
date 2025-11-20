/**
 * @intelgraph/influence-detection
 * Bot detection, coordinated inauthentic behavior, and astroturfing detection
 */

export { BotDetector } from './bot-detection/BotDetector.js';
export type {
  BotDetectionResult,
  BotIndicator,
  AccountActivity,
  Post,
} from './bot-detection/BotDetector.js';

export { CIBDetector } from './cib/CIBDetector.js';
export type {
  CIBDetectionResult,
  CIBIndicator,
  AccountBehavior,
  Activity,
} from './cib/CIBDetector.js';

export { AstroturfingDetector } from './astroturfing/AstroturfingDetector.js';
export type {
  AstroturfingResult,
  AstroturfingIndicator,
  CampaignActivity,
  CampaignPost,
  EngagementMetrics,
  AccountMetrics,
} from './astroturfing/AstroturfingDetector.js';

export { AmplificationDetector } from './amplification/AmplificationDetector.js';
export type {
  AmplificationNetwork,
  NetworkNode,
  NodeActivity,
  AmplificationChain,
  ChainLink,
} from './amplification/AmplificationDetector.js';
