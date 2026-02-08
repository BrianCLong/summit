import { OsintProvenance } from '../../connectors/osint-catalog/types';

export interface ProvenanceScore {
  score: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export function calculateProvenanceScore(provenance: OsintProvenance): ProvenanceScore {
  let score = 0;
  let reasons: string[] = [];

  // Base score by method
  switch (provenance.method) {
    case 'manual':
      score += 80;
      reasons.push('Manual verification');
      break;
    case 'api':
      score += 70;
      reasons.push('Direct API access');
      break;
    case 'partner-export':
      score += 90;
      reasons.push('Partner export (trusted)');
      break;
    case 'scrape':
      score += 40;
      reasons.push('Web scrape (unverified)');
      break;
    default:
      score += 10;
      reasons.push('Unknown method');
  }

  // Adjust by confidence if provided
  if (provenance.confidence_score !== undefined) {
    const adjustment = (provenance.confidence_score - 0.5) * 20; // +/- 10
    score += adjustment;
    reasons.push(`Confidence adjustment: ${adjustment.toFixed(1)}`);
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: reasons.join('; '),
    confidence: score > 70 ? 'high' : score > 40 ? 'medium' : 'low'
  };
}
