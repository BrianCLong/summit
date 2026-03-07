import { EligibilityScorer } from './eligibility.js';
import { SelectionScorer } from './selection.js';
import { AttributionScorer } from './attribution.js';
import { UpstreamPriorScorer } from './upstream_prior.js';
import { ExtractedEntity } from '../parsers/answer_parser.js';
import { ExtractedCitation } from '../parsers/citation_parser.js';

export interface GeoScore {
  eligibility: number;
  selection: number;
  attribution: number;
  upstreamPrior: number;
  correctedLift: number;
}

export class GeoScoringEngine {
    private eligibility = new EligibilityScorer();
    private selection = new SelectionScorer();
    private attribution = new AttributionScorer();
    private upstream = new UpstreamPriorScorer();

    public calculateScore(brandName: string, domain: string, promptClass: string, entity?: ExtractedEntity, citations: ExtractedCitation[] = []): GeoScore {
        const eligibilityScore = this.eligibility.score(brandName, promptClass);
        const selectionScore = this.selection.score(entity);
        const attributionScore = this.attribution.score(domain, citations);
        const upstreamPrior = this.upstream.getPrior(domain);

        // Corrected Lift = (Selection * 0.7 + Attribution * 0.3) - Upstream Prior
        // Represents the AI engine's unique ranking preference vs search
        const rawVisibility = (selectionScore * 0.7) + (attributionScore * 0.3);
        const correctedLift = Math.max(-1.0, Math.min(1.0, rawVisibility - upstreamPrior));

        return {
            eligibility: eligibilityScore,
            selection: selectionScore,
            attribution: attributionScore,
            upstreamPrior,
            correctedLift
        };
    }
}
