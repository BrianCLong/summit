import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Mock ffmpeg and fs/promises
const ffmpegMock = Object.assign(jest.fn(), {
  ffprobe: jest.fn(),
  setFfmpegPath: jest.fn(),
  setFfprobePath: jest.fn(),
});

jest.unstable_mockModule('fluent-ffmpeg', () => ({
  __esModule: true,
  default: ffmpegMock,
}));

const fsMock = {
  mkdir: jest.fn(),
  rm: jest.fn(),
};

jest.unstable_mockModule('fs/promises', () => ({
  __esModule: true,
  default: fsMock,
  ...fsMock,
}));

describe('VideoFrameExtractor', () => {
  let VideoFrameExtractor: typeof import('../VideoFrameExtractor').VideoFrameExtractor;
  let extractor: InstanceType<typeof VideoFrameExtractor>;
  let ffmpeg: typeof ffmpegMock;
  let fs: typeof fsMock;
  const mockFfmpegPath = '/usr/bin/ffmpeg';
  const mockFfprobePath = '/usr/bin/ffprobe';
  const mockTempDir = '/tmp/test-temp';
  const mockVideoPath = '/path/to/test-video.mp4';

  beforeAll(async () => {
    ({ VideoFrameExtractor } = await import('../VideoFrameExtractor'));
    ffmpeg = (await import('fluent-ffmpeg')).default as typeof ffmpegMock;
    fs = (await import('fs/promises')).default as typeof fsMock;
  });

  beforeEach(() => {
    extractor = new VideoFrameExtractor(
      mockFfmpegPath,
      mockFfprobePath,
      mockTempDir,
    );
    // Reset mocks
    ffmpeg.mockClear();
    (ffmpeg.ffprobe as jest.Mock).mockClear();
    (fs.mkdir as jest.Mock).mockClear();
    (fs.rm as jest.Mock).mockClear();

    // Mock ffmpeg chainable methods
    ffmpeg.mockImplementation(() => {
      const command: any = {
        seekInput: jest.fn().mockReturnThis(),
        duration: jest.fn().mockReturnThis(),
        fps: jest.fn().mockReturnThis(),
        addOption: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        noVideo: jest.fn().mockReturnThis(),
        audioCodec: jest.fn().mockReturnThis(),
        run: jest.fn(),
      };
      command.on = jest.fn((event, callback) => {
        if (event === 'end') {
          // Simulate successful end
          (callback as any)();
        } else if (event === 'filenames') {
          // Simulate filenames being emitted
          (callback as any)(['frame-0.000.png', 'frame-1.000.png']);
        }
        return command;
      });
      return command;
    });

    // Mock ffprobe
    (ffmpeg.ffprobe as jest.Mock).mockImplementation((_path, callback) => {
      (callback as any)(null, { format: { duration: 10 } }); // Mock video duration
    });
  });

  it('should extract frames with default options', async () => {
    const { frames, audio } = await extractor.extract(mockVideoPath);

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(mockTempDir),
      { recursive: true },
    );
    expect(ffmpeg).toHaveBeenCalledWith(mockVideoPath);
    expect(ffmpeg.mock.results[0].value.fps).toHaveBeenCalledWith(1); // Default fps
    expect(ffmpeg.mock.results[0].value.output).toHaveBeenCalledWith(
      expect.stringContaining('frame-%s.png'),
    );
    expect(ffmpeg.mock.results[0].value.run).toHaveBeenCalled();
    expect(frames.length).toBe(2);
    expect(frames[0].framePath).toContain('frame-0.000.png');
    expect(frames[1].framePath).toContain('frame-1.000.png');
    expect(audio).toBeUndefined();
  });

  it('should extract frames with specified frameRate', async () => {
    await extractor.extract(mockVideoPath, { frameRate: 5 });
    expect((ffmpeg as any).mock.results[0].value.fps).toHaveBeenCalledWith(5);
  });

  it('should extract frames with specified interval', async () => {
    await extractor.extract(mockVideoPath, { interval: 2 });
    expect(
      (ffmpeg as any).mock.results[0].value.addOption,
    ).toHaveBeenCalledWith('-vf', 'fps=1/2');
  });

  it('should extract audio when extractAudio is true', async () => {
    const { audio } = await extractor.extract(mockVideoPath, {
      extractAudio: true,
    });
    expect(audio).toBeDefined();
    expect(audio?.audioPath).toContain('audio-');
    expect(audio?.audioPath).toContain('.mp3');
    expect(audio?.duration).toBe(10);
    expect(ffmpeg.mock.results[1].value.noVideo).toHaveBeenCalled(); // Second ffmpeg call for audio
    expect(
      ffmpeg.mock.results[1].value.audioCodec,
    ).toHaveBeenCalledWith('libmp3lame');
  });

  it('should clean up temporary directory', async () => {
    const tempDirToClean = '/tmp/some-temp-dir';
    await extractor.cleanup(tempDirToClean);
    expect(fs.rm).toHaveBeenCalledWith(tempDirToClean, {
      recursive: true,
      force: true,
    });
  });

  it('should handle ffmpeg errors during frame extraction', async () => {
    ffmpeg.mockImplementationOnce(() => {
      const command: any = {
        seekInput: jest.fn().mockReturnThis(),
        duration: jest.fn().mockReturnThis(),
        fps: jest.fn().mockReturnThis(),
        addOption: jest.fn().mockReturnThis(),
        output: jest.fn().mockReturnThis(),
        run: jest.fn(),
      };
      command.on = jest.fn((event, callback) => {
        if (event === 'error') {
          (callback as any)(new Error('ffmpeg test error'));
        }
        return command;
      });
      return command;
    });

    await expect(extractor.extract(mockVideoPath)).rejects.toThrow(
      'ffmpeg test error',
    );
  });
});
