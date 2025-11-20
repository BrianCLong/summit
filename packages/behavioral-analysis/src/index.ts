/**
 * Behavioral Analysis Package
 *
 * Provides behavioral biometrics and pattern analysis including:
 * - Typing patterns and keystroke dynamics
 * - Mouse movement and interaction patterns
 * - Navigation and browsing behavior
 * - Temporal and linguistic patterns
 * - Communication style analysis
 */

export interface BehavioralProfile {
  entityId: string;
  typingPattern?: TypingPattern;
  mousePattern?: MousePattern;
  navigationPattern?: NavigationPattern;
  temporalPattern?: TemporalPattern;
  linguisticPattern?: LinguisticPattern;
  communicationStyle?: CommunicationStyle;
  confidence: number;
}

export interface TypingPattern {
  avgKeystrokeDuration: number;
  avgDwellTime: number;
  avgFlightTime: number;
  errorRate: number;
  backspaceFrequency: number;
  uniqueSignature: string;
}

export interface MousePattern {
  avgSpeed: number;
  avgAcceleration: number;
  clickPattern: string;
  movementStyle: 'smooth' | 'jerky' | 'precise';
  handedness: 'left' | 'right' | 'ambidextrous';
}

export interface NavigationPattern {
  avgSessionDuration: number;
  pagesPerSession: number;
  commonPaths: string[];
  bounceRate: number;
  returnVisitor: boolean;
}

export interface TemporalPattern {
  activeHours: number[];
  timezone: string;
  consistency: number;
  weekdayActivity: number[];
  weekendActivity: number[];
}

export interface LinguisticPattern {
  vocabulary: string[];
  avgSentenceLength: number;
  punctuationStyle: string;
  writingLevel: string;
  commonPhrases: string[];
  language: string;
  dialect?: string;
}

export interface CommunicationStyle {
  responseTime: number;
  messageLength: number;
  formality: 'formal' | 'casual' | 'mixed';
  emojiUsage: number;
  topicPreferences: string[];
}

export class BehavioralAnalyzer {
  private profiles: Map<string, BehavioralProfile> = new Map();

  addProfile(profile: BehavioralProfile): void {
    this.profiles.set(profile.entityId, profile);
  }

  compareProfiles(id1: string, id2: string): number {
    const p1 = this.profiles.get(id1);
    const p2 = this.profiles.get(id2);
    if (!p1 || !p2) return 0;

    let similarity = 0;
    let count = 0;

    if (p1.typingPattern && p2.typingPattern) {
      similarity += this.compareTypingPatterns(p1.typingPattern, p2.typingPattern);
      count++;
    }

    if (p1.temporalPattern && p2.temporalPattern) {
      similarity += this.compareTemporalPatterns(p1.temporalPattern, p2.temporalPattern);
      count++;
    }

    return count > 0 ? similarity / count : 0;
  }

  private compareTypingPatterns(p1: TypingPattern, p2: TypingPattern): number {
    const durationDiff = Math.abs(p1.avgKeystrokeDuration - p2.avgKeystrokeDuration);
    const dwellDiff = Math.abs(p1.avgDwellTime - p2.avgDwellTime);
    const errorDiff = Math.abs(p1.errorRate - p2.errorRate);

    return 1 - ((durationDiff + dwellDiff + errorDiff) / 3);
  }

  private compareTemporalPatterns(p1: TemporalPattern, p2: TemporalPattern): number {
    if (p1.timezone !== p2.timezone) return 0.3;

    const hourOverlap = p1.activeHours.filter(h => p2.activeHours.includes(h)).length;
    return hourOverlap / Math.max(p1.activeHours.length, p2.activeHours.length);
  }
}
