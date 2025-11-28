import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import {
  ImageProcessingPipeline,
} from '../ImageProcessingPipeline.js';

describe('ImageProcessingPipeline', () => {
  it('optimizes, converts, and watermarks images with hooks', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'img-pipeline-'));
    const uploadPath = path.join(tmpDir, 'uploads');
    const thumbnailPath = path.join(tmpDir, 'thumbnails');
    await fs.mkdir(uploadPath, { recursive: true });

    const sourcePath = path.join(uploadPath, 'sample.png');
    await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    const facialRecognitionHook = jest.fn().mockResolvedValue({
      faces: [
        {
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          confidence: 0.99,
        },
      ],
      modelVersion: 'unit-test-model',
    });

    const pipeline = new ImageProcessingPipeline(uploadPath, thumbnailPath, {
      thumbnails: [
        { width: 160, height: 160, postfix: 'sm', format: 'jpeg', quality: 70 },
      ],
      conversions: [{ format: 'webp', quality: 75, suffix: 'web' }],
      optimization: { quality: 80, progressive: true, normalize: true },
      watermark: { text: 'demo', opacity: 0.2 },
      facialRecognitionHook,
    });

    const result = await pipeline.processImage(sourcePath, 'image/png', 'sample');

    expect(result.optimizedPath).toBe(sourcePath);
    expect(result.thumbnails).toHaveLength(1);
    expect(result.conversions[0].format).toBe('webp');
    await expect(fileExists(result.thumbnails[0].path)).resolves.toBe(true);
    await expect(fileExists(result.conversions[0].path)).resolves.toBe(true);
    expect(result.facialRecognition?.faces).toHaveLength(1);
    expect(facialRecognitionHook).toHaveBeenCalled();
  });
});

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    return false;
  }
}
