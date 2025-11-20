import type { AudioBuffer } from '@intelgraph/audio-processing';
import type {
  STTConfig,
  StreamingRecognitionConfig,
  TranscriptionResult,
  TranscriptionSegment,
  LanguageDetectionResult,
  SpeakerInfo
} from './types.js';

/**
 * Interface for speech-to-text providers
 */
export interface ISTTProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Transcribe audio to text
   */
  transcribe(audio: AudioBuffer, config: STTConfig): Promise<TranscriptionResult>;

  /**
   * Check if language is supported
   */
  supportsLanguage(language: string): boolean;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[];

  /**
   * Get maximum audio duration (in seconds)
   */
  getMaxDuration(): number;
}

/**
 * Interface for streaming STT
 */
export interface IStreamingSTTProvider extends ISTTProvider {
  /**
   * Start streaming recognition session
   */
  startStream(config: StreamingRecognitionConfig): Promise<IRecognitionStream>;
}

/**
 * Interface for recognition stream
 */
export interface IRecognitionStream {
  /**
   * Write audio data to stream
   */
  write(chunk: Buffer | Uint8Array): Promise<void>;

  /**
   * End the stream
   */
  end(): Promise<void>;

  /**
   * Listen for interim results
   */
  onInterimResult(callback: (result: TranscriptionSegment) => void): void;

  /**
   * Listen for final results
   */
  onFinalResult(callback: (result: TranscriptionSegment) => void): void;

  /**
   * Listen for errors
   */
  onError(callback: (error: Error) => void): void;

  /**
   * Listen for stream end
   */
  onEnd(callback: () => void): void;
}

/**
 * Interface for speaker diarization
 */
export interface ISpeakerDiarizer {
  /**
   * Perform speaker diarization
   */
  diarize(audio: AudioBuffer, maxSpeakers?: number): Promise<DiarizationResult>;

  /**
   * Identify speakers in audio
   */
  identifySpeakers(audio: AudioBuffer, knownSpeakers?: SpeakerProfile[]): Promise<SpeakerIdentification[]>;
}

export interface DiarizationResult {
  speakers: SpeakerInfo[];
  segments: Array<{
    startTime: number;
    endTime: number;
    speaker: SpeakerInfo;
  }>;
}

export interface SpeakerProfile {
  speakerId: string;
  speakerName: string;
  voiceprint: number[];
  metadata?: Record<string, unknown>;
}

export interface SpeakerIdentification {
  startTime: number;
  endTime: number;
  speaker: SpeakerProfile;
  confidence: number;
}

/**
 * Interface for language detection
 */
export interface ILanguageDetector {
  /**
   * Detect language from audio
   */
  detectLanguage(audio: AudioBuffer, topN?: number): Promise<LanguageDetectionResult>;

  /**
   * Detect multiple languages in audio
   */
  detectMultipleLanguages(audio: AudioBuffer): Promise<LanguageDetectionResult[]>;
}

/**
 * Interface for custom vocabulary
 */
export interface ICustomVocabulary {
  /**
   * Add words to vocabulary
   */
  addWords(words: string[]): Promise<void>;

  /**
   * Remove words from vocabulary
   */
  removeWords(words: string[]): Promise<void>;

  /**
   * Get all words in vocabulary
   */
  getWords(): Promise<string[]>;

  /**
   * Clear vocabulary
   */
  clear(): Promise<void>;
}

/**
 * Interface for transcription post-processing
 */
export interface ITranscriptionPostProcessor {
  /**
   * Process transcription
   */
  process(result: TranscriptionResult): Promise<TranscriptionResult>;
}

/**
 * Interface for punctuation restoration
 */
export interface IPunctuationRestorer extends ITranscriptionPostProcessor {
  /**
   * Restore punctuation in text
   */
  restorePunctuation(text: string): Promise<string>;
}

/**
 * Interface for text formatting
 */
export interface ITextFormatter extends ITranscriptionPostProcessor {
  /**
   * Format transcription text
   */
  format(text: string): Promise<string>;
}

/**
 * Interface for keyword spotting
 */
export interface IKeywordSpotter {
  /**
   * Spot keywords in transcription
   */
  spotKeywords(
    result: TranscriptionResult,
    keywords: string[]
  ): Promise<KeywordMatch[]>;
}

export interface KeywordMatch {
  keyword: string;
  matches: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    context: string;
  }>;
}

/**
 * Interface for transcription cache
 */
export interface ITranscriptionCache {
  /**
   * Get cached transcription
   */
  get(audioHash: string): Promise<TranscriptionResult | null>;

  /**
   * Set transcription cache
   */
  set(audioHash: string, result: TranscriptionResult, ttl?: number): Promise<void>;

  /**
   * Delete cached transcription
   */
  delete(audioHash: string): Promise<void>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;
}
