import { Feature } from '../index';

export class ImportanceSelector {
  rankByMutualInformation(features: Feature[], target: any[]): Feature[] {
    return features.map(f => ({
      ...f,
      importance: this.mutualInformation(f.values || [], target),
    })).sort((a, b) => (b.importance || 0) - (a.importance || 0));
  }

  private mutualInformation(x: any[], y: any[]): number {
    // Simplified MI calculation
    const uniqueX = [...new Set(x)];
    const uniqueY = [...new Set(y)];
    let mi = 0;

    for (const vx of uniqueX) {
      for (const vy of uniqueY) {
        const pxy = x.filter((v, i) => v === vx && y[i] === vy).length / x.length;
        const px = x.filter(v => v === vx).length / x.length;
        const py = y.filter(v => v === vy).length / y.length;

        if (pxy > 0) {
          mi += pxy * Math.log2(pxy / (px * py));
        }
      }
    }

    return mi;
  }
}
