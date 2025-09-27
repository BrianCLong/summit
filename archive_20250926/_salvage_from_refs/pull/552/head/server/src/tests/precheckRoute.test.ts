import fs from 'fs';
import path from 'path';
import { precheckAndRoute } from '../services/MediaPrecheckService';

describe('precheckAndRoute', () => {
  const modelPath = path.join(__dirname, '../../models/mesonet-v1.onnx');
  beforeAll(() => fs.writeFileSync(modelPath, ''));
  afterAll(() => fs.unlinkSync(modelPath));

  it('returns quarantine flag and detector info', async () => {
    const res = await precheckAndRoute(__filename, 'video/mp4');
    expect(typeof res.quarantined).toBe('boolean');
    expect(Array.isArray(res.flags)).toBe(true);
    if (res.detector.band === 'low') {
      expect(res.quarantined).toBe(false);
    } else {
      expect(res.quarantined).toBe(true);
    }
  });
});
