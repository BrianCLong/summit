/**
 * Financial Compliance Module - Shared Types
 *
 * Core type definitions for compliance, surveillance, risk analytics,
 * fraud detection, market data, and regulatory reporting.
 */

import { z } from 'zod';

// ============================================================================
// COMMON ENUMS
// ============================================================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'escalated' | 'resolved' | 'false_positive';
export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'severe';

// ============================================================================
// TRADE & ORDER TYPES
// ============================================================================

export interface Trade {
  tradeId: string;
  orderId?: string;
  tenantId: string;
  accountId: string;
  traderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  executionTime: Date;
  venue: string;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
  commission?: number;
  fees?: number;
  currency: string;
  assetClass: 'equity' | 'fixed_income' | 'derivative' | 'fx' | 'commodity' | 'crypto';
  metadata?: Record<string, unknown>;
}

export interface Order {
  orderId: string;
  tenantId: string;
  accountId: string;
  traderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'new' | 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  parentOrderId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SURVEILLANCE TYPES
// ============================================================================

export interface SurveillanceAlert {
  alertId: string;
  tenantId: string;
  alertType: SurveillanceAlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  detectedAt: Date;
  trades?: string[];
  orders?: string[];
  accounts?: string[];
  traders?: string[];
  symbols?: string[];
  ruleId?: string;
  ruleVersion?: string;
  confidence: number;
  evidence: SurveillanceEvidence;
  assignedTo?: string;
  escalatedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  metadata?: Record<string, unknown>;
}

export type SurveillanceAlertType =
  | 'wash_trading'
  | 'layering'
  | 'spoofing'
  | 'front_running'
  | 'insider_trading'
  | 'market_manipulation'
  | 'restricted_list_violation'
  | 'position_limit_breach'
  | 'unusual_volume'
  | 'price_manipulation'
  | 'best_execution_failure'
  | 'unauthorized_trading'
  | 'communication_flag';

export interface SurveillanceEvidence {
  summary: string;
  trades?: Trade[];
  orders?: Order[];
  patterns?: PatternMatch[];
  communications?: CommunicationFlag[];
  marketData?: MarketDataPoint[];
  screenshots?: string[];
}

export interface PatternMatch {
  patternType: string;
  confidence: number;
  startTime: Date;
  endTime: Date;
  description: string;
  dataPoints: Record<string, unknown>[];
}

export interface CommunicationFlag {
  communicationId: string;
  timestamp: Date;
  channel: 'email' | 'chat' | 'voice' | 'sms';
  participants: string[];
  flaggedKeywords: string[];
  riskScore: number;
  excerpt?: string;
}

// ============================================================================
// RISK ANALYTICS TYPES
// ============================================================================

export interface PortfolioRisk {
  portfolioId: string;
  tenantId: string;
  calculatedAt: Date;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  trackingError?: number;
  informationRatio?: number;
  currency: string;
  positions: PositionRisk[];
  concentrationRisk: ConcentrationRisk;
  stressTestResults: StressTestResult[];
}

export interface PositionRisk {
  positionId: string;
  symbol: string;
  quantity: number;
  marketValue: number;
  weight: number;
  var95: number;
  var99: number;
  beta: number;
  delta?: number;
  gamma?: number;
  vega?: number;
  theta?: number;
  rho?: number;
}

export interface ConcentrationRisk {
  topHoldings: { symbol: string; weight: number }[];
  sectorConcentration: { sector: string; weight: number }[];
  geographicConcentration: { region: string; weight: number }[];
  assetClassConcentration: { assetClass: string; weight: number }[];
  herfindahlIndex: number;
  largestPositionWeight: number;
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  scenarioType: 'historical' | 'hypothetical' | 'reverse';
  description: string;
  portfolioImpact: number;
  portfolioImpactPercent: number;
  positionImpacts: { symbol: string; impact: number; impactPercent: number }[];
  assumptions: Record<string, number>;
}

export interface CounterpartyRisk {
  counterpartyId: string;
  tenantId: string;
  name: string;
  legalEntityId?: string;
  creditRating?: string;
  creditRatingAgency?: string;
  probabilityOfDefault: number;
  exposureAtDefault: number;
  lossGivenDefault: number;
  expectedLoss: number;
  creditLimit: number;
  currentExposure: number;
  utilizationPercent: number;
  riskScore: number;
  riskLevel: RiskLevel;
  lastReviewDate: Date;
  nextReviewDate: Date;
  alerts: string[];
}

export interface LiquidityRisk {
  portfolioId: string;
  tenantId: string;
  calculatedAt: Date;
  liquidityScore: number;
  daysToLiquidate: number;
  liquidationCost: number;
  liquidationCostPercent: number;
  positionLiquidity: PositionLiquidity[];
  cashPosition: number;
  marginUtilization: number;
}

export interface PositionLiquidity {
  symbol: string;
  quantity: number;
  averageDailyVolume: number;
  daysToLiquidate: number;
  marketImpact: number;
  liquidityScore: number;
}

// ============================================================================
// FRAUD DETECTION TYPES
// ============================================================================

export interface FraudAlert {
  alertId: string;
  tenantId: string;
  alertType: FraudAlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  riskScore: number;
  title: string;
  description: string;
  detectedAt: Date;
  entityType: 'account' | 'transaction' | 'customer' | 'employee';
  entityId: string;
  relatedEntities: string[];
  indicators: FraudIndicator[];
  modelId?: string;
  modelVersion?: string;
  assignedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: 'confirmed_fraud' | 'false_positive' | 'suspicious_activity' | 'no_action';
  sarFiled?: boolean;
  sarFilingDate?: Date;
  metadata?: Record<string, unknown>;
}

export type FraudAlertType =
  | 'suspicious_transaction'
  | 'structuring'
  | 'velocity_anomaly'
  | 'geographic_anomaly'
  | 'behavior_change'
  | 'identity_fraud'
  | 'account_takeover'
  | 'money_laundering'
  | 'sanctions_hit'
  | 'pep_match'
  | 'adverse_media'
  | 'unusual_pattern';

export interface FraudIndicator {
  indicatorType: string;
  indicatorValue: string | number;
  weight: number;
  description: string;
  threshold?: number;
}

export interface AMLCase {
  caseId: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  caseType: 'investigation' | 'sar_filing' | 'enhanced_due_diligence';
  status: 'open' | 'in_review' | 'escalated' | 'closed' | 'sar_filed';
  riskLevel: RiskLevel;
  assignedTo: string;
  createdAt: Date;
  dueDate: Date;
  alerts: string[];
  transactions: string[];
  findings: string;
  recommendation?: string;
  supervisorReview?: string;
  sarReferenceNumber?: string;
}

export interface KYCProfile {
  customerId: string;
  tenantId: string;
  customerType: 'individual' | 'corporate' | 'institutional';
  fullName: string;
  dateOfBirth?: Date;
  nationality?: string;
  countryOfResidence: string;
  riskRating: RiskLevel;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired' | 'under_review';
  verificationLevel: 'basic' | 'standard' | 'enhanced';
  pepStatus: boolean;
  pepDetails?: string;
  sanctionsStatus: 'clear' | 'match' | 'potential_match';
  sanctionsDetails?: string;
  adverseMedia: boolean;
  adverseMediaDetails?: string;
  sourceOfFunds?: string;
  sourceOfWealth?: string;
  expectedActivityProfile?: string;
  lastReviewDate: Date;
  nextReviewDate: Date;
  documents: KYCDocument[];
}

export interface KYCDocument {
  documentId: string;
  documentType: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'corporate_docs';
  documentNumber?: string;
  issuingCountry?: string;
  issueDate?: Date;
  expiryDate?: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedAt?: Date;
  verifiedBy?: string;
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

export interface MarketDataPoint {
  symbol: string;
  timestamp: Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  lastPrice?: number;
  lastSize?: number;
  vwap?: number;
  turnover?: number;
}

export interface SecurityMaster {
  symbol: string;
  isin?: string;
  cusip?: string;
  sedol?: string;
  figi?: string;
  name: string;
  assetClass: string;
  sector?: string;
  industry?: string;
  exchange: string;
  currency: string;
  country: string;
  lotSize: number;
  tickSize: number;
  status: 'active' | 'suspended' | 'delisted';
  corporateActions?: CorporateAction[];
}

export interface CorporateAction {
  actionId: string;
  actionType: 'dividend' | 'split' | 'merger' | 'spinoff' | 'rights_issue' | 'name_change';
  symbol: string;
  exDate: Date;
  recordDate?: Date;
  paymentDate?: Date;
  ratio?: number;
  amount?: number;
  currency?: string;
  description: string;
}

export interface ExecutionQuality {
  tradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  executedPrice: number;
  arrivalPrice: number;
  vwap: number;
  twap: number;
  closingPrice: number;
  implementationShortfall: number;
  vwapSlippage: number;
  twapSlippage: number;
  marketImpact: number;
  timingCost: number;
  executionVenue: string;
  executionTime: Date;
  orderDuration: number;
  participationRate: number;
}

// ============================================================================
// REGULATORY REPORTING TYPES
// ============================================================================

export interface RegulatoryReport {
  reportId: string;
  tenantId: string;
  reportType: RegulatoryReportType;
  reportingPeriod: {
    start: Date;
    end: Date;
  };
  status: 'draft' | 'pending_review' | 'approved' | 'submitted' | 'accepted' | 'rejected';
  submissionDeadline: Date;
  submittedAt?: Date;
  submittedBy?: string;
  regulatorReference?: string;
  validationErrors?: ValidationError[];
  generatedAt: Date;
  generatedBy: string;
  approvedAt?: Date;
  approvedBy?: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}

export type RegulatoryReportType =
  | 'cat' // Consolidated Audit Trail
  | 'form_pf' // Form PF (SEC)
  | 'form_adv' // Form ADV (SEC)
  | 'trace' // TRACE (FINRA)
  | 'mifid_rts25' // MiFID II RTS 25
  | 'mifid_rts27' // MiFID II RTS 27
  | 'mifid_rts28' // MiFID II RTS 28
  | 'emir' // EMIR Trade Reporting
  | 'sftr' // Securities Financing Transactions Regulation
  | 'cftc_lc' // CFTC Large Trader
  | 'sar' // Suspicious Activity Report
  | 'ctr'; // Currency Transaction Report

export interface ValidationError {
  field: string;
  errorCode: string;
  errorMessage: string;
  severity: 'warning' | 'error';
  recordReference?: string;
}

export interface CATReport {
  reportId: string;
  tenantId: string;
  reportDate: Date;
  firmId: string;
  events: CATEvent[];
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  submissionTimestamp?: Date;
  errorCount: number;
  warningCount: number;
}

export interface CATEvent {
  eventId: string;
  eventType: 'MENO' | 'MEOA' | 'MEOT' | 'MEOJ' | 'MEMR' | 'MEIR';
  timestamp: Date;
  symbol: string;
  orderType?: string;
  side?: string;
  quantity?: number;
  price?: number;
  fdidDate?: string;
  accountHolderType?: string;
  routedOrderId?: string;
  senderImid?: string;
  destination?: string;
  metadata?: Record<string, unknown>;
}

export interface TRACEReport {
  reportId: string;
  tenantId: string;
  reportDate: Date;
  trades: TRACETrade[];
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
}

export interface TRACETrade {
  tradeId: string;
  cusip: string;
  executionTime: Date;
  quantity: number;
  price: number;
  yield?: number;
  side: 'buy' | 'sell';
  capacity: 'principal' | 'agent' | 'mixed';
  contraPartyType: 'customer' | 'broker_dealer' | 'ats';
  reportingParty: 'buyer' | 'seller';
  specialConditions?: string[];
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const TradeSchema = z.object({
  tradeId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  accountId: z.string(),
  traderId: z.string(),
  symbol: z.string().min(1).max(20),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  executionTime: z.date(),
  venue: z.string(),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  status: z.enum(['pending', 'filled', 'partial', 'cancelled', 'rejected']),
  commission: z.number().nonnegative().optional(),
  fees: z.number().nonnegative().optional(),
  currency: z.string().length(3),
  assetClass: z.enum(['equity', 'fixed_income', 'derivative', 'fx', 'commodity', 'crypto']),
  metadata: z.record(z.unknown()).optional(),
});

export const SurveillanceAlertSchema = z.object({
  alertId: z.string().uuid(),
  tenantId: z.string().uuid(),
  alertType: z.enum([
    'wash_trading', 'layering', 'spoofing', 'front_running', 'insider_trading',
    'market_manipulation', 'restricted_list_violation', 'position_limit_breach',
    'unusual_volume', 'price_manipulation', 'best_execution_failure',
    'unauthorized_trading', 'communication_flag'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'false_positive']),
  title: z.string().min(1).max(500),
  description: z.string(),
  detectedAt: z.date(),
  confidence: z.number().min(0).max(1),
});

export const FraudAlertSchema = z.object({
  alertId: z.string().uuid(),
  tenantId: z.string().uuid(),
  alertType: z.enum([
    'suspicious_transaction', 'structuring', 'velocity_anomaly', 'geographic_anomaly',
    'behavior_change', 'identity_fraud', 'account_takeover', 'money_laundering',
    'sanctions_hit', 'pep_match', 'adverse_media', 'unusual_pattern'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'acknowledged', 'investigating', 'escalated', 'resolved', 'false_positive']),
  riskScore: z.number().min(0).max(100),
  title: z.string().min(1).max(500),
  description: z.string(),
  detectedAt: z.date(),
  entityType: z.enum(['account', 'transaction', 'customer', 'employee']),
  entityId: z.string(),
});

export type TradeInput = z.infer<typeof TradeSchema>;
export type SurveillanceAlertInput = z.infer<typeof SurveillanceAlertSchema>;
export type FraudAlertInput = z.infer<typeof FraudAlertSchema>;
