import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { SpeechJob } from '../../types.js';

const mockGetInstance = jest.fn();

jest.unstable_mockModule('../../VoiceProvenanceLedger.js', () => ({
  VoiceProvenanceLedger: {
    getInstance: mockGetInstance,
  },
}));

const { Qwen3TTSProvider } = await import('../Qwen3TTSProvider.js');
const { VoiceProvenanceLedger } = await import('../../VoiceProvenanceLedger.js');

describe('Qwen3TTSProvider', () => {
  let provider: InstanceType<typeof Qwen3TTSProvider>;
  let mockLedger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLedger = {
      checkPolicy: jest.fn().mockResolvedValue({ allowed: true }),
      generateManifest: jest.fn().mockReturnValue({
        manifest_id: 'mock-id',
        signature: 'mock-sig'
      })
    };
    (VoiceProvenanceLedger.getInstance as jest.Mock).mockReturnValue(mockLedger);
    provider = new Qwen3TTSProvider();
  });

  it('should generate voice design', async () => {
    const result = await provider.generateVoiceDesign({ description: 'test' }, 'hello');
    expect(result.audio).toBeDefined();
    expect(result.provenance).toBeDefined();
    expect(mockLedger.checkPolicy).toHaveBeenCalled();
  });

  it('should stream speak', async () => {
    const job: SpeechJob = {
      text: ['hello', 'world'],
      tenant_id: 't1',
      voice_ref: 'v1'
    };
    const callbacks = {
      onAudio: jest.fn(),
      onError: jest.fn(),
      onComplete: jest.fn()
    };

    await provider.streamSpeak(job, callbacks);

    expect(callbacks.onAudio).toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });
});
