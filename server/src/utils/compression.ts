
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

/**
 * Compression utility for handling large query results and cache data.
 * Supports GZIP and Deflate algorithms.
 */
export class CompressionUtils {
  private static readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  /**
   * Compresses input data if it exceeds the compression threshold (1KB).
   *
   * The output is a Buffer prefixed with a 1-byte marker indicating the compression state:
   * - 0: Uncompressed
   * - 1: GZIP compressed
   *
   * @param data - The data to compress. Can be a string, Buffer, or object (which will be JSON stringified).
   * @returns A Promise resolving to a Buffer containing the marker and the (potentially) compressed data.
   */
  static async compress(data: string | Buffer | object): Promise<Buffer> {
    let buffer: Buffer;

    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data);
    } else {
      buffer = Buffer.from(JSON.stringify(data));
    }

    if (buffer.length < this.COMPRESSION_THRESHOLD) {
      // Return uncompressed with 0 marker
      const result = Buffer.alloc(buffer.length + 1);
      result.writeUInt8(0, 0);
      buffer.copy(result, 1);
      return result;
    }

    // Compress with GZIP
    const compressed = await gzip(buffer);
    const result = Buffer.alloc(compressed.length + 1);
    result.writeUInt8(1, 0); // 1 = GZIP
    compressed.copy(result, 1);

    return result;
  }

  /**
   * Decompresses data based on the prefix marker found in the Buffer.
   *
   * @param data - The compressed Buffer (including the 1-byte marker).
   * @returns A Promise resolving to the original uncompressed Buffer.
   * @throws Error if the compression marker is unknown.
   */
  static async decompress(data: Buffer): Promise<Buffer> {
    if (data.length === 0) return Buffer.alloc(0);

    const marker = data.readUInt8(0);
    const payload = data.subarray(1);

    if (marker === 0) {
      return payload;
    } else if (marker === 1) {
      return await gunzip(payload);
    } else {
      throw new Error(`Unknown compression marker: ${marker}`);
    }
  }

  /**
   * Compresses an object and encodes the result as a Base64 string.
   *
   * @param data - The object to compress.
   * @returns A Promise resolving to a Base64 encoded string of the compressed data.
   */
  static async compressToString(data: object): Promise<string> {
    const buffer = await this.compress(data);
    return buffer.toString('base64');
  }

  /**
   * Decodes a Base64 string, decompresses it, and parses the JSON result.
   *
   * @typeParam T - The expected type of the parsed object.
   * @param data - The Base64 encoded compressed string.
   * @returns A Promise resolving to the parsed object.
   */
  static async decompressFromString<T>(data: string): Promise<T> {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await this.decompress(buffer);
    return JSON.parse(decompressed.toString()) as T;
  }
}
