/**
 * @intelgraph/speech-recognition
 *
 * Speech-to-text recognition with multi-provider support including:
 * - Whisper (OpenAI)
 * - Google Cloud Speech-to-Text
 * - AWS Transcribe
 * - Azure Speech Services
 */

// Export types
export * from './types.js';

// Export interfaces
export * from './interfaces.js';

// Export providers
export * from './providers/index.js';

// Re-export commonly used items
export type {
  STTConfig,
  StreamingRecognitionConfig,
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionWord,
  SpeakerInfo,
  LanguageDetectionResult
} from './types.js';

export {
  STTProvider,
  WhisperModel,
  SUPPORTED_LANGUAGES
} from './types.js';

export type {
  ISTTProvider,
  IStreamingSTTProvider,
  IRecognitionStream,
  ISpeakerDiarizer,
  ILanguageDetector
} from './interfaces.js';

export {
  STTProviderFactory,
  WhisperProvider,
  GoogleSTTProvider,
  AWSTranscribeProvider,
  AzureSTTProvider
} from './providers/index.js';
