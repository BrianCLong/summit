
import { createHash } from 'crypto';

export class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  constructor(leaves: string[]) {
    this.leaves = leaves.map(l => this.hash(l));
    this.layers = [this.leaves];
    this.buildTree();
  }

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private buildTree() {
    let currentLayer = this.leaves;
    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left; // Duplicate last if odd
        nextLayer.push(this.hash(left + right));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  getRoot(): string {
    if (this.layers.length === 0 || this.layers[this.layers.length - 1].length === 0) {
      return '';
    }
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): string[] {
    const proof: string[] = [];
    let layerIndex = 0;

    while (layerIndex < this.layers.length - 1) {
      const layer = this.layers[layerIndex];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      } else {
         // If node is last and odd, it was paired with itself
        proof.push(layer[index]);
      }

      index = Math.floor(index / 2);
      layerIndex++;
    }

    return proof;
  }

  static verify(proof: string[], root: string, leaf: string, index: number): boolean {
    let hash = createHash('sha256').update(leaf).digest('hex');

    for (const sibling of proof) {
      const isRightNode = index % 2 === 1;
      if (isRightNode) {
        hash = createHash('sha256').update(sibling + hash).digest('hex');
      } else {
        hash = createHash('sha256').update(hash + sibling).digest('hex');
      }
      index = Math.floor(index / 2);
    }

    return hash === root;
  }
}
