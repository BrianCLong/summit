/**
 * Narrative framing analysis
 * Identifies how narratives are framed and presented
 */

import type { NarrativeFraming, FramingDevice } from '../extraction/types.js';

export class FramingAnalyzer {
  async analyzeFraming(text: string): Promise<NarrativeFraming> {
    const framingDevices = await this.identifyFramingDevices(text);
    const mainFrame = await this.identifyMainFrame(text);
    const subFrames = await this.identifySubFrames(text);
    const perspective = this.detectPerspective(text);
    const tone = this.analyzeTone(text);

    return {
      mainFrame,
      subFrames,
      framingDevices,
      perspective,
      tone,
    };
  }

  async identifyFramingDevices(text: string): Promise<FramingDevice[]> {
    const devices: FramingDevice[] = [];

    // Detect metaphors
    const metaphors = this.detectMetaphors(text);
    if (metaphors.length > 0) {
      devices.push({
        type: 'metaphor',
        description: 'Metaphorical language used to frame the narrative',
        examples: metaphors,
      });
    }

    // Detect causal framing
    const causalFrames = this.detectCausalFraming(text);
    if (causalFrames.length > 0) {
      devices.push({
        type: 'causation',
        description: 'Causal relationships emphasized in the narrative',
        examples: causalFrames,
      });
    }

    // Detect conflict framing
    const conflictFrames = this.detectConflictFraming(text);
    if (conflictFrames.length > 0) {
      devices.push({
        type: 'conflict',
        description: 'Conflict-based framing of the narrative',
        examples: conflictFrames,
      });
    }

    // Detect moral framing
    const moralFrames = this.detectMoralFraming(text);
    if (moralFrames.length > 0) {
      devices.push({
        type: 'moral',
        description: 'Moral or ethical framing',
        examples: moralFrames,
      });
    }

    return devices;
  }

  private async identifyMainFrame(text: string): Promise<string> {
    const frames = {
      security: ['security', 'threat', 'danger', 'protection', 'defense'],
      economic: ['economy', 'financial', 'cost', 'benefit', 'trade'],
      moral: ['right', 'wrong', 'ethical', 'justice', 'fair'],
      conflict: ['conflict', 'war', 'battle', 'fight', 'struggle'],
      progress: ['progress', 'development', 'growth', 'innovation'],
      crisis: ['crisis', 'emergency', 'urgent', 'critical'],
    };

    const lowerText = text.toLowerCase();
    let maxScore = 0;
    let mainFrame = 'general';

    for (const [frame, keywords] of Object.entries(frames)) {
      const score = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (score > maxScore) {
        maxScore = score;
        mainFrame = frame;
      }
    }

    return mainFrame;
  }

  private async identifySubFrames(text: string): Promise<string[]> {
    const subFrames: string[] = [];
    const lowerText = text.toLowerCase();

    const framePatterns = {
      victimization: ['victim', 'suffer', 'harm', 'injustice'],
      heroism: ['hero', 'brave', 'courage', 'defender'],
      conspiracy: ['conspiracy', 'plot', 'secret', 'hidden'],
      urgency: ['urgent', 'immediate', 'now', 'critical'],
    };

    for (const [frame, keywords] of Object.entries(framePatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        subFrames.push(frame);
      }
    }

    return subFrames;
  }

  private detectMetaphors(text: string): string[] {
    const metaphors: string[] = [];

    // Common metaphor patterns
    const metaphorPatterns = [
      /is (?:like|as) a ([\w\s]+)/gi,
      /([\w\s]+) is a ([a-z]+)/gi,
    ];

    for (const pattern of metaphorPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        metaphors.push(match[0]);
      }
    }

    return metaphors.slice(0, 5);
  }

  private detectCausalFraming(text: string): string[] {
    const causalFrames: string[] = [];
    const causalWords = [
      'because',
      'therefore',
      'thus',
      'consequently',
      'as a result',
      'leads to',
      'causes',
    ];

    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const causalWord of causalWords) {
        if (sentence.toLowerCase().includes(causalWord)) {
          causalFrames.push(sentence.trim());
          break;
        }
      }
    }

    return causalFrames.slice(0, 3);
  }

  private detectConflictFraming(text: string): string[] {
    const conflictFrames: string[] = [];
    const conflictWords = [
      'versus',
      'against',
      'battle',
      'fight',
      'conflict',
      'oppose',
      'enemy',
    ];

    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const conflictWord of conflictWords) {
        if (sentence.toLowerCase().includes(conflictWord)) {
          conflictFrames.push(sentence.trim());
          break;
        }
      }
    }

    return conflictFrames.slice(0, 3);
  }

  private detectMoralFraming(text: string): string[] {
    const moralFrames: string[] = [];
    const moralWords = ['should', 'must', 'ought', 'right', 'wrong', 'ethical', 'moral'];

    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      for (const moralWord of moralWords) {
        if (sentence.toLowerCase().includes(moralWord)) {
          moralFrames.push(sentence.trim());
          break;
        }
      }
    }

    return moralFrames.slice(0, 3);
  }

  private detectPerspective(text: string): 'first-person' | 'second-person' | 'third-person' {
    const lowerText = text.toLowerCase();

    const firstPersonCount = (lowerText.match(/\b(i|we|our|us)\b/g) || []).length;
    const secondPersonCount = (lowerText.match(/\b(you|your)\b/g) || []).length;

    if (firstPersonCount > secondPersonCount && firstPersonCount > 3) {
      return 'first-person';
    }
    if (secondPersonCount > 3) {
      return 'second-person';
    }
    return 'third-person';
  }

  private analyzeTone(
    text: string
  ): 'neutral' | 'positive' | 'negative' | 'alarmist' | 'celebratory' {
    const lowerText = text.toLowerCase();

    // Alarmist indicators
    const alarmistWords = [
      'crisis',
      'emergency',
      'disaster',
      'catastrophe',
      'urgent',
      'critical',
    ];
    const alarmistCount = alarmistWords.filter(word => lowerText.includes(word)).length;

    if (alarmistCount >= 2) {
      return 'alarmist';
    }

    // Celebratory indicators
    const celebratoryWords = [
      'victory',
      'success',
      'triumph',
      'achievement',
      'breakthrough',
    ];
    const celebratoryCount = celebratoryWords.filter(word => lowerText.includes(word)).length;

    if (celebratoryCount >= 2) {
      return 'celebratory';
    }

    // Simple sentiment
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'beneficial'];
    const negativeWords = ['bad', 'poor', 'terrible', 'negative', 'harmful'];

    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount + 1) {
      return 'positive';
    }
    if (negativeCount > positiveCount + 1) {
      return 'negative';
    }

    return 'neutral';
  }
}
