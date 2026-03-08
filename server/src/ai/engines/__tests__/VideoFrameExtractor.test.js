"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock ffmpeg and fs/promises
const ffmpegMock = Object.assign(globals_1.jest.fn(), {
    ffprobe: globals_1.jest.fn(),
    setFfmpegPath: globals_1.jest.fn(),
    setFfprobePath: globals_1.jest.fn(),
});
globals_1.jest.unstable_mockModule('fluent-ffmpeg', () => ({
    __esModule: true,
    default: ffmpegMock,
}));
const fsMock = {
    mkdir: globals_1.jest.fn(),
    rm: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('fs/promises', () => ({
    __esModule: true,
    default: fsMock,
    ...fsMock,
}));
(0, globals_1.describe)('VideoFrameExtractor', () => {
    let VideoFrameExtractor;
    let extractor;
    let ffmpeg;
    let fs;
    const mockFfmpegPath = '/usr/bin/ffmpeg';
    const mockFfprobePath = '/usr/bin/ffprobe';
    const mockTempDir = '/tmp/test-temp';
    const mockVideoPath = '/path/to/test-video.mp4';
    (0, globals_1.beforeAll)(async () => {
        ({ VideoFrameExtractor } = await Promise.resolve().then(() => __importStar(require('../VideoFrameExtractor.js'))));
        ffmpeg = (await Promise.resolve().then(() => __importStar(require('fluent-ffmpeg')))).default;
        fs = (await Promise.resolve().then(() => __importStar(require('fs/promises')))).default;
    });
    (0, globals_1.beforeEach)(() => {
        extractor = new VideoFrameExtractor(mockFfmpegPath, mockFfprobePath, mockTempDir);
        // Reset mocks
        ffmpeg.mockClear();
        ffmpeg.ffprobe.mockClear();
        fs.mkdir.mockClear();
        fs.rm.mockClear();
        // Mock ffmpeg chainable methods
        ffmpeg.mockImplementation(() => {
            const command = {
                seekInput: globals_1.jest.fn().mockReturnThis(),
                duration: globals_1.jest.fn().mockReturnThis(),
                fps: globals_1.jest.fn().mockReturnThis(),
                addOption: globals_1.jest.fn().mockReturnThis(),
                output: globals_1.jest.fn().mockReturnThis(),
                noVideo: globals_1.jest.fn().mockReturnThis(),
                audioCodec: globals_1.jest.fn().mockReturnThis(),
                run: globals_1.jest.fn(),
            };
            command.on = globals_1.jest.fn((event, callback) => {
                if (event === 'end') {
                    // Simulate successful end
                    callback();
                }
                else if (event === 'filenames') {
                    // Simulate filenames being emitted
                    callback(['frame-0.000.png', 'frame-1.000.png']);
                }
                return command;
            });
            return command;
        });
        // Mock ffprobe
        ffmpeg.ffprobe.mockImplementation((_path, callback) => {
            callback(null, { format: { duration: 10 } }); // Mock video duration
        });
    });
    (0, globals_1.it)('should extract frames with default options', async () => {
        const { frames, audio } = await extractor.extract(mockVideoPath);
        (0, globals_1.expect)(fs.mkdir).toHaveBeenCalledWith(globals_1.expect.stringContaining(mockTempDir), { recursive: true });
        (0, globals_1.expect)(ffmpeg).toHaveBeenCalledWith(mockVideoPath);
        (0, globals_1.expect)(ffmpeg.mock.results[0].value.fps).toHaveBeenCalledWith(1); // Default fps
        (0, globals_1.expect)(ffmpeg.mock.results[0].value.output).toHaveBeenCalledWith(globals_1.expect.stringContaining('frame-%s.png'));
        (0, globals_1.expect)(ffmpeg.mock.results[0].value.run).toHaveBeenCalled();
        (0, globals_1.expect)(frames.length).toBe(2);
        (0, globals_1.expect)(frames[0].framePath).toContain('frame-0.000.png');
        (0, globals_1.expect)(frames[1].framePath).toContain('frame-1.000.png');
        (0, globals_1.expect)(audio).toBeUndefined();
    });
    (0, globals_1.it)('should extract frames with specified frameRate', async () => {
        await extractor.extract(mockVideoPath, { frameRate: 5 });
        (0, globals_1.expect)(ffmpeg.mock.results[0].value.fps).toHaveBeenCalledWith(5);
    });
    (0, globals_1.it)('should extract frames with specified interval', async () => {
        await extractor.extract(mockVideoPath, { interval: 2 });
        (0, globals_1.expect)(ffmpeg.mock.results[0].value.addOption).toHaveBeenCalledWith('-vf', 'fps=1/2');
    });
    (0, globals_1.it)('should extract audio when extractAudio is true', async () => {
        const { audio } = await extractor.extract(mockVideoPath, {
            extractAudio: true,
        });
        (0, globals_1.expect)(audio).toBeDefined();
        (0, globals_1.expect)(audio?.audioPath).toContain('audio-');
        (0, globals_1.expect)(audio?.audioPath).toContain('.mp3');
        (0, globals_1.expect)(audio?.duration).toBe(10);
        (0, globals_1.expect)(ffmpeg.mock.results[1].value.noVideo).toHaveBeenCalled(); // Second ffmpeg call for audio
        (0, globals_1.expect)(ffmpeg.mock.results[1].value.audioCodec).toHaveBeenCalledWith('libmp3lame');
    });
    (0, globals_1.it)('should clean up temporary directory', async () => {
        const tempDirToClean = '/tmp/some-temp-dir';
        await extractor.cleanup(tempDirToClean);
        (0, globals_1.expect)(fs.rm).toHaveBeenCalledWith(tempDirToClean, {
            recursive: true,
            force: true,
        });
    });
    (0, globals_1.it)('should handle ffmpeg errors during frame extraction', async () => {
        ffmpeg.mockImplementationOnce(() => {
            const command = {
                seekInput: globals_1.jest.fn().mockReturnThis(),
                duration: globals_1.jest.fn().mockReturnThis(),
                fps: globals_1.jest.fn().mockReturnThis(),
                addOption: globals_1.jest.fn().mockReturnThis(),
                output: globals_1.jest.fn().mockReturnThis(),
                run: globals_1.jest.fn(),
            };
            command.on = globals_1.jest.fn((event, callback) => {
                if (event === 'error') {
                    callback(new Error('ffmpeg test error'));
                }
                return command;
            });
            return command;
        });
        await (0, globals_1.expect)(extractor.extract(mockVideoPath)).rejects.toThrow('ffmpeg test error');
    });
});
