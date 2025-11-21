/**
 * @intelgraph/text-to-speech
 *
 * Text-to-speech synthesis with multi-provider support including:
 * - OpenAI TTS
 * - Google Cloud Text-to-Speech
 * - AWS Polly
 * - Azure Speech Services
 * - Eleven Labs
 */

import { z } from 'zod';

/**
 * TTS Provider enum
 */
export enum TTSProvider {
  OPENAI = 'openai',
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
  ELEVENLABS = 'elevenlabs'
}

/**
 * Voice gender
 */
export enum VoiceGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral'
}

/**
 * Audio output format for TTS
 */
export enum TTSOutputFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  OPUS = 'opus',
  FLAC = 'flac',
  PCM = 'pcm'
}

/**
 * Voice information schema
 */
export const VoiceInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.nativeEnum(VoiceGender),
  language: z.string(),
  languageName: z.string().optional(),
  provider: z.nativeEnum(TTSProvider),
  sampleRate: z.number().optional(),
  isNeural: z.boolean().default(true),
  description: z.string().optional(),
  previewUrl: z.string().url().optional()
});

export type VoiceInfo = z.infer<typeof VoiceInfoSchema>;

/**
 * TTS configuration schema
 */
export const TTSConfigSchema = z.object({
  provider: z.nativeEnum(TTSProvider),
  voice: z.string(),
  language: z.string().default('en-US'),
  outputFormat: z.nativeEnum(TTSOutputFormat).default(TTSOutputFormat.MP3),
  sampleRate: z.number().positive().optional(),
  pitch: z.number().min(-20).max(20).default(0).describe('Pitch adjustment in semitones'),
  rate: z.number().min(0.25).max(4.0).default(1.0).describe('Speaking rate'),
  volume: z.number().min(0).max(1).default(1.0),
  ssml: z.boolean().default(false).describe('Input is SSML'),
  emotion: z.string().optional().describe('Emotional style'),
  prosody: z.object({
    pitch: z.string().optional(),
    rate: z.string().optional(),
    volume: z.string().optional()
  }).optional()
});

export type TTSConfig = z.infer<typeof TTSConfigSchema>;

/**
 * TTS result schema
 */
export const TTSResultSchema = z.object({
  audio: z.instanceof(Buffer),
  format: z.nativeEnum(TTSOutputFormat),
  sampleRate: z.number(),
  duration: z.number().describe('Duration in seconds'),
  characterCount: z.number(),
  provider: z.nativeEnum(TTSProvider),
  voice: z.string()
});

export type TTSResult = z.infer<typeof TTSResultSchema>;

/**
 * SSML utilities
 */
export const SSML = {
  /**
   * Wrap text in SSML speak tag
   */
  wrap(text: string, lang?: string): string {
    const langAttr = lang ? ` xml:lang="${lang}"` : '';
    return `<speak${langAttr}>${text}</speak>`;
  },

  /**
   * Add break/pause
   */
  break(time: string): string {
    return `<break time="${time}"/>`;
  },

  /**
   * Add emphasis
   */
  emphasis(text: string, level: 'strong' | 'moderate' | 'reduced' = 'moderate'): string {
    return `<emphasis level="${level}">${text}</emphasis>`;
  },

  /**
   * Add prosody control
   */
  prosody(text: string, opts: { pitch?: string; rate?: string; volume?: string }): string {
    const attrs = Object.entries(opts)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    return `<prosody ${attrs}>${text}</prosody>`;
  },

  /**
   * Say as (date, time, cardinal, ordinal, etc.)
   */
  sayAs(text: string, interpretAs: string, format?: string): string {
    const formatAttr = format ? ` format="${format}"` : '';
    return `<say-as interpret-as="${interpretAs}"${formatAttr}>${text}</say-as>`;
  },

  /**
   * Add phoneme pronunciation
   */
  phoneme(text: string, phonetic: string, alphabet: 'ipa' | 'x-sampa' = 'ipa'): string {
    return `<phoneme alphabet="${alphabet}" ph="${phonetic}">${text}</phoneme>`;
  },

  /**
   * Substitute with alias
   */
  sub(text: string, alias: string): string {
    return `<sub alias="${alias}">${text}</sub>`;
  }
};

/**
 * Interface for TTS providers
 */
export interface ITTSProvider {
  getName(): string;
  synthesize(text: string, config: TTSConfig): Promise<TTSResult>;
  getVoices(language?: string): Promise<VoiceInfo[]>;
  supportsLanguage(language: string): boolean;
  supportsSSML(): boolean;
}

/**
 * Interface for streaming TTS
 */
export interface IStreamingTTSProvider extends ITTSProvider {
  synthesizeStream(text: string, config: TTSConfig): AsyncIterable<Buffer>;
}

/**
 * Interface for voice cloning
 */
export interface IVoiceCloningProvider {
  cloneVoice(name: string, audioSamples: Buffer[]): Promise<string>;
  deleteClonedVoice(voiceId: string): Promise<void>;
  listClonedVoices(): Promise<VoiceInfo[]>;
}

/**
 * Base TTS provider class
 */
export abstract class BaseTTSProvider implements ITTSProvider {
  protected apiKey?: string;

  constructor(config: { apiKey?: string } = {}) {
    this.apiKey = config.apiKey;
  }

  abstract getName(): string;
  abstract synthesize(text: string, config: TTSConfig): Promise<TTSResult>;
  abstract getVoices(language?: string): Promise<VoiceInfo[]>;
  abstract supportsLanguage(language: string): boolean;
  abstract supportsSSML(): boolean;

  protected validateText(text: string, maxLength: number = 5000): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (text.length > maxLength) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }
  }
}

/**
 * OpenAI TTS Provider
 */
export class OpenAITTSProvider extends BaseTTSProvider {
  private endpoint: string;

  constructor(config: { apiKey?: string; endpoint?: string } = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.endpoint = config.endpoint || 'https://api.openai.com/v1/audio/speech';
  }

  getName(): string {
    return 'OpenAI TTS';
  }

  async synthesize(text: string, config: TTSConfig): Promise<TTSResult> {
    this.validateText(text, 4096);

    const axios = (await import('axios')).default;
    const response = await axios.post(
      this.endpoint,
      {
        model: 'tts-1',
        input: text,
        voice: config.voice || 'alloy',
        response_format: config.outputFormat === TTSOutputFormat.MP3 ? 'mp3' : 'opus',
        speed: config.rate
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      audio: Buffer.from(response.data),
      format: config.outputFormat,
      sampleRate: 24000,
      duration: 0, // Would need to calculate from audio
      characterCount: text.length,
      provider: TTSProvider.OPENAI,
      voice: config.voice || 'alloy'
    };
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return [
      { id: 'alloy', name: 'Alloy', gender: VoiceGender.NEUTRAL, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true },
      { id: 'echo', name: 'Echo', gender: VoiceGender.MALE, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true },
      { id: 'fable', name: 'Fable', gender: VoiceGender.NEUTRAL, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true },
      { id: 'onyx', name: 'Onyx', gender: VoiceGender.MALE, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true },
      { id: 'nova', name: 'Nova', gender: VoiceGender.FEMALE, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true },
      { id: 'shimmer', name: 'Shimmer', gender: VoiceGender.FEMALE, language: 'en-US', provider: TTSProvider.OPENAI, isNeural: true }
    ];
  }

  supportsLanguage(language: string): boolean {
    // OpenAI TTS supports multiple languages with automatic detection
    return true;
  }

  supportsSSML(): boolean {
    return false;
  }
}

/**
 * TTS Provider Factory
 */
export class TTSProviderFactory {
  private static providers = new Map<TTSProvider, (config?: Record<string, unknown>) => ITTSProvider>();

  static register(type: TTSProvider, factory: (config?: Record<string, unknown>) => ITTSProvider): void {
    this.providers.set(type, factory);
  }

  static create(type: TTSProvider, config?: Record<string, unknown>): ITTSProvider {
    const factory = this.providers.get(type);
    if (!factory) {
      throw new Error(`TTS Provider ${type} not registered`);
    }
    return factory(config);
  }

  static getAvailableProviders(): TTSProvider[] {
    return Array.from(this.providers.keys());
  }
}

// Auto-register providers
TTSProviderFactory.register(TTSProvider.OPENAI, (config) => new OpenAITTSProvider(config));

// Re-export types for convenience
