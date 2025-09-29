import { promises as fs } from 'fs';

export type PrecheckResult = {
  allowed: boolean;
  reason?: string;
  flags: string[];
  features?: { pHash?: string; mfcc?: number[] };
};

export class MediaPrecheckService {
  private allowedTypes = ['image/png', 'image/jpeg', 'video/mp4', 'audio/mpeg'];

  async runPrecheck(filePath: string, mime: string): Promise<PrecheckResult> {
    const flags: string[] = [];
    if (!this.allowedTypes.includes(mime)) {
      return { allowed: false, reason: 'mime_not_allowed', flags: ['mime'] };
    }
    // Placeholder for size and entropy checks
    try {
      await fs.stat(filePath);
    } catch {
      return { allowed: false, reason: 'missing_file', flags: ['fs'] };
    }
    const features = {
      pHash: await this.phashStub(filePath),
      mfcc: await this.mfccStub(filePath)
    };
    if (!features.pHash && !features.mfcc) flags.push('features_missing');
    return { allowed: flags.length === 0, flags, features };
  }

  private async phashStub(_p: string): Promise<string> {
    // TODO: replace with real pHash in Sprint 9
    return 'phash:stub';
  }

  private async mfccStub(_p: string): Promise<number[]> {
    return [0.1, 0.2, 0.3];
  }
}
