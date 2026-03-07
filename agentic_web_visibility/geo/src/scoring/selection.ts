import { ExtractedEntity } from '../parsers/answer_parser.js';

export class SelectionScorer {
    public score(entity: ExtractedEntity | undefined): number {
        if (!entity) return 0.0;

        let score = 0.35; // Base mention score

        if (entity.recommended) score += 0.2;

        if (entity.rank) {
            // Rank 1: +0.45, Rank 2: +0.3, Rank 3: +0.15
            if (entity.rank === 1) score += 0.45;
            else if (entity.rank === 2) score += 0.3;
            else if (entity.rank === 3) score += 0.15;
        }

        return Math.min(score, 1.0);
    }
}
