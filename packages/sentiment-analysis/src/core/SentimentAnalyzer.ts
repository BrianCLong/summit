/**
 * Main sentiment analyzer orchestrating all sentiment analysis components
 */

import { BertSentimentModel } from '../models/BertSentimentModel.js';
import { EmotionClassifier } from '../models/EmotionClassifier.js';
import { SarcasmDetector } from '../analyzers/SarcasmDetector.js';
import { AspectBasedAnalyzer } from '../analyzers/AspectBasedAnalyzer.js';
import { TemporalSentimentTracker } from '../analyzers/TemporalSentimentTracker.js';
import type {
  SentimentAnalysisResult,
  AnalysisOptions,
  ModelConfig,
} from './types.js';

export class SentimentAnalyzer {
  private sentimentModel: BertSentimentModel;
  private emotionClassifier: EmotionClassifier;
  private sarcasmDetector: SarcasmDetector;
  private aspectAnalyzer: AspectBasedAnalyzer;
  private temporalTracker: TemporalSentimentTracker;
  private isInitialized = false;

  constructor(config?: {
    sentimentConfig?: Partial<ModelConfig>;
    emotionConfig?: Partial<ModelConfig>;
  }) {
    this.sentimentModel = new BertSentimentModel(config?.sentimentConfig);
    this.emotionClassifier = new EmotionClassifier(config?.emotionConfig);
    this.sarcasmDetector = new SarcasmDetector();
    this.aspectAnalyzer = new AspectBasedAnalyzer(this.sentimentModel);
    this.temporalTracker = new TemporalSentimentTracker();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await Promise.all([
      this.sentimentModel.initialize(),
      this.emotionClassifier.initialize(),
    ]);

    this.isInitialized = true;
    console.log('Sentiment Analyzer initialized successfully');
  }

  async analyze(
    text: string,
    options: AnalysisOptions = {}
  ): Promise<SentimentAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      includeEmotions = true,
      includeAspects = true,
      detectSarcasm = true,
      detectIrony = true,
    } = options;

    // Run sentiment analysis
    const overallSentiment = await this.sentimentModel.analyzeSentiment(text, options);

    // Run emotion classification
    const emotions = includeEmotions
      ? await this.emotionClassifier.classifyEmotions(text)
      : {
          anger: 0,
          fear: 0,
          joy: 0,
          sadness: 0,
          surprise: 0,
          disgust: 0,
          trust: 0,
        };

    // Run aspect-based analysis
    const aspects = includeAspects
      ? await this.aspectAnalyzer.analyzeAspects(text)
      : [];

    // Detect sarcasm and irony
    const sarcasmScore = detectSarcasm
      ? await this.sarcasmDetector.detectSarcasm(text, overallSentiment.compound)
      : 0;

    const ironyScore = detectIrony
      ? await this.sarcasmDetector.detectIrony(text, overallSentiment.compound)
      : 0;

    // Calculate subjectivity (based on emotion intensity)
    const subjectivity = this.calculateSubjectivity(emotions);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(overallSentiment, emotions);

    return {
      text,
      overallSentiment,
      emotions,
      aspects,
      sarcasmScore,
      ironyScore,
      subjectivity,
      confidence,
      timestamp: new Date(),
    };
  }

  async analyzeBatch(
    texts: string[],
    options: AnalysisOptions = {}
  ): Promise<SentimentAnalysisResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Promise.all(texts.map(text => this.analyze(text, options)));
  }

  trackSentiment(entityId: string, text: string, timestamp?: Date): void {
    // This would typically be called after analyze()
    // For now, we'll do a quick analysis
    this.analyze(text).then(result => {
      this.temporalTracker.trackSentiment(entityId, result.overallSentiment, timestamp);
    });
  }

  getTemporalTracker(): TemporalSentimentTracker {
    return this.temporalTracker;
  }

  private calculateSubjectivity(emotions: any): number {
    // Higher emotion scores indicate more subjectivity
    const emotionTotal =
      emotions.anger +
      emotions.fear +
      emotions.joy +
      emotions.sadness +
      emotions.surprise +
      emotions.disgust;

    // Normalize to 0-1 range
    return Math.min(emotionTotal / 3, 1);
  }

  private calculateConfidence(sentiment: any, emotions: any): number {
    // Confidence based on decisiveness of sentiment and emotion scores
    const sentimentMax = Math.max(
      sentiment.positive,
      sentiment.negative,
      sentiment.neutral
    );

    const emotionMax = Math.max(
      emotions.anger,
      emotions.fear,
      emotions.joy,
      emotions.sadness,
      emotions.surprise,
      emotions.disgust,
      emotions.trust
    );

    return (sentimentMax + emotionMax) / 2;
  }

  async dispose(): Promise<void> {
    await Promise.all([
      this.sentimentModel.dispose(),
      this.emotionClassifier.dispose(),
    ]);
    this.isInitialized = false;
  }
}
