import axios from 'axios';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * GDELT GKG Fetcher - Deterministic file index and checksum verification.
 */
export class GDELTIndexFetcher extends EventEmitter {
  private readonly masterListUrl = 'http://data.gdeltproject.org/gdeltv2/masterfilelist.txt';

  async fetchLatestIndex(): Promise<GDELTFileEntry[]> {
    const response = await axios.get(this.masterListUrl);
    const lines = response.data.split('\n');

    return lines
      .filter((line: string) => line.includes('gkg.csv.zip'))
      .map((line: string) => {
        const [size, sha1, url] = line.split(' ');
        return {
          size: parseInt(size, 10),
          sha1,
          url,
          timestamp: this.extractTimestamp(url)
        };
      })
      .sort((a: GDELTFileEntry, b: GDELTFileEntry) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private extractTimestamp(url: string): Date {
    const match = url.match(/(\d{14})/);
    if (!match) return new Date(0);
    const ts = match[1];
    return new Date(
      parseInt(ts.substring(0, 4), 10),
      parseInt(ts.substring(4, 6), 10) - 1,
      parseInt(ts.substring(6, 8), 10),
      parseInt(ts.substring(8, 10), 10),
      parseInt(ts.substring(10, 12), 10),
      parseInt(ts.substring(12, 14), 10)
    );
  }

  async verifyChecksum(data: Buffer, expectedSha1: string): Promise<boolean> {
    const actualSha1 = crypto.createHash('sha1').update(data).digest('hex');
    return actualSha1.toLowerCase() === expectedSha1.toLowerCase();
  }
}

export interface GDELTFileEntry {
  size: number;
  sha1: string;
  url: string;
  timestamp: Date;
}
