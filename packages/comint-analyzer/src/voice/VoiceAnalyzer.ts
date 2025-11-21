/**
 * Voice Analysis - Speaker identification and speech analysis
 * TRAINING/SIMULATION ONLY - No actual voice interception
 */

import { v4 as uuid } from 'uuid';

export interface SpeakerProfile {
  id: string;
  voicePrint: number[];
  language: string;
  gender: 'male' | 'female' | 'unknown';
  estimatedAge: { min: number; max: number };
  characteristics: {
    pitchMean: number;
    pitchStd: number;
    speakingRate: number;
    accent?: string;
  };
  confidence: number;
  firstObserved: Date;
  lastObserved: Date;
  observationCount: number;
  isSimulated: boolean;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  language: string;
  confidence: number;
  wordTimestamps: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  speakers: Array<{
    speakerId: string;
    segments: Array<{ start: number; end: number }>;
  }>;
  isSimulated: boolean;
}

export interface VoiceAnalysisResult {
  transcription: TranscriptionResult;
  speakers: SpeakerProfile[];
  languageDetection: {
    primary: string;
    confidence: number;
    alternatives: Array<{ language: string; confidence: number }>;
  };
  keywords: string[];
  entities: Array<{ text: string; type: string; confidence: number }>;
  sentiment: { score: number; label: 'positive' | 'neutral' | 'negative' };
}

export class VoiceAnalyzer {
  private speakerDatabase: Map<string, SpeakerProfile> = new Map();
  private vocabularyKeywords: Set<string> = new Set();

  constructor() {
    this.initializeTrainingData();
  }

  private initializeTrainingData(): void {
    // Sample keywords for training
    const trainingKeywords = [
      'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO',
      'EXERCISE', 'TRAINING', 'SIMULATION', 'TEST',
      'CHECKPOINT', 'RENDEZVOUS', 'OBJECTIVE'
    ];
    trainingKeywords.forEach(kw => this.vocabularyKeywords.add(kw));
  }

  /**
   * Analyze audio for training purposes (simulated)
   */
  async analyzeAudio(
    audioData: Float32Array,
    sampleRate: number
  ): Promise<VoiceAnalysisResult> {
    // Simulate processing delay
    await this.delay(100);

    const speakers = this.detectSpeakers(audioData);
    const transcription = this.simulateTranscription(audioData, sampleRate, speakers);
    const languageDetection = this.detectLanguage(transcription.text);

    return {
      transcription,
      speakers,
      languageDetection,
      keywords: this.extractKeywords(transcription.text),
      entities: this.extractEntities(transcription.text),
      sentiment: this.analyzeSentiment(transcription.text)
    };
  }

  /**
   * Simulated speaker detection
   */
  private detectSpeakers(audioData: Float32Array): SpeakerProfile[] {
    // Generate simulated voice features
    const numSpeakers = 1 + Math.floor(Math.random() * 2);
    const speakers: SpeakerProfile[] = [];

    for (let i = 0; i < numSpeakers; i++) {
      const voicePrint = Array.from({ length: 128 }, () => Math.random());

      // Check for matching speaker in database
      let matchedSpeaker = this.findMatchingSpeaker(voicePrint);

      if (!matchedSpeaker) {
        matchedSpeaker = {
          id: uuid(),
          voicePrint,
          language: 'en',
          gender: Math.random() > 0.5 ? 'male' : 'female',
          estimatedAge: { min: 25, max: 45 },
          characteristics: {
            pitchMean: 100 + Math.random() * 150,
            pitchStd: 10 + Math.random() * 30,
            speakingRate: 120 + Math.random() * 60
          },
          confidence: 0.7 + Math.random() * 0.25,
          firstObserved: new Date(),
          lastObserved: new Date(),
          observationCount: 1,
          isSimulated: true
        };
        this.speakerDatabase.set(matchedSpeaker.id, matchedSpeaker);
      } else {
        matchedSpeaker.lastObserved = new Date();
        matchedSpeaker.observationCount++;
      }

      speakers.push(matchedSpeaker);
    }

    return speakers;
  }

  /**
   * Find matching speaker by voice print similarity
   */
  private findMatchingSpeaker(voicePrint: number[]): SpeakerProfile | null {
    for (const [_, speaker] of this.speakerDatabase) {
      const similarity = this.computeCosineSimilarity(voicePrint, speaker.voicePrint);
      if (similarity > 0.85) {
        return speaker;
      }
    }
    return null;
  }

  private computeCosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Simulated transcription for training
   */
  private simulateTranscription(
    _audioData: Float32Array,
    sampleRate: number,
    speakers: SpeakerProfile[]
  ): TranscriptionResult {
    const trainingPhrases = [
      '[SIMULATED] Alpha team proceeding to checkpoint.',
      '[SIMULATED] Bravo acknowledges, maintaining position.',
      '[SIMULATED] Exercise traffic - training scenario in progress.',
      '[SIMULATED] Radio check, all stations report status.',
      '[SIMULATED] Simulation data - not actual intercept.'
    ];

    const text = trainingPhrases[Math.floor(Math.random() * trainingPhrases.length)];
    const words = text.split(' ');

    return {
      id: uuid(),
      text,
      language: 'en',
      confidence: 0.85 + Math.random() * 0.1,
      wordTimestamps: words.map((word, i) => ({
        word,
        start: i * 0.3,
        end: (i + 1) * 0.3,
        confidence: 0.8 + Math.random() * 0.15
      })),
      speakers: speakers.map((s, i) => ({
        speakerId: s.id,
        segments: [{ start: i * 2, end: (i + 1) * 2 }]
      })),
      isSimulated: true
    };
  }

  /**
   * Language detection (simulated)
   */
  private detectLanguage(text: string): VoiceAnalysisResult['languageDetection'] {
    return {
      primary: 'en',
      confidence: 0.95,
      alternatives: [
        { language: 'es', confidence: 0.02 },
        { language: 'fr', confidence: 0.02 }
      ]
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toUpperCase().split(/\s+/);
    return words.filter(w => this.vocabularyKeywords.has(w));
  }

  /**
   * Extract named entities (simulated NER)
   */
  private extractEntities(text: string): Array<{ text: string; type: string; confidence: number }> {
    const entities: Array<{ text: string; type: string; confidence: number }> = [];

    // Simple pattern matching for training
    const patterns: Array<{ regex: RegExp; type: string }> = [
      { regex: /\b(ALPHA|BRAVO|CHARLIE|DELTA|ECHO)\b/gi, type: 'CALLSIGN' },
      { regex: /\bcheckpoint\b/gi, type: 'LOCATION' },
      { regex: /\bteam\b/gi, type: 'ORGANIZATION' }
    ];

    for (const { regex, type } of patterns) {
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(m => {
          entities.push({
            text: m,
            type,
            confidence: 0.8 + Math.random() * 0.15
          });
        });
      }
    }

    return entities;
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(text: string): { score: number; label: 'positive' | 'neutral' | 'negative' } {
    // Training data is neutral
    return {
      score: 0,
      label: 'neutral'
    };
  }

  /**
   * Get all known speakers
   */
  getSpeakers(): SpeakerProfile[] {
    return Array.from(this.speakerDatabase.values());
  }

  /**
   * Add keyword to vocabulary
   */
  addKeyword(keyword: string): void {
    this.vocabularyKeywords.add(keyword.toUpperCase());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
