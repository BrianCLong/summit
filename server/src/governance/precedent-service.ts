import { ombudsService, OmbudsDecision, OmbudsTrigger, OmbudsRuling } from './ombuds-service.js';

export interface PrecedentSearchQuery {
  trigger?: OmbudsTrigger;
  ruling?: OmbudsRuling;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  textQuery?: string; // Search in rationale
}

export interface SimilarCaseRequest {
  trigger: OmbudsTrigger;
  policyRule?: string; // Matches a tag
  sensitivity?: string; // Matches a tag
  limit?: number;
}

export interface SimilarCaseResult {
  decision: OmbudsDecision;
  score: number;
  matchReasons: string[];
}

export class PrecedentService {
  /**
   * Search precedent catalog (past decisions)
   */
  async search(query: PrecedentSearchQuery): Promise<OmbudsDecision[]> {
    const all = await ombudsService.getAllDecisions();
    return all.filter(d => {
      if (query.trigger && d.trigger !== query.trigger) {return false;}
      if (query.ruling && d.ruling !== query.ruling) {return false;}
      if (query.startDate && d.createdAt < query.startDate) {return false;}
      if (query.endDate && d.createdAt > query.endDate) {return false;}
      if (query.tags && query.tags.length > 0) {
        // Match ALL tags for filtering
        const hasAllTags = query.tags.every(t => d.tags.includes(t));
        if (!hasAllTags) {return false;}
      }
      if (query.textQuery) {
        const text = (`${d.rationale.summary  } ${  d.rationale.text}`).toLowerCase();
        if (!text.includes(query.textQuery.toLowerCase())) {return false;}
      }
      return true;
    });
  }

  /**
   * Find similar cases based on heuristic scoring
   */
  async findSimilar(request: SimilarCaseRequest): Promise<SimilarCaseResult[]> {
    const all = await ombudsService.getAllDecisions();
    const limit = request.limit || 5;

    const scored = all.map(d => {
      let score = 0;
      const matchReasons: string[] = [];

      if (d.trigger === request.trigger) {
        score += 10;
        matchReasons.push('Same trigger type');
      }

      if (request.policyRule && d.tags.includes(request.policyRule)) {
        score += 5;
        matchReasons.push(`Matches policy rule: ${request.policyRule}`);
      }

      if (request.sensitivity && d.tags.includes(request.sensitivity)) {
        score += 5;
        matchReasons.push(`Matches data sensitivity: ${request.sensitivity}`);
      }

      return { decision: d, score, matchReasons };
    });

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);

    // Return top N, only with some relevance
    return scored.filter(s => s.score > 0).slice(0, limit);
  }
}

export const precedentService = new PrecedentService();
