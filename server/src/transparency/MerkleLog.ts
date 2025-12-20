import crypto from 'crypto';

/**
 * A simple implementation of a Merkle Log.
 * Allows appending entries and calculating the root hash.
 * Note: This is a basic implementation and does not support full Merkle tree features like proofs.
 */
export class MerkleLog {
  private entries: string[] = [];

  /**
   * Appends an entry to the log.
   * @param entry - The entry to append.
   */
  append(entry: string) {
    this.entries.push(entry);
  }

  /**
   * Returns the number of entries in the log.
   * @returns The log size.
   */
  size() {
    return this.entries.length;
  }

  /**
   * Calculates the root hash of the log.
   * @returns The SHA-256 hash of all concatenated entries.
   */
  root() {
    return crypto
      .createHash('sha256')
      .update(this.entries.join(''))
      .digest('hex');
  }
}
