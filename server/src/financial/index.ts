/**
 * Financial Compliance Module
 *
 * Comprehensive financial compliance, surveillance, risk analytics,
 * fraud detection, market data, and regulatory reporting capabilities.
 */

// Types
export * from './types.js';

// Services
export { TradeSurveillanceService } from './surveillance/TradeSurveillanceService.js';
export { RiskAnalyticsService } from './risk/RiskAnalyticsService.js';
export { FraudDetectionService } from './fraud/FraudDetectionService.js';
export { MarketDataService } from './market/MarketDataService.js';
export { RegulatoryReportingService } from './reporting/RegulatoryReportingService.js';

// Factory function to create all services
import { Pool } from 'pg';
import { TradeSurveillanceService } from './surveillance/TradeSurveillanceService.js';
import { RiskAnalyticsService } from './risk/RiskAnalyticsService.js';
import { FraudDetectionService } from './fraud/FraudDetectionService.js';
import { MarketDataService } from './market/MarketDataService.js';
import { RegulatoryReportingService } from './reporting/RegulatoryReportingService.js';

export interface FinancialServicesConfig {
  surveillance?: {
    washTradingTimeWindowMs?: number;
    washTradingMinTrades?: number;
    layeringCancelRatioThreshold?: number;
    spoofingMinOrderSize?: number;
  };
  risk?: {
    varConfidenceLevels?: number[];
    varHorizonDays?: number;
    historicalDays?: number;
  };
  fraud?: {
    structuringThreshold?: number;
    velocityThresholdPerDay?: number;
    geographicRiskCountries?: string[];
  };
  market?: {
    defaultCurrency?: string;
    vwapCalculationWindow?: number;
  };
  reporting?: {
    firmId?: string;
    reportingEntityId?: string;
  };
}

export interface FinancialServices {
  surveillance: TradeSurveillanceService;
  risk: RiskAnalyticsService;
  fraud: FraudDetectionService;
  market: MarketDataService;
  reporting: RegulatoryReportingService;
}

/**
 * Create all financial services with shared database connection
 */
export function createFinancialServices(
  pg: Pool,
  config?: FinancialServicesConfig,
): FinancialServices {
  return {
    surveillance: new TradeSurveillanceService(pg, config?.surveillance),
    risk: new RiskAnalyticsService(pg, config?.risk),
    fraud: new FraudDetectionService(pg, config?.fraud),
    market: new MarketDataService(pg, config?.market),
    reporting: new RegulatoryReportingService(pg, config?.reporting),
  };
}
