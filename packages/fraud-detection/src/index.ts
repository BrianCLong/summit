/**
 * Fraud Detection Package
 * Payment fraud, identity theft, and account takeover detection
 */

import { Transaction } from '@intelgraph/transaction-monitoring';

export enum FraudType {
  PAYMENT_FRAUD = 'PAYMENT_FRAUD',
  IDENTITY_THEFT = 'IDENTITY_THEFT',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  WIRE_FRAUD = 'WIRE_FRAUD',
  CARD_FRAUD = 'CARD_FRAUD',
  CHECK_FRAUD = 'CHECK_FRAUD',
  REFUND_FRAUD = 'REFUND_FRAUD',
  FIRST_PARTY_FRAUD = 'FIRST_PARTY_FRAUD',
}

export interface FraudAlert {
  id: string;
  type: FraudType;
  transaction: Transaction;
  indicators: FraudIndicator[];
  score: number;
  timestamp: Date;
}

export interface FraudIndicator {
  name: string;
  value: any;
  weight: number;
}

export class FraudDetector {
  async detectFraud(transaction: Transaction): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];

    // Payment fraud detection
    const paymentScore = this.detectPaymentFraud(transaction);
    if (paymentScore > 70) {
      alerts.push(this.createAlert(FraudType.PAYMENT_FRAUD, transaction, paymentScore));
    }

    // Identity theft detection
    const identityScore = this.detectIdentityTheft(transaction);
    if (identityScore > 70) {
      alerts.push(this.createAlert(FraudType.IDENTITY_THEFT, transaction, identityScore));
    }

    // Account takeover detection
    const takeoverScore = this.detectAccountTakeover(transaction);
    if (takeoverScore > 70) {
      alerts.push(this.createAlert(FraudType.ACCOUNT_TAKEOVER, transaction, takeoverScore));
    }

    return alerts;
  }

  private detectPaymentFraud(transaction: Transaction): number {
    let score = 0;

    // High-value transaction
    if (transaction.amount > 50000) score += 30;

    // Unusual receiver
    if (!transaction.receiver.kycStatus || transaction.receiver.kycStatus === 'NOT_VERIFIED') {
      score += 40;
    }

    // High-risk country
    if (this.isHighRiskCountry(transaction.receiver.country)) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  private detectIdentityTheft(transaction: Transaction): number {
    let score = 0;

    // Multiple identity indicators would be checked here
    // Simplified for demonstration
    if (transaction.sender.kycStatus === 'NOT_VERIFIED') {
      score += 50;
    }

    return Math.min(score, 100);
  }

  private detectAccountTakeover(transaction: Transaction): number {
    let score = 0;

    // Check for sudden behavior changes
    // This would compare against historical patterns
    // Simplified for demonstration

    return Math.min(score, 100);
  }

  private isHighRiskCountry(country: string): boolean {
    return ['AF', 'IR', 'KP', 'SY', 'YE'].includes(country);
  }

  private createAlert(type: FraudType, transaction: Transaction, score: number): FraudAlert {
    return {
      id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      transaction,
      indicators: [],
      score,
      timestamp: new Date(),
    };
  }
}

export class CardFraudDetector {
  detectCardFraud(cardTransaction: any): number {
    let score = 0;

    // Multiple cards used in short time
    // Unusual merchant categories
    // Velocity of transactions

    return Math.min(score, 100);
  }
}

export class WireFraudDetector {
  detectWireFraud(wireTransfer: Transaction): number {
    let score = 0;

    // Business email compromise indicators
    // Unusual beneficiary
    // Urgent/unusual request patterns

    return Math.min(score, 100);
  }
}
