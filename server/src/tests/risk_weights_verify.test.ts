import fs from 'fs';
import path from 'path';
import { verifyWeights } from '../risk/WeightsVerifier';
import { describe, it, expect } from '@jest/globals';

describe('WeightsVerifier', () => {
  it('verifies checksum', () => {
    const models = path.join(__dirname, '..', '..', 'models');
    const weightsPath = path.join(models, 'weights.json');
    const checksums = JSON.parse(
      fs.readFileSync(path.join(models, 'checksums.json'), 'utf8'),
    );
    const data = verifyWeights(weightsPath, checksums['weights.json']);
    expect(data).toHaveProperty('bias');
  });
});
