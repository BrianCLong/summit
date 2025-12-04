export interface EmotionScores {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  [key: string]: number;
}

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface AudioFeatures {
  rms: number;
  zcr: number; // Zero Crossing Rate
  pitch: number; // Simulated or estimated
  spectralCentroid: number; // Simulated
  duration: number;
}

export interface AudioAnalysisResult {
  timestamp: number;
  duration: number;
  features: AudioFeatures;
  emotions: EmotionScores;
  sentiment: SentimentResult;
  speakerId?: string;
}

export interface VisualAnalysisResult {
  timestamp: number;
  faces: Array<{
    box: { x: number; y: number; w: number; h: number };
    emotions: EmotionScores;
    identity?: string;
  }>;
  scene: {
    label: string;
    sentiment: SentimentResult;
  };
  bodyLanguage?: {
    posture: string; // e.g., "open", "closed", "aggressive"
    arousal: number;
  };
}

export interface TextAnalysisResult {
  timestamp: number;
  content: string;
  sentiment: SentimentResult;
  emotions: EmotionScores;
  entities: string[];
}

export interface MultimodalFusionResult {
  timestamp: number;
  duration: number;
  primaryEmotion: string;
  emotions: EmotionScores;
  sentiment: SentimentResult;
  modalities: {
    audio?: AudioAnalysisResult;
    visual?: VisualAnalysisResult;
    text?: TextAnalysisResult;
  };
  coherence: number; // How well modalities agree
}
