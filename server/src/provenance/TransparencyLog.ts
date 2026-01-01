import crypto from 'node:crypto';

export interface MerkleProof {
  root: string;
  leaf: string;
  siblings: string[];
}

export class TransparencyLogService {
  private static instance: TransparencyLogService;
  private currentRoot: string = '';
  private leaves: string[] = [];

  private constructor() {}

  public static getInstance(): TransparencyLogService {
    if (!TransparencyLogService.instance) {
      TransparencyLogService.instance = new TransparencyLogService();
    }
    return TransparencyLogService.instance;
  }

  public addEntry(data: string): string {
    const leaf = crypto.createHash('sha256').update(data).digest('hex');
    this.leaves.push(leaf);
    this.recalculateRoot();
    return leaf;
  }

  public getRoot(): string {
    return this.currentRoot;
  }

  private recalculateRoot() {
    if (this.leaves.length === 0) {
      this.currentRoot = '';
      return;
    }
    let level = [...this.leaves];
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = (i + 1 < level.length) ? level[i + 1] : left;
        const hash = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(hash);
      }
      level = nextLevel;
    }
    this.currentRoot = level[0];
  }
}
