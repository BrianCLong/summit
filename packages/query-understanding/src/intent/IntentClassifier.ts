/**
 * Query intent classification
 * Determines user intent from search queries
 */

import type { QueryIntent, IntentClassifierConfig, Intent } from '../types.js';
import * as natural from 'natural';
import compromise from 'compromise';

export class IntentClassifier {
  private classifier: natural.LogisticRegressionClassifier;
  private intents: Intent[];
  private threshold: number;
  private trained: boolean = false;

  constructor(config: IntentClassifierConfig = {}) {
    this.threshold = config.threshold || 0.5;
    this.classifier = new natural.LogisticRegressionClassifier();
    this.intents = config.customIntents || this.getDefaultIntents();
  }

  private getDefaultIntents(): Intent[] {
    return [
      {
        name: 'search_entity',
        description: 'Search for a specific entity (person, org, location)',
        examples: [
          'find john smith',
          'search for acme corporation',
          'locate washington dc',
          'who is jane doe',
        ],
        patterns: [
          /\b(find|search|locate|who is|what is)\b/i,
          /\b(person|organization|company|location|place)\b/i,
        ],
      },
      {
        name: 'search_threat',
        description: 'Search for threat intelligence',
        examples: [
          'malware analysis',
          'apt group activities',
          'vulnerability cve',
          'ransomware attack',
        ],
        patterns: [/\b(malware|apt|vulnerability|cve|threat|attack)\b/i],
      },
      {
        name: 'search_relationship',
        description: 'Find relationships between entities',
        examples: [
          'connection between x and y',
          'related to entity',
          'associated with',
          'links to',
        ],
        patterns: [
          /\b(connection|relationship|related|associated|linked|ties)\b/i,
        ],
      },
      {
        name: 'search_temporal',
        description: 'Time-based searches',
        examples: [
          'events last week',
          'recent activities',
          'historical data',
          'trends over time',
        ],
        patterns: [
          /\b(recent|latest|yesterday|today|last week|last month)\b/i,
          /\b(historical|trend|timeline|chronological)\b/i,
        ],
      },
      {
        name: 'search_geographic',
        description: 'Location-based searches',
        examples: [
          'near location',
          'within radius',
          'in region',
          'geographic area',
        ],
        patterns: [/\b(near|within|around|in|at|location|region|area)\b/i],
      },
      {
        name: 'analytics',
        description: 'Analytical queries',
        examples: [
          'analyze pattern',
          'statistics of',
          'count entities',
          'aggregate data',
        ],
        patterns: [
          /\b(analyze|statistics|count|aggregate|summarize|metrics)\b/i,
        ],
      },
      {
        name: 'exploration',
        description: 'Open-ended exploration',
        examples: [
          'show me everything about',
          'explore topic',
          'browse category',
          'discover patterns',
        ],
        patterns: [/\b(show|explore|browse|discover|investigate)\b/i],
      },
    ];
  }

  /**
   * Train the classifier
   */
  async train(): Promise<void> {
    if (this.trained) return;

    for (const intent of this.intents) {
      for (const example of intent.examples) {
        this.classifier.addDocument(example, intent.name);
      }
    }

    this.classifier.train();
    this.trained = true;
    console.log('Intent classifier trained');
  }

  /**
   * Classify query intent
   */
  async classify(query: string): Promise<QueryIntent> {
    await this.train();

    // Get classification from trained model
    const classifications = this.classifier.getClassifications(query);

    // Also check pattern matching
    const patternMatches = this.matchPatterns(query);

    // Combine scores
    const combinedScores = new Map<string, number>();

    for (const classification of classifications) {
      combinedScores.set(classification.label, classification.value);
    }

    for (const [intent, score] of patternMatches) {
      const currentScore = combinedScores.get(intent) || 0;
      combinedScores.set(intent, Math.max(currentScore, score));
    }

    // Find highest scoring intent
    let maxIntent = 'general_search';
    let maxScore = 0;

    for (const [intent, score] of combinedScores) {
      if (score > maxScore) {
        maxScore = score;
        maxIntent = intent;
      }
    }

    // Extract entities based on intent
    const entities = this.extractEntitiesForIntent(query, maxIntent);

    return {
      intent: maxIntent,
      confidence: maxScore,
      entities,
      metadata: {
        allScores: Object.fromEntries(combinedScores),
      },
    };
  }

  /**
   * Match query against patterns
   */
  private matchPatterns(query: string): Map<string, number> {
    const matches = new Map<string, number>();

    for (const intent of this.intents) {
      if (intent.patterns) {
        for (const pattern of intent.patterns) {
          if (pattern.test(query)) {
            const currentScore = matches.get(intent.name) || 0;
            matches.set(intent.name, currentScore + 0.3);
          }
        }
      }
    }

    return matches;
  }

  /**
   * Extract entities relevant to the detected intent
   */
  private extractEntitiesForIntent(
    query: string,
    intent: string,
  ): any[] | undefined {
    const doc = compromise(query);

    switch (intent) {
      case 'search_entity':
        return [
          ...this.extractPeople(doc),
          ...this.extractOrganizations(doc),
          ...this.extractPlaces(doc),
        ];
      case 'search_temporal':
        return this.extractDates(doc);
      case 'search_geographic':
        return this.extractPlaces(doc);
      default:
        return undefined;
    }
  }

  private extractPeople(doc: any): any[] {
    const people = doc.people().out('array');
    return people.map((text: string, idx: number) => ({
      text,
      type: 'person',
      start: -1,
      end: -1,
      confidence: 0.8,
    }));
  }

  private extractOrganizations(doc: any): any[] {
    const orgs = doc.organizations().out('array');
    return orgs.map((text: string) => ({
      text,
      type: 'organization',
      start: -1,
      end: -1,
      confidence: 0.8,
    }));
  }

  private extractPlaces(doc: any): any[] {
    const places = doc.places().out('array');
    return places.map((text: string) => ({
      text,
      type: 'location',
      start: -1,
      end: -1,
      confidence: 0.8,
    }));
  }

  private extractDates(doc: any): any[] {
    const dates = (doc as any).dates?.().out('array') || [];
    return dates.map((text: string) => ({
      text,
      type: 'date',
      start: -1,
      end: -1,
      confidence: 0.9,
    }));
  }

  /**
   * Add custom intent
   */
  addIntent(intent: Intent): void {
    this.intents.push(intent);
    this.trained = false; // Require retraining
  }

  /**
   * Get all supported intents
   */
  getIntents(): Intent[] {
    return this.intents;
  }
}
