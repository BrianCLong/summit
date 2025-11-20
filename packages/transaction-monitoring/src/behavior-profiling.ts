/**
 * Customer Behavior Profiling
 */

import { Transaction, BehaviorProfile, TransactionType } from './types.js';

export class BehaviorProfiler {
  private profiles: Map<string, BehaviorProfile> = new Map();

  /**
   * Build or update a behavior profile for a customer
   */
  async buildProfile(customerId: string, transactions: Transaction[]): Promise<BehaviorProfile> {
    if (transactions.length === 0) {
      throw new Error('Cannot build profile without transactions');
    }

    const amounts = transactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    // Calculate transaction frequency (transactions per day)
    const dateRange = this.getDateRange(transactions);
    const daysDiff = Math.max((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24), 1);
    const frequency = transactions.length / daysDiff;

    // Extract preferred countries
    const countries = transactions.flatMap(t => [t.sender.country, t.receiver.country]);
    const preferredCountries = this.getTopValues(countries, 5);

    // Extract preferred transaction types
    const types = transactions.map(t => t.type);
    const preferredTypes = this.getTopValues(types, 3) as TransactionType[];

    // Build time-of-day pattern (24-hour histogram)
    const timeOfDayPattern = this.buildTimePattern(transactions);

    // Determine peer group
    const peerGroup = this.determinePeerGroup(avgAmount, frequency, transactions.length);

    // Calculate additional baseline metrics
    const baseline = {
      totalTransactions: transactions.length,
      amountStdDev: this.calculateStdDev(amounts),
      amountMin: Math.min(...amounts),
      amountMax: Math.max(...amounts),
      amountMedian: this.calculateMedian(amounts),
      dayRange: daysDiff,
      uniqueCounterparties: this.countUniqueCounterparties(transactions, customerId),
      typeDistribution: this.getDistribution(types),
    };

    const profile: BehaviorProfile = {
      partyId: customerId,
      averageTransactionAmount: avgAmount,
      transactionFrequency: frequency,
      preferredCountries,
      preferredTypes,
      timeOfDayPattern,
      peerGroup,
      baseline,
    };

    this.profiles.set(customerId, profile);
    return profile;
  }

  /**
   * Compare a transaction against a behavior profile
   */
  async compareToProfile(transaction: Transaction, profile: BehaviorProfile): Promise<number> {
    let deviationScore = 0;

    // Amount deviation (0-25 points)
    const amountDeviation = Math.abs(transaction.amount - profile.averageTransactionAmount) /
                           profile.averageTransactionAmount;
    if (amountDeviation > 2) deviationScore += 25;
    else if (amountDeviation > 1) deviationScore += 15;
    else if (amountDeviation > 0.5) deviationScore += 5;

    // Country deviation (0-20 points)
    if (!profile.preferredCountries.includes(transaction.sender.country) &&
        !profile.preferredCountries.includes(transaction.receiver.country)) {
      deviationScore += 20;
    }

    // Type deviation (0-15 points)
    if (!profile.preferredTypes.includes(transaction.type)) {
      deviationScore += 15;
    }

    // Time deviation (0-15 points)
    const hour = transaction.timestamp.getHours();
    const hourlyAvg = profile.timeOfDayPattern.reduce((sum, val) => sum + val, 0) / 24;
    if (profile.timeOfDayPattern[hour] < hourlyAvg * 0.2) {
      deviationScore += 15;
    }

    // Frequency deviation (0-25 points)
    // This would require recent transaction history to calculate properly
    // For now, we'll skip or use a simplified approach

    return Math.min(deviationScore, 100);
  }

  /**
   * Get a stored profile
   */
  getProfile(customerId: string): BehaviorProfile | undefined {
    return this.profiles.get(customerId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): BehaviorProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get date range of transactions
   */
  private getDateRange(transactions: Transaction[]): { start: Date; end: Date } {
    const timestamps = transactions.map(t => t.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps)),
    };
  }

  /**
   * Get top N values by frequency
   */
  private getTopValues<T>(items: T[], count: number): T[] {
    const freq = new Map<T, number>();
    items.forEach(item => {
      freq.set(item, (freq.get(item) || 0) + 1);
    });

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([item]) => item);
  }

  /**
   * Build 24-hour time pattern histogram
   */
  private buildTimePattern(transactions: Transaction[]): number[] {
    const pattern = new Array(24).fill(0);
    transactions.forEach(t => {
      const hour = t.timestamp.getHours();
      pattern[hour]++;
    });
    return pattern;
  }

  /**
   * Determine peer group classification
   */
  private determinePeerGroup(avgAmount: number, frequency: number, totalTxns: number): string {
    if (avgAmount > 1000000) return 'ultra_high_value';
    if (avgAmount > 100000) return 'high_value';
    if (avgAmount > 10000) return 'medium_value';

    if (frequency > 50) return 'ultra_high_frequency';
    if (frequency > 10) return 'high_frequency';
    if (frequency > 1) return 'medium_frequency';

    if (totalTxns < 10) return 'new_customer';

    return 'standard';
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Count unique counterparties
   */
  private countUniqueCounterparties(transactions: Transaction[], customerId: string): number {
    const counterparties = new Set<string>();
    transactions.forEach(t => {
      if (t.sender.id !== customerId) counterparties.add(t.sender.id);
      if (t.receiver.id !== customerId) counterparties.add(t.receiver.id);
    });
    return counterparties.size;
  }

  /**
   * Get distribution of values
   */
  private getDistribution<T>(items: T[]): Record<string, number> {
    const dist: Record<string, number> = {};
    items.forEach(item => {
      const key = String(item);
      dist[key] = (dist[key] || 0) + 1;
    });
    return dist;
  }

  /**
   * Find similar profiles (peer group analysis)
   */
  findSimilarProfiles(profile: BehaviorProfile, limit: number = 10): BehaviorProfile[] {
    const allProfiles = this.getAllProfiles();

    const scored = allProfiles
      .filter(p => p.partyId !== profile.partyId)
      .map(p => ({
        profile: p,
        similarity: this.calculateSimilarity(profile, p),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored.map(s => s.profile);
  }

  /**
   * Calculate similarity between two profiles
   */
  private calculateSimilarity(p1: BehaviorProfile, p2: BehaviorProfile): number {
    let similarity = 0;

    // Peer group match (25 points)
    if (p1.peerGroup === p2.peerGroup) similarity += 25;

    // Amount similarity (25 points)
    const amountRatio = Math.min(p1.averageTransactionAmount, p2.averageTransactionAmount) /
                       Math.max(p1.averageTransactionAmount, p2.averageTransactionAmount);
    similarity += amountRatio * 25;

    // Frequency similarity (25 points)
    const freqRatio = Math.min(p1.transactionFrequency, p2.transactionFrequency) /
                     Math.max(p1.transactionFrequency, p2.transactionFrequency);
    similarity += freqRatio * 25;

    // Country overlap (15 points)
    const countryOverlap = p1.preferredCountries.filter(c =>
      p2.preferredCountries.includes(c)
    ).length;
    similarity += (countryOverlap / Math.max(p1.preferredCountries.length, 1)) * 15;

    // Type overlap (10 points)
    const typeOverlap = p1.preferredTypes.filter(t =>
      p2.preferredTypes.includes(t)
    ).length;
    similarity += (typeOverlap / Math.max(p1.preferredTypes.length, 1)) * 10;

    return similarity;
  }
}
