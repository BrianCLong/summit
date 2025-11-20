/**
 * Event Analyzer - Analyze and correlate geopolitical events
 */

import {
  GeopoliticalEvent,
  EventAnalysis,
  Trend,
  HistoricalComparison,
  Prediction,
  EventImpact
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class EventAnalyzer {
  private historicalEvents: Map<string, GeopoliticalEvent>;

  constructor() {
    this.historicalEvents = new Map();
  }

  /**
   * Analyze a geopolitical event
   */
  async analyzeEvent(event: GeopoliticalEvent): Promise<EventAnalysis> {
    const trends = await this.identifyTrends(event);
    const relatedEvents = this.findRelatedEvents(event);
    const historicalComparison = this.compareWithHistory(event);
    const predictions = this.generatePredictions(event);
    const recommendations = this.generateRecommendations(event);

    return {
      eventId: event.id,
      trends,
      relatedEvents,
      historicalComparison,
      predictions,
      recommendations
    };
  }

  /**
   * Identify trends related to event
   */
  private async identifyTrends(event: GeopoliticalEvent): Promise<Trend[]> {
    const trends: Trend[] = [];

    // Analyze volatility trend
    if (event.volatilityScore > 70) {
      trends.push({
        id: uuidv4(),
        type: 'VOLATILITY',
        direction: 'INCREASING',
        strength: event.volatilityScore,
        timeframe: 'short-term',
        indicators: ['high-volatility-score', 'rapid-changes']
      });
    }

    // Analyze risk trend
    if (event.impact.overall > 60) {
      trends.push({
        id: uuidv4(),
        type: 'ESCALATION',
        direction: 'INCREASING',
        strength: event.impact.overall,
        timeframe: 'medium-term',
        indicators: ['high-impact', 'risk-escalation']
      });
    }

    // Sentiment-based trend
    if (event.sentiment < -0.3) {
      trends.push({
        id: uuidv4(),
        type: 'ESCALATION',
        direction: 'INCREASING',
        strength: Math.abs(event.sentiment) * 100,
        timeframe: 'short-term',
        indicators: ['negative-sentiment', 'deteriorating-situation']
      });
    } else if (event.sentiment > 0.3) {
      trends.push({
        id: uuidv4(),
        type: 'DE_ESCALATION',
        direction: 'DECREASING',
        strength: event.sentiment * 100,
        timeframe: 'medium-term',
        indicators: ['positive-sentiment', 'improving-situation']
      });
    }

    return trends;
  }

  /**
   * Find related events
   */
  private findRelatedEvents(event: GeopoliticalEvent): string[] {
    const related: string[] = [];

    // Find events in same country
    for (const [id, historicalEvent] of this.historicalEvents) {
      if (historicalEvent.country === event.country &&
          historicalEvent.id !== event.id) {
        // Check if events are temporally related (within 30 days)
        const timeDiff = Math.abs(event.timestamp.getTime() - historicalEvent.timestamp.getTime());
        if (timeDiff < 30 * 24 * 60 * 60 * 1000) {
          related.push(id);
        }
      }
    }

    return related.slice(0, 10); // Limit to 10 most related
  }

  /**
   * Compare with historical events
   */
  private compareWithHistory(event: GeopoliticalEvent): HistoricalComparison[] {
    const comparisons: HistoricalComparison[] = [];

    for (const [id, historicalEvent] of this.historicalEvents) {
      // Compare similar event types in same region
      if (historicalEvent.type === event.type &&
          historicalEvent.region === event.region) {
        const similarity = this.calculateSimilarity(event, historicalEvent);

        if (similarity > 0.6) {
          comparisons.push({
            historicalEventId: id,
            similarity,
            outcome: this.describeOutcome(historicalEvent),
            lessons: this.extractLessons(historicalEvent)
          });
        }
      }
    }

    return comparisons.slice(0, 5); // Top 5 most similar
  }

  /**
   * Calculate similarity between events
   */
  private calculateSimilarity(event1: GeopoliticalEvent, event2: GeopoliticalEvent): number {
    let similarity = 0;
    let factors = 0;

    // Type match
    if (event1.type === event2.type) {
      similarity += 0.3;
    }
    factors++;

    // Country match
    if (event1.country === event2.country) {
      similarity += 0.2;
    }
    factors++;

    // Risk level similarity
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const risk1 = riskLevels.indexOf(event1.riskLevel);
    const risk2 = riskLevels.indexOf(event2.riskLevel);
    similarity += (1 - Math.abs(risk1 - risk2) / riskLevels.length) * 0.2;
    factors++;

    // Impact similarity
    const impactDiff = Math.abs(event1.impact.overall - event2.impact.overall) / 100;
    similarity += (1 - impactDiff) * 0.3;
    factors++;

    return similarity / factors;
  }

  /**
   * Describe event outcome
   */
  private describeOutcome(event: GeopoliticalEvent): string {
    if (event.riskLevel === 'CRITICAL') {
      return 'Major crisis with significant regional impact';
    } else if (event.riskLevel === 'HIGH') {
      return 'Serious situation requiring immediate attention';
    } else if (event.riskLevel === 'MEDIUM') {
      return 'Moderate impact with manageable consequences';
    } else {
      return 'Limited impact with quick resolution';
    }
  }

  /**
   * Extract lessons from historical event
   */
  private extractLessons(event: GeopoliticalEvent): string[] {
    const lessons: string[] = [];

    if (event.impact.economic > 70) {
      lessons.push('Significant economic disruption can be expected');
    }

    if (event.impact.security > 70) {
      lessons.push('Security situation may deteriorate rapidly');
    }

    if (event.volatilityScore > 70) {
      lessons.push('Situation is highly volatile and unpredictable');
    }

    lessons.push('Early intervention and monitoring are critical');
    lessons.push('Stakeholder engagement is essential for resolution');

    return lessons;
  }

  /**
   * Generate predictions based on event
   */
  private generatePredictions(event: GeopoliticalEvent): Prediction[] {
    const predictions: Prediction[] = [];

    // High-risk escalation scenario
    if (event.riskLevel === 'HIGH' || event.riskLevel === 'CRITICAL') {
      predictions.push({
        scenario: 'Situation escalates to regional crisis',
        probability: 0.6,
        timeframe: '1-3 months',
        indicators: ['increasing-violence', 'regional-involvement', 'failed-negotiations'],
        potentialImpact: {
          economic: Math.min(100, event.impact.economic * 1.5),
          political: Math.min(100, event.impact.political * 1.3),
          social: Math.min(100, event.impact.social * 1.4),
          security: Math.min(100, event.impact.security * 1.6),
          overall: Math.min(100, event.impact.overall * 1.4),
          affectedSectors: [...event.impact.affectedSectors, 'regional-stability']
        }
      });
    }

    // Stabilization scenario
    predictions.push({
      scenario: 'Situation stabilizes through diplomatic efforts',
      probability: event.sentiment > 0 ? 0.7 : 0.4,
      timeframe: '2-6 months',
      indicators: ['successful-negotiations', 'international-support', 'reduced-tensions'],
      potentialImpact: {
        economic: event.impact.economic * 0.6,
        political: event.impact.political * 0.7,
        social: event.impact.social * 0.8,
        security: event.impact.security * 0.5,
        overall: event.impact.overall * 0.6,
        affectedSectors: event.impact.affectedSectors
      }
    });

    // Status quo scenario
    predictions.push({
      scenario: 'Situation remains unchanged',
      probability: 0.5,
      timeframe: '1-6 months',
      indicators: ['stalemate', 'no-breakthrough', 'ongoing-monitoring'],
      potentialImpact: event.impact
    });

    return predictions;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(event: GeopoliticalEvent): string[] {
    const recommendations: string[] = [];

    if (event.riskLevel === 'CRITICAL' || event.riskLevel === 'HIGH') {
      recommendations.push('Activate crisis management protocols');
      recommendations.push('Increase monitoring frequency to real-time');
      recommendations.push('Notify senior stakeholders immediately');
    }

    if (event.impact.economic > 60) {
      recommendations.push('Assess economic exposure and implement hedging strategies');
      recommendations.push('Review supply chain dependencies');
    }

    if (event.impact.security > 60) {
      recommendations.push('Review security protocols for personnel in affected region');
      recommendations.push('Consider evacuation planning if situation deteriorates');
    }

    recommendations.push('Engage with local experts and analysts for deeper insights');
    recommendations.push('Monitor related events and indicators for early warning signs');
    recommendations.push('Prepare scenario-based response plans');

    return recommendations;
  }

  /**
   * Add event to historical database
   */
  addToHistory(event: GeopoliticalEvent): void {
    this.historicalEvents.set(event.id, event);
  }

  /**
   * Clear historical events
   */
  clearHistory(): void {
    this.historicalEvents.clear();
  }
}
