import { isEnrichmentEnabled, isGAIEnabled } from './flags';
import { OsintAsset } from '../../connectors/osint-catalog/types';
import { calculateProvenanceScore } from './provenanceScore';

export async function enrichOsintAsset(asset: OsintAsset): Promise<OsintAsset> {
  if (!isEnrichmentEnabled()) {
    console.log('Skipping enrichment (feature flag disabled)');
    return asset;
  }

  const score = calculateProvenanceScore(asset.provenance);

  // Tag with score
  const enriched = { ...asset };
  enriched.tags = enriched.tags || [];
  enriched.tags.push(`provenance-score:${score.score.toFixed(0)}`);
  enriched.tags.push(`provenance-confidence:${score.confidence}`);

  // GAI Enhancement (only if enabled AND score is high enough)
  if (isGAIEnabled()) {
    if (score.score >= 60) {
        // Placeholder for GAI logic
        enriched.description = (enriched.description || '') + ' [AI Enhanced Summary]';
    } else {
        console.log('Skipping GAI (provenance too low)');
    }
  }

  return enriched;
}
