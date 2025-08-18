import fs from 'fs';
import path from 'path';
import { OnnxDeepfakeDetector } from '../services/DeepfakeDetector';

describe('OnnxDeepfakeDetector', () => {
  const modelPath = path.join(__dirname, '../../models/mesonet-v1.onnx');
  beforeAll(() => {
    fs.writeFileSync(modelPath, '');
  });
  afterAll(() => {
    fs.unlinkSync(modelPath);
  });

  it('loads model verifying checksum and returns band', async () => {
    const det = new OnnxDeepfakeDetector(modelPath);
    await det.load();
    const res = await det.infer({ filePath: __filename, mime: 'video/mp4' });
    expect(res.model).toBe('onnx-cnn-v1');
    expect(['low', 'medium', 'high']).toContain(res.band);
  });
});
