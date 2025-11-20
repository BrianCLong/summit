/**
 * Terrorist Finance Types
 * Types for terrorist financing tracking and analysis
 */

export interface FinancialEntity {
  id: string;
  type: EntityType;
  name?: string;
  identifiers: Identifier[];
  location?: string;
  status: EntityStatus;
  sanctioned: boolean;
  riskScore: number;
}

export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATION = 'ORGANIZATION',
  BUSINESS = 'BUSINESS',
  CHARITY = 'CHARITY',
  FINANCIAL_INSTITUTION = 'FINANCIAL_INSTITUTION',
  SHELL_COMPANY = 'SHELL_COMPANY'
}

export enum EntityStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION'
}

export interface Identifier {
  type: string;
  value: string;
  country?: string;
  verified: boolean;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  date: Date;
  method: TransactionMethod;
  purpose?: string;
  suspicious: boolean;
  flagged: boolean;
  investigation?: string;
}

export enum TransactionMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  HAWALA = 'HAWALA',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  MONEY_SERVICE = 'MONEY_SERVICE',
  TRADE_BASED = 'TRADE_BASED',
  CASH_COURIER = 'CASH_COURIER',
  PREPAID_CARD = 'PREPAID_CARD',
  ONLINE_PAYMENT = 'ONLINE_PAYMENT'
}

export interface HawalaNetwork {
  id: string;
  operators: HawalaOperator[];
  locations: string[];
  estimatedVolume?: number;
  active: boolean;
  monitored: boolean;
}

export interface HawalaOperator {
  id: string;
  name?: string;
  location: string;
  connections: string[];
  volume?: number;
  flagged: boolean;
}

export interface CryptoActivity {
  id: string;
  entityId: string;
  walletAddresses: string[];
  transactions: CryptoTransaction[];
  totalVolume: number;
  mixingServices: boolean;
  privacyCoins: boolean;
}

export interface CryptoTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  date: Date;
  confirmed: boolean;
}

export interface FrontCompany {
  id: string;
  name: string;
  businessType: string;
  location: string;
  registration: CompanyRegistration;
  owners: string[];
  financials: FinancialRecord[];
  suspicious: boolean;
  linked: string[]; // Linked terrorist entities
}

export interface CompanyRegistration {
  jurisdiction: string;
  registrationNumber?: string;
  registrationDate?: Date;
  status: string;
}

export interface FinancialRecord {
  year: number;
  revenue?: number;
  expenses?: number;
  employees?: number;
  anomalies: string[];
}

export interface CharityOperation {
  id: string;
  name: string;
  registration: CharityRegistration;
  operations: string[];
  funding: FundingSource[];
  disbursements: Disbursement[];
  diversion: boolean;
  diversionAmount?: number;
}

export interface CharityRegistration {
  country: string;
  registrationNumber?: string;
  status: string;
  regulated: boolean;
}

export interface FundingSource {
  id: string;
  type: string;
  amount?: number;
  source?: string;
  date?: Date;
  legitimate: boolean;
}

export interface Disbursement {
  id: string;
  recipient: string;
  amount: number;
  purpose: string;
  date: Date;
  verified: boolean;
  suspicious: boolean;
}

export interface ExtortionOperation {
  id: string;
  organizationId: string;
  type: 'PROTECTION_RACKET' | 'TAXATION' | 'KIDNAPPING' | 'INTIMIDATION';
  location: string;
  targets: string[];
  estimatedRevenue?: number;
  frequency: string;
  active: boolean;
}

export interface KidnappingForRansom {
  id: string;
  organizationId: string;
  victim: string;
  location: string;
  date: Date;
  ransomDemand?: number;
  ransomPaid?: number;
  outcome: 'RELEASED' | 'ESCAPED' | 'DECEASED' | 'ONGOING';
}

export interface DrugTrafficking {
  id: string;
  organizationId: string;
  substance: string;
  route: string[];
  estimatedValue?: number;
  frequency: string;
  connections: string[];
}

export interface StateSponsor {
  country: string;
  recipients: string[];
  supportType: SupportType[];
  estimatedAmount?: number;
  active: boolean;
  evidence: Evidence[];
}

export enum SupportType {
  FINANCIAL = 'FINANCIAL',
  WEAPONS = 'WEAPONS',
  TRAINING = 'TRAINING',
  SAFE_HAVEN = 'SAFE_HAVEN',
  LOGISTICAL = 'LOGISTICAL',
  INTELLIGENCE = 'INTELLIGENCE'
}

export interface Evidence {
  type: string;
  description: string;
  date: Date;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
}

export interface AssetFreeze {
  entityId: string;
  authority: string;
  date: Date;
  assets: FrozenAsset[];
  amount?: number;
  status: 'ACTIVE' | 'LIFTED' | 'PARTIAL';
  legalBasis: string;
}

export interface FrozenAsset {
  type: 'BANK_ACCOUNT' | 'PROPERTY' | 'BUSINESS' | 'INVESTMENT' | 'OTHER';
  description: string;
  value?: number;
  location?: string;
}

export interface Sanction {
  entityId: string;
  authority: string;
  type: SanctionType[];
  imposed: Date;
  expires?: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'LIFTED';
  violations: SanctionViolation[];
}

export enum SanctionType {
  ASSET_FREEZE = 'ASSET_FREEZE',
  TRAVEL_BAN = 'TRAVEL_BAN',
  ARMS_EMBARGO = 'ARMS_EMBARGO',
  TRADE_RESTRICTION = 'TRADE_RESTRICTION',
  FINANCIAL_RESTRICTION = 'FINANCIAL_RESTRICTION'
}

export interface SanctionViolation {
  id: string;
  date: Date;
  type: string;
  description: string;
  parties: string[];
  investigated: boolean;
}

export interface FinancialNetwork {
  id: string;
  nodes: FinancialEntity[];
  transactions: Transaction[];
  totalFlow: number;
  purpose: string;
  detected: Date;
  disrupted: boolean;
}

export interface MoneyLaunderingScheme {
  id: string;
  type: string;
  entities: string[];
  stages: LaunderingStage[];
  estimatedAmount?: number;
  detected: boolean;
  disrupted: boolean;
}

export interface LaunderingStage {
  stage: 'PLACEMENT' | 'LAYERING' | 'INTEGRATION';
  method: string;
  entities: string[];
  amount?: number;
}

export interface FinanceQuery {
  entityTypes?: EntityType[];
  transactionMethods?: TransactionMethod[];
  minAmount?: number;
  sanctioned?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface FinanceResult {
  entities: FinancialEntity[];
  transactions: Transaction[];
  networks: FinancialNetwork[];
  totalFlow: number;
  trends: FinancialTrend[];
}

export interface FinancialTrend {
  type: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  magnitude: number;
  period: string;
  description: string;
}
