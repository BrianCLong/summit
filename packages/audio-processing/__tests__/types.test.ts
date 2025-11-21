import {
  AudioMetadataSchema,
  AudioStreamConfigSchema,
  AudioProcessingJobSchema,
  AudioEnhancementOptionsSchema,
  AudioFormat,
  AudioCodec,
  SampleRate,
  ChannelConfig,
  JobStatus,
  AudioProcessingError,
  AudioFormatError,
  AudioStreamError
} from '../src/types.js';

describe('Audio Types', () => {
  describe('AudioMetadataSchema', () => {
    it('should validate correct metadata', () => {
      const metadata = {
        duration: 60,
        sampleRate: 44100,
        channels: 2,
        bitDepth: 16,
        codec: AudioCodec.PCM,
        format: AudioFormat.WAV
      };
      const result = AudioMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should reject invalid duration', () => {
      const metadata = {
        duration: -1,
        sampleRate: 44100,
        channels: 2,
        codec: AudioCodec.PCM,
        format: AudioFormat.WAV
      };
      const result = AudioMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it('should reject invalid sample rate', () => {
      const metadata = {
        duration: 60,
        sampleRate: 0,
        channels: 2,
        codec: AudioCodec.PCM,
        format: AudioFormat.WAV
      };
      const result = AudioMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });
  });

  describe('AudioStreamConfigSchema', () => {
    it('should validate correct config', () => {
      const config = {
        sampleRate: SampleRate.Hz44100,
        channels: ChannelConfig.STEREO,
        codec: AudioCodec.OPUS
      };
      const result = AudioStreamConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('AudioProcessingJobSchema', () => {
    it('should validate correct job', () => {
      const job = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'transcription',
        status: JobStatus.PENDING,
        audioSource: 'https://example.com/audio.wav',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = AudioProcessingJobSchema.safeParse(job);
      expect(result.success).toBe(true);
    });
  });

  describe('AudioEnhancementOptionsSchema', () => {
    it('should use defaults when options not provided', () => {
      const options = {};
      const result = AudioEnhancementOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.noiseReduction).toBe(false);
        expect(result.data.noiseReductionLevel).toBe(0.5);
      }
    });

    it('should accept valid enhancement options', () => {
      const options = {
        noiseReduction: true,
        noiseReductionLevel: 0.8,
        echoCancellation: true,
        normalization: true,
        targetLoudness: -14
      };
      const result = AudioEnhancementOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);
    });

    it('should reject invalid noise reduction level', () => {
      const options = {
        noiseReductionLevel: 2.0 // > 1
      };
      const result = AudioEnhancementOptionsSchema.safeParse(options);
      expect(result.success).toBe(false);
    });
  });

  describe('Enums', () => {
    it('should have correct AudioFormat values', () => {
      expect(AudioFormat.WAV).toBe('wav');
      expect(AudioFormat.MP3).toBe('mp3');
      expect(AudioFormat.FLAC).toBe('flac');
    });

    it('should have correct AudioCodec values', () => {
      expect(AudioCodec.PCM).toBe('pcm');
      expect(AudioCodec.OPUS).toBe('opus');
    });

    it('should have correct SampleRate values', () => {
      expect(SampleRate.Hz16000).toBe(16000);
      expect(SampleRate.Hz44100).toBe(44100);
      expect(SampleRate.Hz48000).toBe(48000);
    });

    it('should have correct JobStatus values', () => {
      expect(JobStatus.PENDING).toBe('pending');
      expect(JobStatus.PROCESSING).toBe('processing');
      expect(JobStatus.COMPLETED).toBe('completed');
      expect(JobStatus.FAILED).toBe('failed');
    });
  });

  describe('Error classes', () => {
    it('should create AudioProcessingError with correct properties', () => {
      const error = new AudioProcessingError('Test error', 'TEST_CODE', { detail: 'info' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('AudioProcessingError');
    });

    it('should create AudioFormatError with correct code', () => {
      const error = new AudioFormatError('Format error');
      expect(error.code).toBe('AUDIO_FORMAT_ERROR');
      expect(error.name).toBe('AudioFormatError');
    });

    it('should create AudioStreamError with correct code', () => {
      const error = new AudioStreamError('Stream error');
      expect(error.code).toBe('AUDIO_STREAM_ERROR');
      expect(error.name).toBe('AudioStreamError');
    });
  });
});
