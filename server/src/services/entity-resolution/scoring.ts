import { EntityInput, ResolutionFeature, ERConfig } from './models.js';

// Simple Levenshtein distance implementation for string similarity
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  if (longer.length === 0) return 1.0;
  const distance = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
  return (longer.length - distance) / longer.length;
}

export class ScoringEngine {
  private config: ERConfig;

  constructor(config?: Partial<ERConfig>) {
    this.config = {
      thresholds: { merge: 0.95, link: 0.8, review: 0.6 },
      weights: {
        exactId: 1.0,
        email: 0.9,
        phone: 0.8,
        name: 0.6,
        ...config?.weights
      },
      enabledFeatures: ['exactId', 'email', 'phone', 'name', ...(config?.enabledFeatures || [])],
      ...config
    };
  }

  calculateScore(source: EntityInput, target: EntityInput): { score: number; features: ResolutionFeature[]; reasons: string[] } {
    const features: ResolutionFeature[] = [];
    let totalScore = 0;
    let totalWeight = 0;
    const reasons: string[] = [];

    // 1. Exact ID Match (e.g. SSN, Driver License) - Only if property exists in both
    if (this.config.enabledFeatures.includes('exactId')) {
      const sourceIds = this.extractIdentifiers(source);
      const targetIds = this.extractIdentifiers(target);
      const match = sourceIds.some(id => targetIds.includes(id));

      const score = match ? 1.0 : 0.0;
      const weight = this.config.weights.exactId;

      if (sourceIds.length > 0 && targetIds.length > 0) {
        features.push({ name: 'exactId', score, weight });
        totalScore += score * weight;
        totalWeight += weight;
        if (match) reasons.push('Exact identifier match');
      }
    }

    // 2. Email Match
    if (this.config.enabledFeatures.includes('email')) {
      const sourceEmails = this.extractEmails(source);
      const targetEmails = this.extractEmails(target);

      // Check for any intersection
      const match = sourceEmails.some(e => targetEmails.includes(e));
      const score = match ? 1.0 : 0.0;
      const weight = this.config.weights.email;

      if (sourceEmails.length > 0 && targetEmails.length > 0) {
        features.push({ name: 'email', score, weight });
        totalScore += score * weight;
        totalWeight += weight;
        if (match) reasons.push('Email address match');
      }
    }

    // 3. Name Similarity
    if (this.config.enabledFeatures.includes('name')) {
      const sourceName = source.properties.name || '';
      const targetName = target.properties.name || '';

      if (sourceName && targetName) {
        const score = stringSimilarity(sourceName, targetName);
        const weight = this.config.weights.name;

        features.push({ name: 'name', score, weight });
        totalScore += score * weight;
        totalWeight += weight;
        if (score > 0.8) reasons.push(`High name similarity (${(score*100).toFixed(0)}%)`);
      }
    }

    // 4. Phone Match
    if (this.config.enabledFeatures.includes('phone')) {
        const sourcePhones = this.extractPhones(source);
        const targetPhones = this.extractPhones(target);

        const match = sourcePhones.some(p => targetPhones.includes(p));
        const score = match ? 1.0 : 0.0;
        const weight = this.config.weights.phone;

        if (sourcePhones.length > 0 && targetPhones.length > 0) {
          features.push({ name: 'phone', score, weight });
          totalScore += score * weight;
          totalWeight += weight;
          if (match) reasons.push('Phone number match');
        }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: finalScore,
      features,
      reasons
    };
  }

  private extractIdentifiers(entity: EntityInput): string[] {
    // Looks for properties like 'ssn', 'passport', 'driverLicense', 'taxId'
    const ids: string[] = [];
    const keys = ['ssn', 'passport', 'driverLicense', 'taxId', 'externalId'];
    for (const key of keys) {
      if (entity.properties[key]) ids.push(String(entity.properties[key]));
    }
    return ids;
  }

  private extractEmails(entity: EntityInput): string[] {
    if (entity.properties.email) return [entity.properties.email.toLowerCase()];
    if (Array.isArray(entity.properties.emails)) return entity.properties.emails.map((e: string) => e.toLowerCase());
    return [];
  }

  private extractPhones(entity: EntityInput): string[] {
    if (entity.properties.phone) return [entity.properties.phone.replace(/\D/g, '')]; // Normalize to digits
    if (Array.isArray(entity.properties.phones)) return entity.properties.phones.map((p: string) => p.replace(/\D/g, ''));
    return [];
  }
}
