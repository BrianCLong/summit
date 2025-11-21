/**
 * Message Analyzer - Text communications analysis
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface MessageAnalysisResult {
  id: string;
  originalContent: string;
  normalizedContent: string;
  language: string;
  encoding: string;

  // Extracted data
  entities: ExtractedEntity[];
  keywords: string[];
  topics: Array<{ topic: string; confidence: number }>;
  sentiment: { score: number; magnitude: number };

  // Communication patterns
  urgency: 'low' | 'medium' | 'high' | 'critical';
  formality: number;

  // Selectors matched
  matchedSelectors: string[];

  // Metadata
  analysisTimestamp: Date;
  processingTime: number;
  isSimulated: boolean;
}

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  normalizedValue?: string;
  confidence: number;
  position: { start: number; end: number };
  metadata?: Record<string, unknown>;
}

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'DATE'
  | 'TIME'
  | 'PHONE'
  | 'EMAIL'
  | 'IP_ADDRESS'
  | 'URL'
  | 'CALLSIGN'
  | 'COORDINATE'
  | 'CURRENCY'
  | 'WEAPON'
  | 'VEHICLE'
  | 'CODE_WORD';

export interface Selector {
  id: string;
  type: 'keyword' | 'regex' | 'entity' | 'semantic';
  value: string;
  priority: number;
  active: boolean;
}

export class MessageAnalyzer {
  private selectors: Map<string, Selector> = new Map();
  private entityPatterns: Map<EntityType, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeDefaultSelectors();
  }

  private initializePatterns(): void {
    this.entityPatterns.set('PHONE', [
      /\+?[\d\s\-().]{10,}/g,
      /\(\d{3}\)\s*\d{3}[\s-]?\d{4}/g
    ]);

    this.entityPatterns.set('EMAIL', [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    ]);

    this.entityPatterns.set('IP_ADDRESS', [
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g
    ]);

    this.entityPatterns.set('URL', [
      /https?:\/\/[^\s<>]+/gi
    ]);

    this.entityPatterns.set('COORDINATE', [
      /[-+]?(?:\d+\.?\d*|\.\d+)°?\s*[NS]?\s*,?\s*[-+]?(?:\d+\.?\d*|\.\d+)°?\s*[EW]?/gi,
      /\b\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"?\s*[NSEW]\b/gi
    ]);

    this.entityPatterns.set('DATE', [
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
    ]);

    this.entityPatterns.set('TIME', [
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|Z|UTC|GMT)?\b/gi,
      /\b\d{4}Z\b/g
    ]);

    this.entityPatterns.set('CALLSIGN', [
      /\b[A-Z]{4,6}[-\s]?\d{1,3}\b/g,
      /\b(?:ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|HOTEL|INDIA|JULIET|KILO|LIMA|MIKE|NOVEMBER|OSCAR|PAPA|QUEBEC|ROMEO|SIERRA|TANGO|UNIFORM|VICTOR|WHISKEY|XRAY|YANKEE|ZULU)(?:[-\s]\d+)?\b/gi
    ]);
  }

  private initializeDefaultSelectors(): void {
    const defaults: Selector[] = [
      { id: uuid(), type: 'keyword', value: 'EXERCISE', priority: 1, active: true },
      { id: uuid(), type: 'keyword', value: 'TRAINING', priority: 1, active: true },
      { id: uuid(), type: 'keyword', value: 'SIMULATION', priority: 1, active: true },
      { id: uuid(), type: 'regex', value: '\\b(ALPHA|BRAVO|CHARLIE)\\s*\\d+\\b', priority: 2, active: true }
    ];

    defaults.forEach(s => this.selectors.set(s.id, s));
  }

  /**
   * Analyze a text message
   */
  async analyze(content: string): Promise<MessageAnalysisResult> {
    const startTime = Date.now();

    const entities = this.extractEntities(content);
    const keywords = this.extractKeywords(content);
    const matchedSelectors = this.matchSelectors(content);

    const result: MessageAnalysisResult = {
      id: uuid(),
      originalContent: content,
      normalizedContent: this.normalizeText(content),
      language: this.detectLanguage(content),
      encoding: 'UTF-8',
      entities,
      keywords,
      topics: this.classifyTopics(content),
      sentiment: this.analyzeSentiment(content),
      urgency: this.assessUrgency(content),
      formality: this.assessFormality(content),
      matchedSelectors,
      analysisTimestamp: new Date(),
      processingTime: Date.now() - startTime,
      isSimulated: true
    };

    return result;
  }

  /**
   * Extract entities from text
   */
  private extractEntities(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    for (const [type, patterns] of this.entityPatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags);
        let match;

        while ((match = regex.exec(content)) !== null) {
          entities.push({
            text: match[0],
            type,
            confidence: 0.8 + Math.random() * 0.15,
            position: { start: match.index, end: match.index + match[0].length }
          });
        }
      }
    }

    // Remove duplicates
    const unique = entities.filter((e, i, arr) =>
      arr.findIndex(x => x.text === e.text && x.type === e.type) === i
    );

    return unique;
  }

  /**
   * Extract keywords using TF-IDF-like scoring
   */
  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Simple frequency-based extraction
    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));

    // Filter stop words
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
      'can', 'her', 'was', 'one', 'our', 'out', 'this', 'that',
      'with', 'have', 'from', 'they', 'been', 'will', 'their'
    ]);

    return Array.from(freq.entries())
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Match configured selectors
   */
  private matchSelectors(content: string): string[] {
    const matched: string[] = [];

    for (const [id, selector] of this.selectors) {
      if (!selector.active) continue;

      let isMatch = false;

      switch (selector.type) {
        case 'keyword':
          isMatch = content.toUpperCase().includes(selector.value.toUpperCase());
          break;
        case 'regex':
          try {
            const regex = new RegExp(selector.value, 'gi');
            isMatch = regex.test(content);
          } catch {
            // Invalid regex
          }
          break;
      }

      if (isMatch) {
        matched.push(id);
      }
    }

    return matched;
  }

  /**
   * Topic classification (simplified)
   */
  private classifyTopics(content: string): Array<{ topic: string; confidence: number }> {
    const topicKeywords: Record<string, string[]> = {
      'Military Operations': ['operation', 'mission', 'tactical', 'objective', 'checkpoint'],
      'Communications': ['radio', 'transmission', 'frequency', 'signal', 'channel'],
      'Training': ['exercise', 'training', 'simulation', 'drill', 'practice'],
      'Logistics': ['supply', 'transport', 'equipment', 'resources', 'delivery']
    };

    const contentLower = content.toLowerCase();
    const topics: Array<{ topic: string; confidence: number }> = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(kw => contentLower.includes(kw)).length;
      if (matches > 0) {
        topics.push({
          topic,
          confidence: Math.min(0.95, 0.3 + matches * 0.2)
        });
      }
    }

    return topics.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(content: string): { score: number; magnitude: number } {
    const positive = ['good', 'success', 'complete', 'ready', 'confirmed'];
    const negative = ['fail', 'error', 'negative', 'abort', 'cancel'];

    const contentLower = content.toLowerCase();
    let score = 0;

    positive.forEach(w => { if (contentLower.includes(w)) score += 0.2; });
    negative.forEach(w => { if (contentLower.includes(w)) score -= 0.2; });

    return {
      score: Math.max(-1, Math.min(1, score)),
      magnitude: Math.abs(score)
    };
  }

  /**
   * Assess message urgency
   */
  private assessUrgency(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgentKeywords = ['urgent', 'immediate', 'emergency', 'critical', 'asap', 'priority'];
    const contentLower = content.toLowerCase();

    const urgentCount = urgentKeywords.filter(kw => contentLower.includes(kw)).length;

    if (urgentCount >= 2) return 'critical';
    if (urgentCount === 1) return 'high';
    if (content === content.toUpperCase() && content.length > 20) return 'medium';
    return 'low';
  }

  /**
   * Assess formality level (0-1)
   */
  private assessFormality(content: string): number {
    const formalIndicators = ['pursuant', 'hereby', 'regarding', 'furthermore', 'accordingly'];
    const informalIndicators = ['hey', 'yeah', 'gonna', 'wanna', 'lol', 'btw'];

    const contentLower = content.toLowerCase();
    let score = 0.5;

    formalIndicators.forEach(w => { if (contentLower.includes(w)) score += 0.1; });
    informalIndicators.forEach(w => { if (contentLower.includes(w)) score -= 0.1; });

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Simple language detection
   */
  private detectLanguage(content: string): string {
    // Simplified - would use proper library in production
    return 'en';
  }

  /**
   * Add a selector
   */
  addSelector(selector: Omit<Selector, 'id'>): string {
    const id = uuid();
    this.selectors.set(id, { ...selector, id });
    return id;
  }

  /**
   * Remove a selector
   */
  removeSelector(id: string): boolean {
    return this.selectors.delete(id);
  }

  /**
   * Get all selectors
   */
  getSelectors(): Selector[] {
    return Array.from(this.selectors.values());
  }
}
