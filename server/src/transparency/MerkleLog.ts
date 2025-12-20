import crypto from 'crypto';

export class MerkleLog {
  private entries: string[] = [];
  append(entry: string) {
    this.entries.push(entry);
  }
  size() {
    return this.entries.length;
  }
  root() {
    return crypto
      .createHash('sha256')
      .update(this.entries.join(''))
      .digest('hex');
  }
}
