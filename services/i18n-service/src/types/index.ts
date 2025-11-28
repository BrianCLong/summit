/**
 * Language code (ISO 639-1)
 */
export type LanguageCode = string;

/**
 * Locale code (language-REGION, e.g., en-US)
 */
export type LocaleCode = string;

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  /** Detected language code (ISO 639-1) */
  language: LanguageCode;
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative languages with confidence scores */
  alternatives?: Array<{
    language: LanguageCode;
    confidence: number;
  }>;
  /** Detected locale if available */
  locale?: LocaleCode;
}

/**
 * Translation policy constraints
 */
export interface TranslationPolicy {
  /** Whether translation is allowed */
  allowTranslation: boolean;
  /** Allowed target languages (empty = all allowed) */
  allowedTargetLanguages?: LanguageCode[];
  /** Forbidden target languages */
  forbiddenTargetLanguages?: LanguageCode[];
  /** Whether cross-border data transfer is allowed */
  allowCrossBorderTransfer?: boolean;
  /** Classification tags that affect translation */
  classificationTags?: string[];
  /** Reason for policy (for logging/audit) */
  reason?: string;
}

/**
 * Translation context with policy
 */
export interface TranslationContext {
  /** Source language (auto-detected if not provided) */
  sourceLanguage?: LanguageCode;
  /** Target language */
  targetLanguage: LanguageCode;
  /** Policy constraints */
  policy?: TranslationPolicy;
  /** Entity/document ID for audit trail */
  entityId?: string;
  /** User ID requesting translation */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Translation result
 */
export interface TranslationResult {
  /** Translated text */
  translatedText: string;
  /** Source language (detected or provided) */
  sourceLanguage: LanguageCode;
  /** Target language */
  targetLanguage: LanguageCode;
  /** Whether translation was performed or text returned as-is */
  wasTranslated: boolean;
  /** Policy check result */
  policyResult: {
    allowed: boolean;
    reason?: string;
  };
  /** Confidence score if available */
  confidence?: number;
  /** Provider used (google, deepl, local, etc.) */
  provider?: string;
}

/**
 * Translation service configuration
 */
export interface TranslationServiceConfig {
  /** Default provider */
  defaultProvider: 'google' | 'deepl' | 'local' | 'mock';
  /** Google Cloud Translation API key */
  googleApiKey?: string;
  /** DeepL API key */
  deeplApiKey?: string;
  /** Default source language */
  defaultSourceLanguage?: LanguageCode;
  /** Supported languages */
  supportedLanguages: LanguageCode[];
  /** Enable caching */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Maximum text length */
  maxTextLength?: number;
}

/**
 * Language detection service configuration
 */
export interface LanguageDetectionConfig {
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Default language if detection fails */
  defaultLanguage?: LanguageCode;
  /** Minimum text length for reliable detection */
  minTextLength?: number;
  /** Return alternative languages */
  returnAlternatives?: boolean;
}

/**
 * Translation error types
 */
export enum TranslationErrorCode {
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
  TEXT_TOO_LONG = 'TEXT_TOO_LONG',
  DETECTION_FAILED = 'DETECTION_FAILED',
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Translation error
 */
export class TranslationError extends Error {
  constructor(
    public code: TranslationErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

/**
 * Translation metrics for instrumentation
 */
export interface TranslationMetrics {
  /** Total translations requested */
  totalRequests: number;
  /** Successful translations */
  successfulTranslations: number;
  /** Failed translations */
  failedTranslations: number;
  /** Policy violations */
  policyViolations: number;
  /** Language pairs (source-target) usage */
  languagePairs: Map<string, number>;
  /** Provider usage */
  providerUsage: Map<string, number>;
  /** Average confidence scores */
  averageConfidence: number;
}

/**
 * Batch translation request
 */
export interface BatchTranslationRequest {
  /** Texts to translate */
  texts: string[];
  /** Translation context */
  context: TranslationContext;
}

/**
 * Batch translation result
 */
export interface BatchTranslationResult {
  /** Results for each text */
  results: TranslationResult[];
  /** Overall success status */
  success: boolean;
  /** Error details if any */
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
