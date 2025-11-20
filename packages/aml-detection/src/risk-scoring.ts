/**
 * AML Risk Scoring Engine
 */

import { Transaction } from '@intelgraph/transaction-monitoring';
import { AMLRiskFactors } from './types.js';

export class AMLRiskScorer {
  calculateRiskScore(transaction: Transaction): number {
    const factors = this.assessRiskFactors(transaction);
    return (
      factors.customerRisk * 0.25 +
      factors.geographicRisk * 0.20 +
      factors.productRisk * 0.20 +
      factors.channelRisk * 0.15 +
      factors.volumeRisk * 0.10 +
      factors.complexityRisk * 0.10
    );
  }

  private assessRiskFactors(transaction: Transaction): AMLRiskFactors {
    return {
      customerRisk: this.assessCustomerRisk(transaction),
      geographicRisk: this.assessGeographicRisk(transaction),
      productRisk: this.assessProductRisk(transaction),
      channelRisk: this.assessChannelRisk(transaction),
      volumeRisk: this.assessVolumeRisk(transaction),
      complexityRisk: this.assessComplexityRisk(transaction),
    };
  }

  private assessCustomerRisk(transaction: Transaction): number {
    let risk = 30; // Base risk
    if (transaction.sender.riskLevel === 'HIGH') risk += 40;
    if (transaction.sender.kycStatus === 'NOT_VERIFIED') risk += 30;
    return Math.min(risk, 100);
  }

  private assessGeographicRisk(transaction: Transaction): number {
    const highRisk = ['AF', 'IR', 'KP', 'SY'];
    let risk = 20;
    if (highRisk.includes(transaction.sender.country)) risk += 50;
    if (highRisk.includes(transaction.receiver.country)) risk += 50;
    return Math.min(risk, 100);
  }

  private assessProductRisk(transaction: Transaction): number {
    const highRiskTypes = ['CRYPTO', 'CASH'];
    return highRiskTypes.includes(transaction.type) ? 70 : 30;
  }

  private assessChannelRisk(transaction: Transaction): number {
    // Simplified channel risk assessment
    return 40;
  }

  private assessVolumeRisk(transaction: Transaction): number {
    if (transaction.amount > 100000) return 80;
    if (transaction.amount > 50000) return 60;
    if (transaction.amount > 10000) return 40;
    return 20;
  }

  private assessComplexityRisk(transaction: Transaction): number {
    let risk = 20;
    if (transaction.sender.country !== transaction.receiver.country) risk += 30;
    if (transaction.currency !== 'USD') risk += 20;
    return Math.min(risk, 100);
  }
}
