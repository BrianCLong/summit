
import { EvidenceItem, EvidenceScore } from './types';

export class ScoringEngine {
  static calculateScore(item: EvidenceItem): EvidenceScore {
    let score = 0;
    const breakdown = {
      sourceReliability: 0,
      provenanceCompleteness: 0,
      recency: 0,
      corroboration: 0
    };
    const reasons: string[] = [];
    const missingFields: string[] = [];

    // 1. Source Reliability (Max 30)
    if (item.sourceType === 'official') {
      breakdown.sourceReliability = 30;
      reasons.push('Source is official/trusted.');
    } else if (item.sourceType === 'osint') {
      breakdown.sourceReliability = 15;
      reasons.push('Source is open-source (medium reliability).');
    } else {
      reasons.push('Source is unverified or rumor.');
    }

    // 2. Provenance Completeness (Max 30)
    if (item.hasDigitalSignature) {
      breakdown.provenanceCompleteness = 30;
      reasons.push('Digital signature verified.');
    } else {
      missingFields.push('digitalSignature');
      reasons.push('Missing digital signature.');
    }

    // 3. Recency (Max 20)
    // Example: decay over time. 1 year = 0 score.
    const now = new Date().getTime();
    const ageMs = now - item.timestamp.getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    if (ageMs < 0) {
        // Future timestamp?
        reasons.push('Timestamp is in the future.');
    } else if (ageMs < oneYearMs) {
        const freshness = 1 - (ageMs / oneYearMs);
        breakdown.recency = Math.floor(freshness * 20);
        reasons.push(`Evidence is ${(freshness * 100).toFixed(0)}% fresh.`);
    } else {
        reasons.push('Evidence is older than 1 year.');
    }

    // 4. Corroboration (Max 20)
    // 5+ items = max
    const count = item.corroborationCount || 0;
    breakdown.corroboration = Math.min(20, count * 4);
    if (count > 0) reasons.push(`Corroborated by ${count} other sources.`);
    else reasons.push('No corroboration found.');

    score = breakdown.sourceReliability + breakdown.provenanceCompleteness + breakdown.recency + breakdown.corroboration;

    return {
      totalScore: score,
      breakdown,
      reasons,
      missingFields
    };
  }
}
