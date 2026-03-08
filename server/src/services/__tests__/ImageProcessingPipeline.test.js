"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const ImageProcessingPipeline_js_1 = require("../ImageProcessingPipeline.js");
(0, globals_1.describe)('ImageProcessingPipeline', () => {
    (0, globals_1.it)('optimizes, converts, and watermarks images with hooks', async () => {
        const tmpDir = await fs_1.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'img-pipeline-'));
        const uploadPath = path_1.default.join(tmpDir, 'uploads');
        const thumbnailPath = path_1.default.join(tmpDir, 'thumbnails');
        await fs_1.promises.mkdir(uploadPath, { recursive: true });
        const sourcePath = path_1.default.join(uploadPath, 'sample.png');
        await (0, sharp_1.default)({
            create: {
                width: 640,
                height: 480,
                channels: 3,
                background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
        })
            .png()
            .toFile(sourcePath);
        const facialRecognitionHook = globals_1.jest.fn().mockResolvedValue({
            faces: [
                {
                    boundingBox: { x: 10, y: 10, width: 50, height: 50 },
                    confidence: 0.99,
                },
            ],
            modelVersion: 'unit-test-model',
        });
        const pipeline = new ImageProcessingPipeline_js_1.ImageProcessingPipeline(uploadPath, thumbnailPath, {
            thumbnails: [
                { width: 160, height: 160, postfix: 'sm', format: 'jpeg', quality: 70 },
            ],
            conversions: [{ format: 'webp', quality: 75, suffix: 'web' }],
            optimization: { quality: 80, progressive: true, normalize: true },
            watermark: { text: 'demo', opacity: 0.2 },
            facialRecognitionHook,
        });
        const result = await pipeline.processImage(sourcePath, 'image/png', 'sample');
        (0, globals_1.expect)(result.optimizedPath).toBe(sourcePath);
        (0, globals_1.expect)(result.thumbnails).toHaveLength(1);
        (0, globals_1.expect)(result.conversions[0].format).toBe('webp');
        await (0, globals_1.expect)(fileExists(result.thumbnails[0].path)).resolves.toBe(true);
        await (0, globals_1.expect)(fileExists(result.conversions[0].path)).resolves.toBe(true);
        (0, globals_1.expect)(result.facialRecognition?.faces).toHaveLength(1);
        (0, globals_1.expect)(facialRecognitionHook).toHaveBeenCalled();
    });
});
async function fileExists(target) {
    try {
        await fs_1.promises.access(target);
        return true;
    }
    catch (error) {
        return false;
    }
}
