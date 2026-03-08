import { ExtractedCitation } from '../parsers/citation_parser.js';

export class AttributionScorer {
    public score(domain: string, citations: ExtractedCitation[]): number {
        const citation = citations.find(c => c.domain.includes(domain));
        if (!citation) return 0.0;

        // Simple citation density scoring for v1
        return Math.min(0.5 + (citation.mentions * 0.1), 1.0);
    }
}
