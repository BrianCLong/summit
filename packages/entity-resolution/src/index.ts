export interface Entity {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export interface MatchScorecard {
  entityA: string;
  entityB: string;
  overallScore: number;
  featureScores: Record<string, number>;
  decision: 'MATCH' | 'NO_MATCH' | 'MANUAL_REVIEW';
  explanation: string[];
  threshold: number;
}

export class EntityResolver {
  private threshold = 0.7;

  constructor(threshold: number = 0.7) {
    this.threshold = threshold;
  }

  match(entityA: Entity, entityB: Entity): MatchScorecard {
    const featureScores: Record<string, number> = {};
    const explanation: string[] = [];

    // Name similarity (exact, Levenshtein, soundex)
    if (entityA.name && entityB.name) {
      const nameScore = this.stringSimilarity(entityA.name, entityB.name);
      featureScores.name = nameScore;
      explanation.push(`Name similarity: ${(nameScore * 100).toFixed(1)}%`);
    }

    // Email exact match
    if (entityA.email && entityB.email) {
      const emailScore = entityA.email.toLowerCase() === entityB.email.toLowerCase() ? 1.0 : 0.0;
      featureScores.email = emailScore;
      explanation.push(`Email match: ${emailScore === 1 ? 'exact' : 'no match'}`);
    }

    // Phone similarity (normalize and compare)
    if (entityA.phone && entityB.phone) {
      const phoneA = this.normalizePhone(entityA.phone);
      const phoneB = this.normalizePhone(entityB.phone);
      const phoneScore = phoneA === phoneB ? 1.0 : 0.0;
      featureScores.phone = phoneScore;
      explanation.push(`Phone match: ${phoneScore === 1 ? 'exact' : 'no match'}`);
    }

    // Weighted average
    const weights = { name: 0.4, email: 0.4, phone: 0.2 };
    let overallScore = 0;
    let totalWeight = 0;

    Object.keys(featureScores).forEach(key => {
      const weight = weights[key as keyof typeof weights] || 0.33;
      overallScore += featureScores[key] * weight;
      totalWeight += weight;
    });

    overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;

    let decision: 'MATCH' | 'NO_MATCH' | 'MANUAL_REVIEW' = 'NO_MATCH';
    if (overallScore >= this.threshold) {
      decision = 'MATCH';
    } else if (overallScore >= this.threshold * 0.7) {
      decision = 'MANUAL_REVIEW';
    }

    return {
      entityA: entityA.id,
      entityB: entityB.id,
      overallScore,
      featureScores,
      decision,
      explanation,
      threshold: this.threshold,
    };
  }

  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  evaluateDataset(entities: Entity[]): { tp: number; fp: number; tn: number; fn: number } {
    // Stub for ROC/PR curve evaluation
    return { tp: 0, fp: 0, tn: 0, fn: 0 };
  }
}

export function createResolver(threshold?: number) {
  return new EntityResolver(threshold);
}
