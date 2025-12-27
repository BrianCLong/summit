import { watermarkFixtures } from './__fixtures__/watermarks.js';

export interface WatermarkExtractor {
  extract(artifactId: string): Promise<string>;
}

export class MockWatermarkExtractor implements WatermarkExtractor {
  async extract(artifactId: string): Promise<string> {
    const watermark = watermarkFixtures[artifactId];
    if (!watermark) {
      throw new Error(`No watermark fixture for artifact '${artifactId}'`);
    }

    return watermark;
  }
}
