import {
  calculateDuration,
  secondsToSamples,
  samplesToSeconds,
  calculateRMS,
  rmsToDb,
  detectClipping,
  splitIntoChunks,
  mergeChunks,
  normalizeAudio,
  stereoToMono,
  formatBytes,
  formatDuration,
  createChecksum,
  verifyChecksum
} from '../src/utils.js';

describe('Audio Utils', () => {
  describe('calculateDuration', () => {
    it('should calculate duration correctly for mono audio', () => {
      const duration = calculateDuration(44100, 44100, 1);
      expect(duration).toBe(1);
    });

    it('should calculate duration correctly for stereo audio', () => {
      const duration = calculateDuration(88200, 44100, 2);
      expect(duration).toBe(1);
    });
  });

  describe('secondsToSamples', () => {
    it('should convert seconds to samples correctly', () => {
      const samples = secondsToSamples(1, 44100, 1);
      expect(samples).toBe(44100);
    });

    it('should handle stereo audio', () => {
      const samples = secondsToSamples(1, 44100, 2);
      expect(samples).toBe(88200);
    });
  });

  describe('samplesToSeconds', () => {
    it('should convert samples to seconds correctly', () => {
      const seconds = samplesToSeconds(44100, 44100, 1);
      expect(seconds).toBe(1);
    });
  });

  describe('calculateRMS', () => {
    it('should calculate RMS of zero signal', () => {
      const buffer = new Float32Array([0, 0, 0, 0]);
      expect(calculateRMS(buffer)).toBe(0);
    });

    it('should calculate RMS of sine wave', () => {
      const buffer = new Float32Array([1, -1, 1, -1]);
      expect(calculateRMS(buffer)).toBe(1);
    });

    it('should calculate RMS of half amplitude signal', () => {
      const buffer = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      expect(calculateRMS(buffer)).toBe(0.5);
    });
  });

  describe('rmsToDb', () => {
    it('should convert RMS 1 to 0 dB', () => {
      expect(rmsToDb(1)).toBe(0);
    });

    it('should convert RMS 0.5 to approximately -6 dB', () => {
      const db = rmsToDb(0.5);
      expect(db).toBeCloseTo(-6.02, 1);
    });
  });

  describe('detectClipping', () => {
    it('should detect no clipping in normal audio', () => {
      const buffer = new Float32Array([0.5, -0.5, 0.3, -0.3]);
      expect(detectClipping(buffer)).toBe(0);
    });

    it('should detect clipping at threshold', () => {
      const buffer = new Float32Array([1.0, 0.5, 1.0, 0.5]);
      expect(detectClipping(buffer)).toBe(0.5);
    });
  });

  describe('normalizeAudio', () => {
    it('should normalize audio to peak 1.0', () => {
      const buffer = new Float32Array([0.5, -0.25, 0.25, -0.5]);
      const normalized = normalizeAudio(buffer);
      expect(Math.max(...Array.from(normalized).map(Math.abs))).toBe(1);
    });

    it('should handle zero signal', () => {
      const buffer = new Float32Array([0, 0, 0, 0]);
      const normalized = normalizeAudio(buffer);
      expect(normalized).toEqual(buffer);
    });
  });

  describe('stereoToMono', () => {
    it('should average left and right channels', () => {
      const left = new Float32Array([1, 0, 0.5]);
      const right = new Float32Array([0, 1, 0.5]);
      const mono = stereoToMono(left, right);
      expect(mono[0]).toBe(0.5);
      expect(mono[1]).toBe(0.5);
      expect(mono[2]).toBe(0.5);
    });
  });

  describe('splitIntoChunks', () => {
    it('should split buffer into chunks', () => {
      const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
      const chunks = splitIntoChunks(buffer, 2);
      expect(chunks.length).toBe(3);
      expect(chunks[0]).toEqual(Buffer.from([1, 2]));
    });

    it('should handle overlap', () => {
      const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
      const chunks = splitIntoChunks(buffer, 4, 2);
      expect(chunks.length).toBe(2);
    });
  });

  describe('mergeChunks', () => {
    it('should merge chunks into single buffer', () => {
      const chunks = [Buffer.from([1, 2]), Buffer.from([3, 4])];
      const merged = mergeChunks(chunks);
      expect(merged).toEqual(Buffer.from([1, 2, 3, 4]));
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3661)).toBe('1h 1m 1s');
    });
  });

  describe('createChecksum', () => {
    it('should create SHA256 checksum', async () => {
      const data = Buffer.from('test data');
      const checksum = await createChecksum(data, 'sha256');
      expect(checksum).toHaveLength(64);
    });

    it('should create MD5 checksum', async () => {
      const data = Buffer.from('test data');
      const checksum = await createChecksum(data, 'md5');
      expect(checksum).toHaveLength(32);
    });
  });

  describe('verifyChecksum', () => {
    it('should verify correct checksum', async () => {
      const data = Buffer.from('test data');
      const checksum = await createChecksum(data, 'sha256');
      const isValid = await verifyChecksum(data, checksum, 'sha256');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect checksum', async () => {
      const data = Buffer.from('test data');
      const isValid = await verifyChecksum(data, 'wrongchecksum', 'sha256');
      expect(isValid).toBe(false);
    });
  });
});
