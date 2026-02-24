export interface Incident {
  id: string;
  type: 'cyber' | 'physical' | 'political';
  timestamp: number;
  description: string;
  severity: string;
}

export interface Narrative {
  id: string;
  startTime: number;
  keywords: string[];
  summary: string;
}

export interface Linkage {
  incidentId: string;
  narrativeId: string;
  score: number;
  reason: string;
}

export class CrossDomainLinker {
  private timeWindowMs: number;

  constructor(timeWindowMs: number = 48 * 60 * 60 * 1000) { // 48 hours
    this.timeWindowMs = timeWindowMs;
  }

  link(incidents: Incident[], narratives: Narrative[]): Linkage[] {
    const linkages: Linkage[] = [];

    for (const incident of incidents) {
      for (const narrative of narratives) {
        const timeDiff = Math.abs(incident.timestamp - narrative.startTime);

        if (timeDiff <= this.timeWindowMs) {
          const contentMatch = this.calculateContentMatch(incident, narrative);

          if (contentMatch > 0) {
            // Decay score based on time difference (linear decay)
            const timeScore = 1 - (timeDiff / this.timeWindowMs);
            const totalScore = (contentMatch * 0.7) + (timeScore * 0.3);

            if (totalScore > 0.3) {
              linkages.push({
                incidentId: incident.id,
                narrativeId: narrative.id,
                score: totalScore,
                reason: `Match: ${(contentMatch * 100).toFixed(0)}% content overlap within ${(timeDiff / 3600000).toFixed(1)} hours`
              });
            }
          }
        }
      }
    }
    return linkages;
  }

  private stem(word: string): string {
    return word.replace(/(ing|ed|s)$/, '');
  }

  private calculateContentMatch(incident: Incident, narrative: Narrative): number {
    const incidentWords = incident.description.toLowerCase().split(/\W+/).filter(w => w.length > 3).map(this.stem);
    const narrativeWords = narrative.summary.toLowerCase().split(/\W+/).concat(narrative.keywords).map(w => w.toLowerCase()).map(this.stem);

    let matches = 0;
    for (const word of incidentWords) {
      if (narrativeWords.includes(word)) {
        matches++;
      }
    }

    // Normalized by relevant word count
    return Math.min(matches / Math.max(incidentWords.length, 5), 1.0);
  }
}
