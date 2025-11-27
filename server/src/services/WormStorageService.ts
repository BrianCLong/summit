import { promises as fs } from 'fs';
import path from 'path';

const WORM_STORAGE_PATH = path.resolve(process.cwd(), 'worm_storage');

/**
 * @class WormStorageService
 * @description Provides a simple interface for storing files in a WORM-like storage.
 *
 * This service simulates a Write-Once, Read-Many storage by saving files
 * to a local directory and making them read-only. In a production environment,
 * this would be replaced with a true WORM-compliant storage solution like AWS S3
 * with Object Lock.
 */
export class WormStorageService {
  constructor() {
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await fs.mkdir(WORM_STORAGE_PATH, { recursive: true });
    } catch (error) {
      console.error('Failed to create WORM storage directory:', error);
    }
  }

  /**
   * Stores a file in the WORM storage.
   * @param filename The name of the file to store.
   * @param data The file content as a Buffer.
   * @returns The path to the stored file.
   */
  public async store(filename: string, data: Buffer): Promise<string> {
    const filePath = path.join(WORM_STORAGE_PATH, filename);
    await fs.writeFile(filePath, data);
    // Make the file read-only to simulate WORM
    await fs.chmod(filePath, 0o444);
    return filePath;
  }
}
