/**
 * Machine Learning Anomaly Detection
 */

import { Transaction, AnomalyScore, AnomalyFactor, BehaviorProfile } from './types.js';

export class AnomalyDetector {
  private profiles: Map<string, BehaviorProfile> = new Map();
  private threshold: number = 0.7;

  constructor(threshold: number = 0.7) {
    this.threshold = threshold;
  }

  /**
   * Detect anomalies in a transaction
   */
  async detectAnomalies(transaction: Transaction, historicalData: Transaction[]): Promise<AnomalyScore> {
    const factors: AnomalyFactor[] = [];
    let totalScore = 0;

    // Amount anomaly
    const amountFactor = this.detectAmountAnomaly(transaction, historicalData);
    if (amountFactor.contribution > 0) {
      factors.push(amountFactor);
      totalScore += amountFactor.contribution;
    }

    // Frequency anomaly
    const frequencyFactor = this.detectFrequencyAnomaly(transaction, historicalData);
    if (frequencyFactor.contribution > 0) {
      factors.push(frequencyFactor);
      totalScore += frequencyFactor.contribution;
    }

    // Geographic anomaly
    const geoFactor = this.detectGeographicAnomaly(transaction, historicalData);
    if (geoFactor.contribution > 0) {
      factors.push(geoFactor);
      totalScore += geoFactor.contribution;
    }

    // Time-of-day anomaly
    const timeFactor = this.detectTimeAnomaly(transaction, historicalData);
    if (timeFactor.contribution > 0) {
      factors.push(timeFactor);
      totalScore += timeFactor.contribution;
    }

    // Type anomaly
    const typeFactor = this.detectTypeAnomaly(transaction, historicalData);
    if (typeFactor.contribution > 0) {
      factors.push(typeFactor);
      totalScore += typeFactor.contribution;
    }

    const normalizedScore = Math.min(totalScore / 100, 1);
    const confidence = this.calculateConfidence(historicalData.length, factors.length);

    return {
      score: normalizedScore,
      factors,
      confidence,
    };
  }

  /**
   * Detect amount anomalies using statistical methods
   */
  private detectAmountAnomaly(transaction: Transaction, historical: Transaction[]): AnomalyFactor {
    if (historical.length === 0) {
      return { name: 'amount', contribution: 0, description: 'Insufficient historical data' };
    }

    const amounts = historical.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );

    const zScore = Math.abs((transaction.amount - mean) / (stdDev || 1));

    if (zScore > 3) {
      return {
        name: 'amount',
        contribution: Math.min(zScore * 10, 40),
        description: `Transaction amount (${transaction.amount}) is ${zScore.toFixed(2)} standard deviations from normal (${mean.toFixed(2)})`,
      };
    }

    return { name: 'amount', contribution: 0, description: 'Amount within normal range' };
  }

  /**
   * Detect frequency anomalies
   */
  private detectFrequencyAnomaly(transaction: Transaction, historical: Transaction[]): AnomalyFactor {
    if (historical.length < 2) {
      return { name: 'frequency', contribution: 0, description: 'Insufficient historical data' };
    }

    // Calculate recent transaction velocity (last 24 hours)
    const oneDayAgo = new Date(transaction.timestamp.getTime() - 24 * 60 * 60 * 1000);
    const recentTransactions = historical.filter(t => t.timestamp >= oneDayAgo);

    const historicalAvgDaily = historical.length / 30; // Assume 30 days of history
    const currentRate = recentTransactions.length;

    if (currentRate > historicalAvgDaily * 3) {
      return {
        name: 'frequency',
        contribution: 20,
        description: `Transaction frequency (${currentRate}) is 3x higher than normal (${historicalAvgDaily.toFixed(2)})`,
      };
    }

    return { name: 'frequency', contribution: 0, description: 'Frequency within normal range' };
  }

  /**
   * Detect geographic anomalies
   */
  private detectGeographicAnomaly(transaction: Transaction, historical: Transaction[]): AnomalyFactor {
    if (historical.length === 0) {
      return { name: 'geographic', contribution: 0, description: 'Insufficient historical data' };
    }

    const historicalCountries = new Set(
      historical.flatMap(t => [t.sender.country, t.receiver.country])
    );

    const newCountries = [transaction.sender.country, transaction.receiver.country].filter(
      country => !historicalCountries.has(country)
    );

    if (newCountries.length > 0) {
      return {
        name: 'geographic',
        contribution: 15,
        description: `Transaction involves new countries: ${newCountries.join(', ')}`,
      };
    }

    return { name: 'geographic', contribution: 0, description: 'Geographic pattern normal' };
  }

  /**
   * Detect time-of-day anomalies
   */
  private detectTimeAnomaly(transaction: Transaction, historical: Transaction[]): AnomalyFactor {
    if (historical.length === 0) {
      return { name: 'time', contribution: 0, description: 'Insufficient historical data' };
    }

    const hour = transaction.timestamp.getHours();
    const historicalHours = historical.map(t => t.timestamp.getHours());
    const hourCounts = new Array(24).fill(0);

    historicalHours.forEach(h => hourCounts[h]++);

    const avgHourlyCount = historicalHours.length / 24;
    const currentHourCount = hourCounts[hour];

    // Check if this is an unusual time for transactions
    if (currentHourCount < avgHourlyCount * 0.1 && (hour < 6 || hour > 22)) {
      return {
        name: 'time',
        contribution: 10,
        description: `Transaction at unusual time (${hour}:00)`,
      };
    }

    return { name: 'time', contribution: 0, description: 'Time pattern normal' };
  }

  /**
   * Detect transaction type anomalies
   */
  private detectTypeAnomaly(transaction: Transaction, historical: Transaction[]): AnomalyFactor {
    if (historical.length === 0) {
      return { name: 'type', contribution: 0, description: 'Insufficient historical data' };
    }

    const historicalTypes = new Set(historical.map(t => t.type));

    if (!historicalTypes.has(transaction.type)) {
      return {
        name: 'type',
        contribution: 15,
        description: `New transaction type: ${transaction.type}`,
      };
    }

    return { name: 'type', contribution: 0, description: 'Transaction type normal' };
  }

  /**
   * Calculate confidence based on data availability
   */
  private calculateConfidence(dataPoints: number, factorCount: number): number {
    // More data points = higher confidence
    const dataConfidence = Math.min(dataPoints / 100, 1);

    // More factors detected = higher confidence in anomaly
    const factorConfidence = factorCount > 0 ? Math.min(factorCount / 5, 1) : 0.5;

    return (dataConfidence + factorConfidence) / 2;
  }

  /**
   * Train a behavior profile for a party
   */
  buildProfile(partyId: string, transactions: Transaction[]): BehaviorProfile {
    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const countries = transactions.flatMap(t => [t.sender.country, t.receiver.country]);
    const countryFreq = this.getFrequencies(countries);
    const topCountries = Object.entries(countryFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country]) => country);

    const types = transactions.map(t => t.type);
    const typeFreq = this.getFrequencies(types);
    const topTypes = Object.entries(typeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type as any);

    const hours = transactions.map(t => t.timestamp.getHours());
    const hourPattern = new Array(24).fill(0);
    hours.forEach(h => hourPattern[h]++);

    const profile: BehaviorProfile = {
      partyId,
      averageTransactionAmount: avgAmount,
      transactionFrequency: transactions.length / 30, // per day
      preferredCountries: topCountries,
      preferredTypes: topTypes,
      timeOfDayPattern: hourPattern,
      peerGroup: this.determinePeerGroup(avgAmount, transactions.length),
      baseline: {
        totalTransactions: transactions.length,
        amountStdDev: this.calculateStdDev(amounts),
      },
    };

    this.profiles.set(partyId, profile);
    return profile;
  }

  /**
   * Get frequency distribution
   */
  private getFrequencies<T>(items: T[]): Record<string, number> {
    const freq: Record<string, number> = {};
    items.forEach(item => {
      const key = String(item);
      freq[key] = (freq[key] || 0) + 1;
    });
    return freq;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
  }

  /**
   * Determine peer group based on transaction patterns
   */
  private determinePeerGroup(avgAmount: number, txCount: number): string {
    if (avgAmount > 100000) return 'high_value';
    if (avgAmount > 10000) return 'medium_value';
    if (txCount > 100) return 'high_frequency';
    if (txCount > 20) return 'medium_frequency';
    return 'standard';
  }

  /**
   * Get profile for a party
   */
  getProfile(partyId: string): BehaviorProfile | undefined {
    return this.profiles.get(partyId);
  }
}
