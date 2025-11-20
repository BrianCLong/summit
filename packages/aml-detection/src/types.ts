/**
 * AML Detection Types
 */

import { Transaction } from '@intelgraph/transaction-monitoring';

export interface AMLAlert {
  id: string;
  type: AMLTypology;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  transactions: Transaction[];
  description: string;
  indicators: string[];
  riskScore: number;
  timestamp: Date;
  entities: string[];
}

export enum AMLTypology {
  STRUCTURING = 'STRUCTURING',
  LAYERING = 'LAYERING',
  SMURFING = 'SMURFING',
  TRADE_BASED_ML = 'TRADE_BASED_ML',
  SHELL_COMPANY = 'SHELL_COMPANY',
  ROUND_TRIPPING = 'ROUND_TRIPPING',
  INTEGRATION = 'INTEGRATION',
  PLACEMENT = 'PLACEMENT',
  CASH_INTENSIVE = 'CASH_INTENSIVE',
  BENEFICIAL_OWNERSHIP_OBSCURATION = 'BENEFICIAL_OWNERSHIP_OBSCURATION',
}

export interface AMLRiskFactors {
  customerRisk: number;
  geographicRisk: number;
  productRisk: number;
  channelRisk: number;
  volumeRisk: number;
  complexityRisk: number;
}

export interface Entity {
  id: string;
  name: string;
  type: 'INDIVIDUAL' | 'BUSINESS' | 'TRUST' | 'FOUNDATION';
  jurisdiction: string;
  riskScore: number;
  relationships: EntityRelationship[];
}

export interface EntityRelationship {
  relatedEntityId: string;
  type: 'OWNER' | 'DIRECTOR' | 'BENEFICIARY' | 'AUTHORIZED_SIGNER';
  percentage?: number;
}

export interface TradeTransaction {
  transaction: Transaction;
  invoice?: Invoice;
  shipment?: Shipment;
  goodsDescription: string;
  unitPrice: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  date: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Shipment {
  id: string;
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  declaredValue: number;
}
