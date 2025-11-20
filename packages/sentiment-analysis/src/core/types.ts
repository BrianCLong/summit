/**
 * Core types for sentiment analysis system
 */

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  compound: number;
}

export interface EmotionScore {
  anger: number;
  fear: number;
  joy: number;
  sadness: number;
  surprise: number;
  disgust: number;
  trust: number;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentScore;
  confidence: number;
  mentions: number;
}

export interface SentimentAnalysisResult {
  text: string;
  overallSentiment: SentimentScore;
  emotions: EmotionScore;
  aspects: AspectSentiment[];
  sarcasmScore: number;
  ironyScore: number;
  subjectivity: number;
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MultiModalSentiment {
  textSentiment?: SentimentAnalysisResult;
  imageSentiment?: ImageSentimentResult;
  videoSentiment?: VideoSentimentResult;
  audioSentiment?: AudioSentimentResult;
  crossModalConsistency: number;
  overallSentiment: SentimentScore;
}

export interface ImageSentimentResult {
  sentiment: SentimentScore;
  emotions: EmotionScore;
  visualFeatures: string[];
  confidence: number;
}

export interface VideoSentimentResult {
  frameSentiments: ImageSentimentResult[];
  temporalPattern: SentimentTimeSeries;
  overallSentiment: SentimentScore;
}

export interface AudioSentimentResult {
  transcription: string;
  textSentiment: SentimentAnalysisResult;
  acousticFeatures: AcousticFeatures;
  overallSentiment: SentimentScore;
}

export interface AcousticFeatures {
  pitch: number;
  energy: number;
  speakingRate: number;
  stressLevel: number;
}

export interface SentimentTimeSeries {
  timestamps: Date[];
  sentiments: SentimentScore[];
  events: TimeSeriesEvent[];
  trend: 'positive' | 'negative' | 'neutral' | 'volatile';
  momentum: number;
}

export interface TimeSeriesEvent {
  timestamp: Date;
  type: 'shift' | 'spike' | 'anomaly';
  magnitude: number;
  description: string;
}

export interface ModelConfig {
  modelName: string;
  modelPath?: string;
  maxLength: number;
  batchSize: number;
  device: 'cpu' | 'cuda' | 'mps';
  quantize?: boolean;
}

export interface AnalysisOptions {
  includeEmotions?: boolean;
  includeAspects?: boolean;
  detectSarcasm?: boolean;
  detectIrony?: boolean;
  language?: string;
  domainSpecific?: boolean;
}
