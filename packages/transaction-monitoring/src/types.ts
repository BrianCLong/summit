/**
 * Transaction Monitoring Types and Interfaces
 */

export interface Transaction {
  id: string;
  timestamp: Date;
  amount: number;
  currency: string;
  sender: Party;
  receiver: Party;
  type: TransactionType;
  status: TransactionStatus;
  metadata?: Record<string, any>;
}

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  country: string;
  riskLevel?: RiskLevel;
  kycStatus?: KYCStatus;
}

export enum TransactionType {
  WIRE = 'WIRE',
  ACH = 'ACH',
  CARD = 'CARD',
  CRYPTO = 'CRYPTO',
  CASH = 'CASH',
  CHECK = 'CHECK',
  INTERNAL = 'INTERNAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum PartyType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
  GOVERNMENT = 'GOVERNMENT',
  NPO = 'NPO',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum KYCStatus {
  NOT_VERIFIED = 'NOT_VERIFIED',
  BASIC = 'BASIC',
  ENHANCED = 'ENHANCED',
  REJECTED = 'REJECTED',
}

export interface Alert {
  id: string;
  transaction: Transaction;
  type: AlertType;
  severity: RiskLevel;
  reason: string;
  timestamp: Date;
  rules: string[];
  score: number;
  status: AlertStatus;
  assignee?: string;
  notes?: string[];
}

export enum AlertType {
  THRESHOLD_BREACH = 'THRESHOLD_BREACH',
  VELOCITY_ANOMALY = 'VELOCITY_ANOMALY',
  PATTERN_MATCH = 'PATTERN_MATCH',
  GEOGRAPHIC_RISK = 'GEOGRAPHIC_RISK',
  BEHAVIORAL_ANOMALY = 'BEHAVIORAL_ANOMALY',
  SANCTIONS_MATCH = 'SANCTIONS_MATCH',
  PEP_MATCH = 'PEP_MATCH',
  FRAUD_INDICATOR = 'FRAUD_INDICATOR',
}

export enum AlertStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  INVESTIGATING = 'INVESTIGATING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  priority: number;
}

export enum RuleType {
  THRESHOLD = 'THRESHOLD',
  VELOCITY = 'VELOCITY',
  PATTERN = 'PATTERN',
  GEOGRAPHIC = 'GEOGRAPHIC',
  BEHAVIORAL = 'BEHAVIORAL',
}

export interface RuleCondition {
  field: string;
  operator: Operator;
  value: any;
}

export enum Operator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  CONTAINS = 'CONTAINS',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
}

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, any>;
}

export enum ActionType {
  FLAG = 'FLAG',
  BLOCK = 'BLOCK',
  ALERT = 'ALERT',
  ESCALATE = 'ESCALATE',
  REQUEST_REVIEW = 'REQUEST_REVIEW',
}

export interface VelocityCheck {
  timeWindow: number; // in seconds
  maxCount?: number;
  maxAmount?: number;
  groupBy: string[];
}

export interface GeographicRisk {
  country: string;
  riskScore: number;
  factors: string[];
  sanctions: boolean;
  highRisk: boolean;
}

export interface BehaviorProfile {
  partyId: string;
  averageTransactionAmount: number;
  transactionFrequency: number;
  preferredCountries: string[];
  preferredTypes: TransactionType[];
  timeOfDayPattern: number[];
  peerGroup: string;
  baseline: Record<string, any>;
}

export interface AnomalyScore {
  score: number;
  factors: AnomalyFactor[];
  confidence: number;
}

export interface AnomalyFactor {
  name: string;
  contribution: number;
  description: string;
}
