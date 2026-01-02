import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

export interface MemeTrackingResult {
  memeId: string;
  hash: string;
  similarMemes: string[]; // IDs
  propagationRate: number;
  origin: string;
}

export class MemeTrackingService {
  private static instance: MemeTrackingService;

  public static getInstance(): MemeTrackingService {
    if (!MemeTrackingService.instance) {
      MemeTrackingService.instance = new MemeTrackingService();
    }
    return MemeTrackingService.instance;
  }

  // Placeholder for perceptual hash storage
  // In production, this would be a vector DB or similar
  private hashes: Map<string, string> = new Map();

  /**
   * Tracks a meme image.
   * @param input Perceptual Hash (hex string) OR Base64 content of the image.
   *              If passing a URL, it must be resolved to content or hash by the ingestion layer first.
   *              Passing a raw URL string is NOT supported for hashing.
   * @param sourceId ID of the entity posting it
   */
  async trackMeme(input: string, sourceId: string): Promise<MemeTrackingResult> {
    try {
      // 1. Generate Perceptual Hash
      // If the input is already a hash (short hex string), use it.
      // If it looks like base64 (long string), we simulate hashing on content.
      // If it looks like a URL (starts with http), we reject or use a dummy hash (safe failure).

      let hash = "";
      if (input.length < 64 && /^[0-9a-fA-F]+$/.test(input)) {
          // Input is likely already a hash
          hash = input;
      } else if (input.startsWith('http')) {
          logger.warn('MemeTrackingService received a URL. Hashing URLs is invalid for content tracking. Generating random hash for safety.');
          hash = randomUUID().replace(/-/g, '').substring(0, 16);
      } else {
          // Assume base64 content
          hash = this.simulatePerceptualHash(input);
      }

      // 2. Find Similar Hashes (Hamming Distance)
      const similarMemes = this.findSimilarHashes(hash);

      // 3. Store new hash
      const memeId = randomUUID();
      this.hashes.set(memeId, hash);

      return {
        memeId,
        hash,
        similarMemes,
        propagationRate: similarMemes.length * 1.5, // Mock rate
        origin: sourceId
      };
    } catch (error: any) {
      logger.error('Error tracking meme', error);
      throw error;
    }
  }

  private simulatePerceptualHash(input: string): string {
    // SIMULATION NOTICE:
    // This is a placeholder for a real Perceptual Hash (pHash/dHash).
    // In a production environment, this would use 'sharp' to resize/grayscale the image
    // and then calculate a DCT (Discrete Cosine Transform) hash.
    //
    // Since we cannot run binary image processing libraries in this restricted sandbox,
    // we perform a "Mock Hash" on the base64 string itself. This is NOT suitable for
    // real image similarity (resize/crop resilience) but serves to demonstrate the
    // architectural data flow (Ingest -> Hash -> Compare -> Store).

    let hash = 0;
    // Limit to first 1000 chars for performance in simulation
    const sample = input.substring(0, 1000);
    for (let i = 0; i < sample.length; i++) {
        hash = ((hash << 5) - hash) + sample.charCodeAt(i);
        hash |= 0;
    }
    // Return a 64-bit hex string-like
    return Math.abs(hash).toString(16).padEnd(16, '0');
  }

  private findSimilarHashes(targetHash: string): string[] {
    const matches: string[] = [];
    // O(N) scan for MVP
    for (const [id, hash] of this.hashes.entries()) {
        if (this.hammingDistance(targetHash, hash) < 5) {
            matches.push(id);
        }
    }
    return matches;
  }

  private hammingDistance(h1: string, h2: string): number {
    let dist = 0;
    for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
        if (h1[i] !== h2[i]) dist++;
    }
    return dist;
  }
}
