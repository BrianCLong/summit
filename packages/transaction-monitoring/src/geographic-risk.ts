/**
 * Geographic Risk Assessment
 */

import { Transaction, GeographicRisk, Alert, AlertType, RiskLevel, AlertStatus } from './types.js';

export class GeographicRiskAssessor {
  private riskProfiles: Map<string, GeographicRisk> = new Map();
  private highRiskCountries: Set<string> = new Set();
  private sanctionedCountries: Set<string> = new Set();

  constructor() {
    this.initializeDefaultRisks();
  }

  /**
   * Initialize default high-risk countries and sanctions lists
   */
  private initializeDefaultRisks(): void {
    // High-risk countries (FATF list and other considerations)
    const highRisk = [
      'IR', // Iran
      'KP', // North Korea
      'SY', // Syria
      'AF', // Afghanistan
      'YE', // Yemen
      'MM', // Myanmar
      'SD', // Sudan
    ];

    highRisk.forEach(country => {
      this.highRiskCountries.add(country);
      this.sanctionedCountries.add(country);
    });

    // Additional high-risk (non-sanctioned) countries
    ['PK', 'BD', 'TT', 'JM'].forEach(country => {
      this.highRiskCountries.add(country);
    });
  }

  /**
   * Assess geographic risk for a transaction
   */
  async assessTransaction(transaction: Transaction): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check sender country
    const senderRisk = this.assessCountry(transaction.sender.country);
    if (senderRisk.riskScore > 70) {
      alerts.push(this.createGeographicAlert(
        transaction,
        `High-risk sender country: ${transaction.sender.country}`,
        senderRisk
      ));
    }

    // Check receiver country
    const receiverRisk = this.assessCountry(transaction.receiver.country);
    if (receiverRisk.riskScore > 70) {
      alerts.push(this.createGeographicAlert(
        transaction,
        `High-risk receiver country: ${transaction.receiver.country}`,
        receiverRisk
      ));
    }

    // Check for cross-border high-risk patterns
    if (senderRisk.highRisk && receiverRisk.highRisk) {
      alerts.push(this.createGeographicAlert(
        transaction,
        `Both sender and receiver in high-risk countries`,
        senderRisk,
        RiskLevel.CRITICAL
      ));
    }

    // Check for sanctions violations
    if (senderRisk.sanctions || receiverRisk.sanctions) {
      alerts.push(this.createGeographicAlert(
        transaction,
        `Transaction involves sanctioned country`,
        senderRisk.sanctions ? senderRisk : receiverRisk,
        RiskLevel.CRITICAL
      ));
    }

    return alerts;
  }

  /**
   * Assess risk for a specific country
   */
  assessCountry(countryCode: string): GeographicRisk {
    // Check cache first
    if (this.riskProfiles.has(countryCode)) {
      return this.riskProfiles.get(countryCode)!;
    }

    const factors: string[] = [];
    let riskScore = 0;

    // Check sanctions
    const sanctioned = this.sanctionedCountries.has(countryCode);
    if (sanctioned) {
      factors.push('Sanctioned country');
      riskScore += 100;
    }

    // Check high-risk designation
    const highRisk = this.highRiskCountries.has(countryCode);
    if (highRisk && !sanctioned) {
      factors.push('High-risk jurisdiction');
      riskScore += 75;
    }

    // Additional risk factors (simplified - in production would use more data)
    if (this.isWeakAMLFramework(countryCode)) {
      factors.push('Weak AML framework');
      riskScore += 25;
    }

    if (this.isCorruptionConcern(countryCode)) {
      factors.push('High corruption index');
      riskScore += 15;
    }

    if (this.isTaxHaven(countryCode)) {
      factors.push('Tax haven jurisdiction');
      riskScore += 20;
    }

    const risk: GeographicRisk = {
      country: countryCode,
      riskScore: Math.min(riskScore, 100),
      factors,
      sanctions: sanctioned,
      highRisk,
    };

    this.riskProfiles.set(countryCode, risk);
    return risk;
  }

  /**
   * Check if country has weak AML framework
   */
  private isWeakAMLFramework(countryCode: string): boolean {
    // Simplified - in production would use FATF grey/black lists
    const weakAML = new Set(['PK', 'ZW', 'TT', 'BD', 'GH', 'MU', 'SN', 'UG']);
    return weakAML.has(countryCode);
  }

  /**
   * Check if country has corruption concerns
   */
  private isCorruptionConcern(countryCode: string): boolean {
    // Simplified - in production would use Transparency International CPI
    const corruption = new Set(['VE', 'SD', 'SO', 'SS', 'LY', 'IQ', 'TD']);
    return corruption.has(countryCode);
  }

  /**
   * Check if country is considered a tax haven
   */
  private isTaxHaven(countryCode: string): boolean {
    const taxHavens = new Set(['KY', 'BM', 'BS', 'VG', 'PA', 'LI', 'MC', 'AD']);
    return taxHavens.has(countryCode);
  }

  /**
   * Create geographic risk alert
   */
  private createGeographicAlert(
    transaction: Transaction,
    reason: string,
    risk: GeographicRisk,
    severity?: RiskLevel
  ): Alert {
    const alertSeverity = severity || (risk.riskScore > 90 ? RiskLevel.CRITICAL :
                                       risk.riskScore > 70 ? RiskLevel.HIGH :
                                       risk.riskScore > 50 ? RiskLevel.MEDIUM : RiskLevel.LOW);

    return {
      id: `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction,
      type: AlertType.GEOGRAPHIC_RISK,
      severity: alertSeverity,
      reason: `${reason} - Risk factors: ${risk.factors.join(', ')}`,
      timestamp: new Date(),
      rules: ['geographic_risk'],
      score: risk.riskScore,
      status: AlertStatus.NEW,
      notes: [`Country: ${risk.country}`, `Risk Score: ${risk.riskScore}`],
    };
  }

  /**
   * Add a high-risk country
   */
  addHighRiskCountry(countryCode: string): void {
    this.highRiskCountries.add(countryCode);
    this.riskProfiles.delete(countryCode); // Invalidate cache
  }

  /**
   * Add a sanctioned country
   */
  addSanctionedCountry(countryCode: string): void {
    this.sanctionedCountries.add(countryCode);
    this.highRiskCountries.add(countryCode);
    this.riskProfiles.delete(countryCode); // Invalidate cache
  }

  /**
   * Remove country from high-risk list
   */
  removeHighRiskCountry(countryCode: string): void {
    this.highRiskCountries.delete(countryCode);
    this.riskProfiles.delete(countryCode); // Invalidate cache
  }

  /**
   * Get all high-risk countries
   */
  getHighRiskCountries(): string[] {
    return Array.from(this.highRiskCountries);
  }

  /**
   * Get all sanctioned countries
   */
  getSanctionedCountries(): string[] {
    return Array.from(this.sanctionedCountries);
  }
}
