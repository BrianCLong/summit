/**
 * @intelgraph/sentiment-analysis
 * AI-powered sentiment analysis with BERT/RoBERTa for intelligence operations
 */

export { SentimentAnalyzer } from './core/SentimentAnalyzer.js';
export { BertSentimentModel } from './models/BertSentimentModel.js';
export { EmotionClassifier } from './models/EmotionClassifier.js';
export { SarcasmDetector } from './analyzers/SarcasmDetector.js';
export { AspectBasedAnalyzer } from './analyzers/AspectBasedAnalyzer.js';
export { TemporalSentimentTracker } from './analyzers/TemporalSentimentTracker.js';

export type {
  SentimentScore,
  EmotionScore,
  AspectSentiment,
  SentimentAnalysisResult,
  MultiModalSentiment,
  ImageSentimentResult,
  VideoSentimentResult,
  AudioSentimentResult,
  AcousticFeatures,
  SentimentTimeSeries,
  TimeSeriesEvent,
  ModelConfig,
  AnalysisOptions,
} from './core/types.js';
