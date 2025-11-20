import { Feature } from '../index.js';

export class FeatureSelector {
  selectByImportance(features: Feature[], topK: number, threshold?: number): Feature[] {
    const withImportance = features.filter(f => f.importance !== undefined);
    const sorted = withImportance.sort((a, b) => (b.importance || 0) - (a.importance || 0));

    if (threshold) {
      return sorted.filter(f => (f.importance || 0) >= threshold).slice(0, topK);
    }

    return sorted.slice(0, topK);
  }

  selectByCorrelation(features: Feature[], target: number[], threshold: number = 0.5): Feature[] {
    return features.filter(f => {
      if (!f.values) return false;
      const correlation = this.calculateCorrelation(f.values, target);
      return Math.abs(correlation) >= threshold;
    });
  }

  private calculateCorrelation(x: any[], y: number[]): number {
    const n = x.length;
    const xNum = x.map(v => typeof v === 'number' ? v : 0);
    const meanX = xNum.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, denomX = 0, denomY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xNum[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    return denomX === 0 || denomY === 0 ? 0 : num / Math.sqrt(denomX * denomY);
  }
}
