/**
 * Financial Crime Service
 * Comprehensive financial crime detection and compliance service
 */

import { TransactionScreener, AnomalyDetector, Transaction, Alert } from '@intelgraph/transaction-monitoring';
import { LayeringDetector, StructuringDetector, SmurfingDetector, AMLAlert } from '@intelgraph/aml-detection';
import { SanctionsScreener, PEPScreener } from '@intelgraph/sanctions-screening';
import { KYCVerifier } from '@intelgraph/kyc-verification';
import { FraudDetector } from '@intelgraph/fraud-detection';
import { BlockchainAnalyzer } from '@intelgraph/crypto-monitoring';
import { NetworkAnalyzer } from '@intelgraph/financial-network-analysis';
import { SARGenerator, CTRGenerator } from '@intelgraph/regulatory-reporting';
import { CaseManager } from '@intelgraph/case-management';

export interface FinancialCrimeAnalysis {
  transaction: Transaction;
  alerts: Alert[];
  amlAlerts: AMLAlert[];
  sanctionsMatches: any[];
  fraudAlerts: any[];
  riskScore: number;
  recommendation: string;
}

export class FinancialCrimeService {
  private transactionScreener: TransactionScreener;
  private anomalyDetector: AnomalyDetector;
  private layeringDetector: LayeringDetector;
  private structuringDetector: StructuringDetector;
  private smurfingDetector: SmurfingDetector;
  private sanctionsScreener: SanctionsScreener;
  private pepScreener: PEPScreener;
  private kycVerifier: KYCVerifier;
  private fraudDetector: FraudDetector;
  private blockchainAnalyzer: BlockchainAnalyzer;
  private networkAnalyzer: NetworkAnalyzer;
  private sarGenerator: SARGenerator;
  private ctrGenerator: CTRGenerator;
  private caseManager: CaseManager;

  constructor() {
    this.transactionScreener = new TransactionScreener();
    this.anomalyDetector = new AnomalyDetector();
    this.layeringDetector = new LayeringDetector();
    this.structuringDetector = new StructuringDetector();
    this.smurfingDetector = new SmurfingDetector();
    this.sanctionsScreener = new SanctionsScreener();
    this.pepScreener = new PEPScreener();
    this.kycVerifier = new KYCVerifier();
    this.fraudDetector = new FraudDetector();
    this.blockchainAnalyzer = new BlockchainAnalyzer();
    this.networkAnalyzer = new NetworkAnalyzer();
    this.sarGenerator = new SARGenerator();
    this.ctrGenerator = new CTRGenerator();
    this.caseManager = new CaseManager();
  }

  /**
   * Comprehensive analysis of a single transaction
   */
  async analyzeTransaction(transaction: Transaction, historicalData: Transaction[]): Promise<FinancialCrimeAnalysis> {
    // Transaction screening
    const screeningAlerts = await this.transactionScreener.screenTransaction(transaction);

    // Anomaly detection
    const anomalyScore = await this.anomalyDetector.detectAnomalies(transaction, historicalData);
    const anomalyAlerts = anomalyScore.score > 0.7 ? [this.createAnomalyAlert(transaction, anomalyScore)] : [];

    // AML detection
    const amlAlerts: AMLAlert[] = [];
    const layeringAlerts = await this.layeringDetector.detectLayering([...historicalData, transaction]);
    const structuringAlerts = await this.structuringDetector.detectStructuring([...historicalData, transaction]);
    amlAlerts.push(...layeringAlerts, ...structuringAlerts);

    // Sanctions screening
    const sanctionsMatches = await this.sanctionsScreener.screenEntity({
      id: transaction.sender.id,
      name: transaction.sender.name,
      type: transaction.sender.type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'ORGANIZATION',
    });

    // Fraud detection
    const fraudAlerts = await this.fraudDetector.detectFraud(transaction);

    // Calculate overall risk score
    const allAlerts = [...screeningAlerts, ...anomalyAlerts, ...fraudAlerts];
    const riskScore = this.calculateOverallRisk(allAlerts, amlAlerts, sanctionsMatches);

    // Generate recommendation
    const recommendation = this.generateRecommendation(riskScore, sanctionsMatches.length > 0);

    return {
      transaction,
      alerts: allAlerts,
      amlAlerts,
      sanctionsMatches,
      fraudAlerts,
      riskScore,
      recommendation,
    };
  }

  /**
   * Batch analysis of multiple transactions
   */
  async analyzeBatch(transactions: Transaction[]): Promise<FinancialCrimeAnalysis[]> {
    const results: FinancialCrimeAnalysis[] = [];

    for (const transaction of transactions) {
      const analysis = await this.analyzeTransaction(transaction, transactions);
      results.push(analysis);
    }

    return results;
  }

  /**
   * Network analysis for entity relationships
   */
  async analyzeNetwork(transactions: Transaction[]) {
    return await this.networkAnalyzer.buildNetwork(transactions);
  }

  /**
   * Generate regulatory reports
   */
  async generateSAR(alerts: Alert[], transactions: Transaction[]) {
    return await this.sarGenerator.generateSAR(alerts, transactions);
  }

  /**
   * Generate CTR for large cash transactions
   */
  async generateCTR(transaction: Transaction) {
    if (transaction.amount >= 10000 && transaction.type === 'CASH') {
      return await this.ctrGenerator.generateCTR(transaction);
    }
    return null;
  }

  /**
   * Create a case from alerts
   */
  async createCase(alerts: Alert[], title: string, description: string, createdBy: string) {
    return await this.caseManager.createCase(alerts, title, description, createdBy);
  }

  /**
   * Get high-priority cases requiring attention
   */
  async getHighPriorityCases() {
    return await this.caseManager.getHighPriorityCases();
  }

  private createAnomalyAlert(transaction: Transaction, anomalyScore: any): Alert {
    return {
      id: `anomaly_${Date.now()}`,
      transaction,
      type: 'BEHAVIORAL_ANOMALY' as any,
      severity: anomalyScore.score > 0.9 ? 'CRITICAL' : anomalyScore.score > 0.8 ? 'HIGH' : 'MEDIUM' as any,
      reason: `Anomaly detected: ${anomalyScore.factors.map((f: any) => f.name).join(', ')}`,
      timestamp: new Date(),
      rules: ['anomaly_detection'],
      score: anomalyScore.score * 100,
      status: 'NEW' as any,
    };
  }

  private calculateOverallRisk(alerts: Alert[], amlAlerts: AMLAlert[], sanctionsMatches: any[]): number {
    let risk = 0;

    // Alert-based risk
    risk += alerts.reduce((sum, a) => sum + a.score, 0) / Math.max(alerts.length, 1);

    // AML-based risk
    risk += amlAlerts.reduce((sum, a) => sum + a.riskScore, 0) / Math.max(amlAlerts.length, 1);

    // Sanctions penalty
    if (sanctionsMatches.length > 0) risk += 50;

    return Math.min(risk / 2, 100);
  }

  private generateRecommendation(riskScore: number, hasSanctions: boolean): string {
    if (hasSanctions) return 'BLOCK_TRANSACTION - Sanctions match detected';
    if (riskScore > 90) return 'BLOCK_TRANSACTION - Critical risk detected';
    if (riskScore > 75) return 'ESCALATE_TO_COMPLIANCE - High risk requiring review';
    if (riskScore > 60) return 'ENHANCED_MONITORING - Medium risk requires monitoring';
    if (riskScore > 40) return 'STANDARD_MONITORING - Low-medium risk';
    return 'APPROVE - Low risk transaction';
  }
}

export default FinancialCrimeService;
